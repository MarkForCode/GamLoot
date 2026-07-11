use sea_orm::{
    ConnectionTrait, Database, DatabaseConnection, DbBackend, DbErr, Statement, TransactionTrait,
};
use serde_json::Value as JsonValue;
use std::{env, time::Duration};

#[derive(Debug)]
struct NotificationEvent {
    id: i32,
    tenant_id: i32,
    guild_id: Option<i32>,
    event_type: String,
    event_category: String,
    severity: String,
    resource_type: String,
    resource_id: String,
    payload: JsonValue,
}

#[tokio::main]
async fn main() {
    let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| {
        "postgresql://gam_trade:gam_trade_secure_pass@localhost:5432/gam_trade_dev".into()
    });
    let db = Database::connect(database_url)
        .await
        .expect("failed to connect to database");

    println!("notification-worker ready");

    let mut interval = tokio::time::interval(Duration::from_secs(5));
    loop {
        interval.tick().await;
        if let Err(error) = process_pending_events(&db).await {
            eprintln!("notification-worker failed to process events: {error}");
        }
    }
}

async fn process_pending_events(db: &DatabaseConnection) -> Result<(), DbErr> {
    let events = claim_pending_events(db).await?;

    for event in events {
        if let Err(error) = process_event(db, &event).await {
            mark_event_failed(db, event.id, &error.to_string()).await?;
        }
    }

    Ok(())
}

async fn claim_pending_events(db: &DatabaseConnection) -> Result<Vec<NotificationEvent>, DbErr> {
    let tx = db.begin().await?;
    let rows = tx
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            WITH picked AS (
                SELECT id
                FROM notification_events
                WHERE (
                    status = 'pending'
                    OR (status = 'processing' AND updated_at < CURRENT_TIMESTAMP - INTERVAL '5 minutes')
                )
                  AND next_attempt_at <= CURRENT_TIMESTAMP
                ORDER BY id
                LIMIT 25
                FOR UPDATE SKIP LOCKED
            )
            UPDATE notification_events e
            SET status = 'processing',
                attempt_count = attempt_count + 1,
                updated_at = CURRENT_TIMESTAMP
            FROM picked
            WHERE e.id = picked.id
            RETURNING
                e.id,
                e.tenant_id,
                e.guild_id,
                e.event_type,
                e.event_category,
                e.severity,
                e.resource_type,
                e.resource_id,
                e.payload::text AS payload
            "#,
            vec![],
        ))
        .await?;
    tx.commit().await?;

    rows.into_iter()
        .map(|row| {
            let payload_text: String = row.try_get("", "payload")?;
            let payload = serde_json::from_str(&payload_text).unwrap_or(JsonValue::Null);
            Ok(NotificationEvent {
                id: row.try_get("", "id")?,
                tenant_id: row.try_get("", "tenant_id")?,
                guild_id: row.try_get("", "guild_id")?,
                event_type: row.try_get("", "event_type")?,
                event_category: row.try_get("", "event_category")?,
                severity: row.try_get("", "severity")?,
                resource_type: row.try_get("", "resource_type")?,
                resource_id: row.try_get("", "resource_id")?,
                payload,
            })
        })
        .collect()
}

async fn process_event(db: &DatabaseConnection, event: &NotificationEvent) -> Result<(), DbErr> {
    let tx = db.begin().await?;
    let recipients = recipient_user_ids(&event.payload);
    let title = payload_string(&event.payload, "title")
        .unwrap_or_else(|| notification_title(&event.event_type));
    let body = payload_string(&event.payload, "body")
        .unwrap_or_else(|| format!("{} changed.", event.resource_type));
    let link_path = payload_string(&event.payload, "link_path");

    if recipients.is_empty() {
        tx.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO notification_action_runs (
                event_id,
                run_type,
                status,
                response_summary,
                started_at,
                finished_at
            )
            VALUES (
                $1,
                'automatic',
                'skipped',
                '{"reason":"no recipient_user_ids"}'::jsonb,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            "#,
            vec![event.id.into()],
        ))
        .await?;
    }

    for user_id in recipients {
        if in_app_disabled(&tx, event, user_id).await? {
            insert_delivery(
                &tx,
                event,
                user_id,
                "skipped",
                Some("preference_disabled"),
                Some("recipient disabled in-app notifications for this event"),
            )
            .await?;
            continue;
        }

        insert_delivery(&tx, event, user_id, "sent", None, None).await?;
        tx.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO in_app_notifications (
                tenant_id,
                guild_id,
                user_id,
                event_id,
                title,
                body,
                severity,
                resource_type,
                resource_id,
                link_path
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (user_id, event_id) DO NOTHING
            "#,
            vec![
                event.tenant_id.into(),
                event.guild_id.into(),
                user_id.into(),
                event.id.into(),
                title.clone().into(),
                body.clone().into(),
                event.severity.clone().into(),
                event.resource_type.clone().into(),
                event.resource_id.clone().into(),
                link_path.clone().into(),
            ],
        ))
        .await?;
    }

    tx.execute(Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        UPDATE notification_events
        SET status = 'processed',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        "#,
        vec![event.id.into()],
    ))
    .await?;

    tx.commit().await?;
    Ok(())
}

async fn in_app_disabled<C>(db: &C, event: &NotificationEvent, user_id: i32) -> Result<bool, DbErr>
where
    C: ConnectionTrait,
{
    let row = db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT EXISTS (
                SELECT 1
                FROM notification_preferences
                WHERE tenant_id = $1
                  AND (guild_id IS NULL OR guild_id = $2)
                  AND user_id = $3
                  AND channel = 'in_app'
                  AND enabled = false
                  AND (event_category IS NULL OR event_category = $4)
                  AND (event_type IS NULL OR event_type = $5)
            ) AS disabled
            "#,
            vec![
                event.tenant_id.into(),
                event.guild_id.into(),
                user_id.into(),
                event.event_category.clone().into(),
                event.event_type.clone().into(),
            ],
        ))
        .await?
        .ok_or_else(|| DbErr::Custom("notification preference check returned no row".into()))?;

    row.try_get("", "disabled")
}

async fn insert_delivery<C>(
    db: &C,
    event: &NotificationEvent,
    user_id: i32,
    status: &str,
    error_code: Option<&str>,
    error_message: Option<&str>,
) -> Result<(), DbErr>
where
    C: ConnectionTrait,
{
    db.execute(Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        INSERT INTO notification_deliveries (
            event_id,
            tenant_id,
            guild_id,
            channel,
            recipient_user_id,
            idempotency_key,
            status,
            attempt_count,
            last_error_code,
            last_error_message,
            sent_at
        )
        VALUES (
            $1,
            $2,
            $3,
            'in_app',
            $4,
            $5,
            $6,
            1,
            $7,
            $8,
            CASE WHEN $6 = 'sent' THEN CURRENT_TIMESTAMP ELSE NULL END
        )
        ON CONFLICT (idempotency_key)
        DO UPDATE SET
            status = EXCLUDED.status,
            attempt_count = notification_deliveries.attempt_count + 1,
            last_error_code = EXCLUDED.last_error_code,
            last_error_message = EXCLUDED.last_error_message,
            sent_at = COALESCE(notification_deliveries.sent_at, EXCLUDED.sent_at),
            updated_at = CURRENT_TIMESTAMP
        "#,
        vec![
            event.id.into(),
            event.tenant_id.into(),
            event.guild_id.into(),
            user_id.into(),
            format!("event:{}:in_app:user:{user_id}", event.id).into(),
            status.to_owned().into(),
            error_code.map(str::to_owned).into(),
            error_message.map(str::to_owned).into(),
        ],
    ))
    .await?;

    Ok(())
}

async fn mark_event_failed(
    db: &DatabaseConnection,
    event_id: i32,
    error_message: &str,
) -> Result<(), DbErr> {
    let sanitized = error_message.chars().take(500).collect::<String>();
    db.execute(Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        UPDATE notification_events
        SET status = 'failed',
            next_attempt_at = CURRENT_TIMESTAMP + INTERVAL '1 minute',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        "#,
        vec![event_id.into()],
    ))
    .await?;
    eprintln!("notification event {event_id} failed: {sanitized}");
    Ok(())
}

fn recipient_user_ids(payload: &JsonValue) -> Vec<i32> {
    let mut recipients = payload
        .get("recipient_user_ids")
        .and_then(JsonValue::as_array)
        .map(|values| {
            values
                .iter()
                .filter_map(|value| value.as_i64())
                .filter_map(|value| i32::try_from(value).ok())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    recipients.sort_unstable();
    recipients.dedup();
    recipients
}

fn payload_string(payload: &JsonValue, key: &str) -> Option<String> {
    payload
        .get(key)
        .and_then(JsonValue::as_str)
        .map(str::to_owned)
}

fn notification_title(event_type: &str) -> String {
    event_type
        .split('.')
        .map(|part| {
            let mut chars = part.chars();
            match chars.next() {
                Some(first) => format!("{}{}", first.to_uppercase(), chars.as_str()),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn recipient_user_ids_deduplicates_and_ignores_bad_values() {
        let payload = json!({ "recipient_user_ids": [3, 2, 3, "bad", 1.2] });
        assert_eq!(recipient_user_ids(&payload), vec![2, 3]);
    }

    #[test]
    fn notification_title_humanizes_event_type() {
        assert_eq!(notification_title("listing.approved"), "Listing Approved");
    }
}
