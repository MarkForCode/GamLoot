use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    middleware,
    response::{IntoResponse, Response},
    routing::{get, patch, post},
    Json, Router,
};
use gam_observability::{metrics, track_http_request, ObservabilityConfig};
use sea_orm::{
    ConnectionTrait, Database, DatabaseConnection, DatabaseTransaction, DbBackend, DbErr,
    QueryResult, Statement, TransactionTrait,
};
use serde::{Deserialize, Serialize};
use std::{env, net::SocketAddr, sync::Arc};
use uuid::Uuid;

const LEGACY_PLATFORM_ACTOR_USER_ID: i32 = 1;

#[derive(Clone)]
struct AppState {
    db: Arc<DatabaseConnection>,
}

#[tokio::main]
async fn main() {
    let _observability = gam_observability::init(ObservabilityConfig::from_env(
        "cms-api",
        env!("CARGO_PKG_VERSION"),
    ));

    let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| {
        "postgresql://gam_trade:gam_trade_secure_pass@localhost:5432/gam_trade_dev".into()
    });
    let db = Database::connect(database_url)
        .await
        .expect("failed to connect to database");

    let app = app(db);
    let addr = SocketAddr::from(([0, 0, 0, 0], 8081));
    tracing::info!(%addr, "cms-api listening");

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn app(db: DatabaseConnection) -> Router {
    let state = AppState { db: Arc::new(db) };

    Router::new()
        .route("/health", get(health))
        .route("/metrics", get(metrics))
        .route("/auth/login", post(admin_login))
        .route("/auth/logout", post(admin_logout))
        .route("/auth/me", get(admin_me))
        .route(
            "/admin-users",
            get(list_admin_users).post(create_admin_user),
        )
        .route("/admin-users/:admin_user_id", patch(update_admin_user))
        .route(
            "/admin-users/:admin_user_id/disable",
            post(disable_admin_user),
        )
        .route(
            "/admin-users/:admin_user_id/reset-password",
            post(reset_admin_user_password),
        )
        .route(
            "/admin-roles",
            get(list_admin_roles).post(create_admin_role),
        )
        .route(
            "/admin-roles/:role_id/permissions",
            patch(update_admin_role_permissions),
        )
        .route(
            "/observability/diagnostic-log-rules",
            get(list_diagnostic_log_rules).post(create_diagnostic_log_rule),
        )
        .route(
            "/observability/diagnostic-log-rules/:rule_id",
            patch(update_diagnostic_log_rule).delete(delete_diagnostic_log_rule),
        )
        .route("/trial-requests", get(list_trial_requests))
        .route("/trial-requests/:id/approve", post(approve_trial_request))
        .route("/tenants/:tenant_id/guilds", get(list_guilds))
        .route("/tenants/:tenant_id/listings", get(list_listings))
        .route(
            "/tenants/:tenant_id/procurement-orders",
            get(list_procurement_orders),
        )
        .route("/tenants/:tenant_id/lotteries", get(list_lotteries))
        .route(
            "/tenants/:tenant_id/treasury/accounts",
            get(list_treasury_accounts),
        )
        .route(
            "/tenants/:tenant_id/treasury/ledger",
            get(list_treasury_ledger),
        )
        .route(
            "/tenants/:tenant_id/warehouse/items",
            get(list_warehouse_items),
        )
        .route(
            "/tenants/:tenant_id/trade-deposits",
            get(list_trade_deposits),
        )
        .route("/tenants/:tenant_id/audit-logs", get(list_audit_logs))
        .route("/tenants/:tenant_id/disputes", get(list_disputes))
        .route("/tenants/:tenant_id/reports", get(list_reports))
        .route(
            "/admin-action-confirmations",
            post(create_admin_action_confirmation),
        )
        .route("/disputes/:dispute_id/resolve", post(resolve_dispute))
        .route("/reports/:report_id/resolve", post(resolve_report))
        .route("/users/:user_id/freeze", post(freeze_user))
        .route("/guilds/:guild_id/freeze", post(freeze_guild))
        .route("/listings/:listing_id/freeze", post(freeze_listing))
        .with_state(state)
        .layer(middleware::from_fn(track_http_request))
}

async fn health() -> &'static str {
    "OK"
}

#[derive(Debug, Deserialize)]
struct AdminLoginRequest {
    email: String,
    password: Option<String>,
    password_hash: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
struct AdminUserSummary {
    id: i32,
    email: String,
    username: Option<String>,
    display_name: String,
    tenant_id: Option<i32>,
    is_active: bool,
    must_reset_password: bool,
    roles: Vec<String>,
    permissions: Vec<String>,
}

#[derive(Debug, Clone, Copy)]
struct CmsActor {
    user_id: i32,
    admin_user_id: Option<i32>,
}

#[derive(Debug, Serialize)]
struct AdminLoginResponse {
    token: String,
    expires_at: String,
    admin_user: AdminUserSummary,
}

#[derive(Debug, Deserialize)]
struct CreateAdminUserRequest {
    email: String,
    username: Option<String>,
    display_name: String,
    password_hash: String,
    tenant_id: Option<i32>,
    role_codes: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct UpdateAdminUserRequest {
    display_name: Option<String>,
    tenant_id: Option<i32>,
    is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct ResetAdminPasswordRequest {
    password_hash: Option<String>,
}

#[derive(Debug, Serialize)]
struct ResetAdminPasswordResponse {
    admin_user_id: i32,
    reset_token: String,
}

#[derive(Debug, Serialize)]
struct AdminRoleSummary {
    id: i32,
    code: String,
    name: String,
    description: Option<String>,
    permissions: Vec<String>,
}

#[derive(Debug, Serialize)]
struct DiagnosticLogRuleSummary {
    id: i32,
    service: String,
    method: String,
    route: String,
    enabled: bool,
    expires_at: String,
    reason: String,
    created_by_admin_user_id: Option<i32>,
    created_at: String,
    updated_at: String,
    state: String,
}

#[derive(Debug, Deserialize)]
struct CreateDiagnosticLogRuleRequest {
    service: String,
    method: String,
    route: String,
    ttl_seconds: Option<i32>,
    reason: String,
}

#[derive(Debug, Deserialize)]
struct UpdateDiagnosticLogRuleRequest {
    enabled: Option<bool>,
    ttl_seconds: Option<i32>,
    reason: Option<String>,
}

async fn admin_login(
    State(state): State<AppState>,
    Json(payload): Json<AdminLoginRequest>,
) -> Result<Json<AdminLoginResponse>, ApiError> {
    validate_required(&payload.email, "email")?;
    let provided_password = payload
        .password_hash
        .or(payload.password)
        .ok_or_else(|| ApiError::bad_request("password_hash is required"))?;
    validate_required(&provided_password, "password_hash")?;

    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT id, password_hash, is_active
            FROM admin_users
            WHERE lower(email) = lower($1)
               OR username = $1
            LIMIT 1
            "#,
            vec![payload.email.clone().into()],
        ))
        .await?
        .ok_or_else(|| ApiError::unauthorized("invalid admin credentials"))?;

    let admin_user_id: i32 = row.try_get("", "id")?;
    let password_hash: String = row.try_get("", "password_hash")?;
    let is_active: bool = row.try_get("", "is_active")?;

    if !is_active || password_hash != provided_password {
        state
            .db
            .execute(Statement::from_sql_and_values(
                DbBackend::Postgres,
                r#"
                UPDATE admin_users
                SET failed_login_attempts = failed_login_attempts + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                "#,
                vec![admin_user_id.into()],
            ))
            .await?;
        return Err(ApiError::unauthorized("invalid admin credentials"));
    }

    let token = Uuid::new_v4().to_string();
    let session_row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO admin_sessions (admin_user_id, session_token, expires_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP + interval '12 hours')
            RETURNING expires_at::text AS expires_at
            "#,
            vec![admin_user_id.into(), token.clone().into()],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("admin session insert returned no row"))?;

    state
        .db
        .execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE admin_users
            SET failed_login_attempts = 0,
                last_login_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            "#,
            vec![admin_user_id.into()],
        ))
        .await?;

    let admin_user = load_admin_user_summary(state.db.as_ref(), admin_user_id).await?;

    Ok(Json(AdminLoginResponse {
        token,
        expires_at: session_row.try_get("", "expires_at")?,
        admin_user,
    }))
}

async fn admin_logout(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<StatusCode, ApiError> {
    let token = bearer_token(&headers)?;
    state
        .db
        .execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE admin_sessions
            SET revoked_at = CURRENT_TIMESTAMP
            WHERE session_token = $1
              AND revoked_at IS NULL
            "#,
            vec![token.into()],
        ))
        .await?;

    Ok(StatusCode::NO_CONTENT)
}

async fn admin_me(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<AdminUserSummary>, ApiError> {
    let admin = require_admin_permission(state.db.as_ref(), &headers, "cms.dashboard.view").await?;
    Ok(Json(admin))
}

async fn list_admin_users(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<AdminUserSummary>>, ApiError> {
    require_any_admin_permission(
        state.db.as_ref(),
        &headers,
        &["admin_user.update", "admin_action.view"],
    )
    .await?;

    let rows = state
        .db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            r#"
            SELECT id
            FROM admin_users
            ORDER BY created_at DESC
            LIMIT 100
            "#,
        ))
        .await?;

    let mut users = Vec::new();
    for row in rows {
        users.push(load_admin_user_summary(state.db.as_ref(), row.try_get("", "id")?).await?);
    }

    Ok(Json(users))
}

async fn create_admin_user(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateAdminUserRequest>,
) -> Result<(StatusCode, Json<AdminUserSummary>), ApiError> {
    let actor = require_admin_permission(state.db.as_ref(), &headers, "admin_user.create").await?;
    validate_required(&payload.email, "email")?;
    validate_required(&payload.display_name, "display_name")?;
    validate_required(&payload.password_hash, "password_hash")?;
    if payload.role_codes.is_empty() {
        return Err(ApiError::bad_request("role_codes is required"));
    }

    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO admin_users (
                email,
                username,
                display_name,
                password_hash,
                tenant_id,
                must_reset_password,
                created_by
            )
            VALUES ($1, $2, $3, $4, $5, true, $6)
            RETURNING id
            "#,
            vec![
                payload.email.into(),
                payload.username.into(),
                payload.display_name.into(),
                payload.password_hash.into(),
                payload.tenant_id.into(),
                actor.id.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("admin user insert returned no row"))?;
    let admin_user_id: i32 = row.try_get("", "id")?;

    replace_admin_user_roles(
        state.db.as_ref(),
        admin_user_id,
        actor.id,
        &payload.role_codes,
    )
    .await?;
    insert_admin_audit_log(
        state.db.as_ref(),
        actor.id,
        "admin_user.create",
        "admin_user",
        admin_user_id.to_string(),
    )
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(load_admin_user_summary(state.db.as_ref(), admin_user_id).await?),
    ))
}

async fn update_admin_user(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(admin_user_id): Path<i32>,
    Json(payload): Json<UpdateAdminUserRequest>,
) -> Result<Json<AdminUserSummary>, ApiError> {
    let actor = require_admin_permission(state.db.as_ref(), &headers, "admin_user.update").await?;

    let existing = load_admin_user_summary(state.db.as_ref(), admin_user_id).await?;
    let display_name = payload.display_name.unwrap_or(existing.display_name);
    let tenant_id = payload.tenant_id.or(existing.tenant_id);
    let is_active = payload.is_active.unwrap_or(existing.is_active);

    state
        .db
        .execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE admin_users
            SET display_name = $1,
                tenant_id = $2,
                is_active = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            "#,
            vec![
                display_name.into(),
                tenant_id.into(),
                is_active.into(),
                admin_user_id.into(),
            ],
        ))
        .await?;
    insert_admin_audit_log(
        state.db.as_ref(),
        actor.id,
        "admin_user.update",
        "admin_user",
        admin_user_id.to_string(),
    )
    .await?;

    Ok(Json(
        load_admin_user_summary(state.db.as_ref(), admin_user_id).await?,
    ))
}

async fn disable_admin_user(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(admin_user_id): Path<i32>,
) -> Result<Json<AdminUserSummary>, ApiError> {
    let actor = require_admin_permission(state.db.as_ref(), &headers, "admin_user.disable").await?;
    if actor.id == admin_user_id {
        return Err(ApiError::bad_request("cannot disable yourself"));
    }

    state
        .db
        .execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE admin_users
            SET is_active = false,
                disabled_by = $1,
                disabled_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            "#,
            vec![actor.id.into(), admin_user_id.into()],
        ))
        .await?;
    state
        .db
        .execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE admin_sessions
            SET revoked_at = CURRENT_TIMESTAMP
            WHERE admin_user_id = $1
              AND revoked_at IS NULL
            "#,
            vec![admin_user_id.into()],
        ))
        .await?;
    insert_admin_audit_log(
        state.db.as_ref(),
        actor.id,
        "admin_user.disable",
        "admin_user",
        admin_user_id.to_string(),
    )
    .await?;

    Ok(Json(
        load_admin_user_summary(state.db.as_ref(), admin_user_id).await?,
    ))
}

async fn reset_admin_user_password(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(admin_user_id): Path<i32>,
    Json(payload): Json<ResetAdminPasswordRequest>,
) -> Result<Json<ResetAdminPasswordResponse>, ApiError> {
    let actor =
        require_admin_permission(state.db.as_ref(), &headers, "admin_user.reset_password").await?;
    let reset_token = Uuid::new_v4().to_string();
    let next_password_hash = payload
        .password_hash
        .unwrap_or_else(|| format!("reset-{reset_token}"));

    state
        .db
        .execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE admin_users
            SET password_hash = $1,
                must_reset_password = true,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            "#,
            vec![next_password_hash.into(), admin_user_id.into()],
        ))
        .await?;
    state
        .db
        .execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO admin_password_reset_tokens (
                admin_user_id,
                reset_token,
                expires_at,
                created_by
            )
            VALUES ($1, $2, CURRENT_TIMESTAMP + interval '24 hours', $3)
            "#,
            vec![
                admin_user_id.into(),
                reset_token.clone().into(),
                actor.id.into(),
            ],
        ))
        .await?;
    insert_admin_audit_log(
        state.db.as_ref(),
        actor.id,
        "admin_user.reset_password",
        "admin_user",
        admin_user_id.to_string(),
    )
    .await?;

    Ok(Json(ResetAdminPasswordResponse {
        admin_user_id,
        reset_token,
    }))
}

async fn list_admin_roles(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<AdminRoleSummary>>, ApiError> {
    require_any_admin_permission(
        state.db.as_ref(),
        &headers,
        &[
            "admin_role.manage",
            "admin_user.update",
            "admin_action.view",
        ],
    )
    .await?;

    let rows = state
        .db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            r#"
            SELECT id, code, name, description
            FROM admin_roles
            ORDER BY code
            "#,
        ))
        .await?;
    let mut roles = Vec::new();
    for row in rows {
        let role_id: i32 = row.try_get("", "id")?;
        roles.push(AdminRoleSummary {
            id: role_id,
            code: row.try_get("", "code")?,
            name: row.try_get("", "name")?,
            description: row.try_get("", "description")?,
            permissions: load_admin_role_permissions(state.db.as_ref(), role_id).await?,
        });
    }

    Ok(Json(roles))
}

#[derive(Debug, Deserialize)]
struct CreateAdminRoleRequest {
    code: String,
    name: String,
    description: Option<String>,
    permission_codes: Option<Vec<String>>,
}

async fn create_admin_role(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateAdminRoleRequest>,
) -> Result<(StatusCode, Json<AdminRoleSummary>), ApiError> {
    let actor = require_admin_permission(state.db.as_ref(), &headers, "admin_role.manage").await?;
    validate_required(&payload.code, "code")?;
    validate_required(&payload.name, "name")?;

    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO admin_roles (code, name, description)
            VALUES ($1, $2, $3)
            RETURNING id
            "#,
            vec![
                payload.code.trim().to_owned().into(),
                payload.name.trim().to_owned().into(),
                payload.description.clone().into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("admin role insert returned no row"))?;
    let role_id: i32 = row.try_get("", "id")?;

    for perm_code in payload.permission_codes.as_deref().unwrap_or_default() {
        validate_required(perm_code, "permission_code")?;
        state
            .db
            .execute(Statement::from_sql_and_values(
                DbBackend::Postgres,
                r#"
                INSERT INTO admin_role_permissions (admin_role_id, admin_permission_id)
                SELECT $1, id FROM admin_permissions WHERE code = $2
                ON CONFLICT DO NOTHING
                "#,
                vec![role_id.into(), perm_code.to_owned().into()],
            ))
            .await?;
    }

    insert_admin_audit_log(
        state.db.as_ref(),
        actor.id,
        "admin_role.create",
        "admin_role",
        role_id.to_string(),
    )
    .await?;

    let permissions = load_admin_role_permissions(state.db.as_ref(), role_id).await?;
    Ok((
        StatusCode::CREATED,
        Json(AdminRoleSummary {
            id: role_id,
            code: payload.code.trim().to_owned(),
            name: payload.name.trim().to_owned(),
            description: payload.description,
            permissions,
        }),
    ))
}

#[derive(Debug, Deserialize)]
struct UpdateAdminRolePermissionsRequest {
    permission_codes: Vec<String>,
}

async fn update_admin_role_permissions(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(role_id): Path<i32>,
    Json(payload): Json<UpdateAdminRolePermissionsRequest>,
) -> Result<Json<AdminRoleSummary>, ApiError> {
    let actor = require_admin_permission(state.db.as_ref(), &headers, "admin_role.manage").await?;

    let role = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"SELECT id, code, name, description FROM admin_roles WHERE id = $1"#,
            vec![role_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::not_found("admin role not found"))?;

    state
        .db
        .execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            "DELETE FROM admin_role_permissions WHERE admin_role_id = $1",
            vec![role_id.into()],
        ))
        .await?;

    for perm_code in &payload.permission_codes {
        validate_required(perm_code, "permission_code")?;
        state
            .db
            .execute(Statement::from_sql_and_values(
                DbBackend::Postgres,
                r#"
                INSERT INTO admin_role_permissions (admin_role_id, admin_permission_id)
                SELECT $1, id FROM admin_permissions WHERE code = $2
                ON CONFLICT DO NOTHING
                "#,
                vec![role_id.into(), perm_code.clone().into()],
            ))
            .await?;
    }

    insert_admin_audit_log(
        state.db.as_ref(),
        actor.id,
        "admin_role.update_permissions",
        "admin_role",
        role_id.to_string(),
    )
    .await?;

    let permissions = load_admin_role_permissions(state.db.as_ref(), role_id).await?;
    Ok(Json(AdminRoleSummary {
        id: role.try_get("", "id")?,
        code: role.try_get("", "code")?,
        name: role.try_get("", "name")?,
        description: role.try_get("", "description")?,
        permissions,
    }))
}

async fn list_diagnostic_log_rules(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<DiagnosticLogRuleSummary>>, ApiError> {
    require_admin_permission(state.db.as_ref(), &headers, DIAGNOSTIC_LOG_PERMISSION).await?;

    let rows = state
        .db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            diagnostic_log_rule_select_sql(
                r#"
                SELECT
                    id,
                    service,
                    method,
                    route,
                    enabled,
                    expires_at::text AS expires_at,
                    reason,
                    created_by_admin_user_id,
                    created_at::text AS created_at,
                    updated_at::text AS updated_at,
                    CASE
                        WHEN enabled = false THEN 'disabled'
                        WHEN expires_at <= CURRENT_TIMESTAMP THEN 'expired'
                        ELSE 'active'
                    END AS state
                FROM api_diagnostic_log_rules
                ORDER BY enabled DESC, expires_at DESC, id DESC
                "#,
            ),
        ))
        .await?;

    let rules = rows
        .into_iter()
        .map(diagnostic_log_rule_from_row)
        .collect::<Result<Vec<_>, DbErr>>()?;

    Ok(Json(rules))
}

async fn create_diagnostic_log_rule(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateDiagnosticLogRuleRequest>,
) -> Result<(StatusCode, Json<DiagnosticLogRuleSummary>), ApiError> {
    let actor =
        require_admin_permission(state.db.as_ref(), &headers, DIAGNOSTIC_LOG_PERMISSION).await?;
    let service = validate_diagnostic_service(&payload.service)?;
    let method = validate_diagnostic_method(&payload.method)?;
    let route = validate_diagnostic_route(&payload.route)?;
    let ttl_seconds = validate_diagnostic_ttl(payload.ttl_seconds)?;
    let reason = validate_diagnostic_reason(&payload.reason)?;

    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            diagnostic_log_rule_select_sql(
                r#"
                INSERT INTO api_diagnostic_log_rules (
                    service,
                    method,
                    route,
                    enabled,
                    expires_at,
                    reason,
                    created_by_admin_user_id
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    true,
                    CURRENT_TIMESTAMP + ($4::integer * interval '1 second'),
                    $5,
                    $6
                )
                ON CONFLICT (service, method, route)
                DO UPDATE SET
                    enabled = true,
                    expires_at = EXCLUDED.expires_at,
                    reason = EXCLUDED.reason,
                    created_by_admin_user_id = EXCLUDED.created_by_admin_user_id,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING
                    id,
                    service,
                    method,
                    route,
                    enabled,
                    expires_at::text AS expires_at,
                    reason,
                    created_by_admin_user_id,
                    created_at::text AS created_at,
                    updated_at::text AS updated_at,
                    CASE
                        WHEN enabled = false THEN 'disabled'
                        WHEN expires_at <= CURRENT_TIMESTAMP THEN 'expired'
                        ELSE 'active'
                    END AS state
                "#,
            ),
            vec![
                service.into(),
                method.into(),
                route.into(),
                ttl_seconds.into(),
                reason.clone().into(),
                actor.id.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("diagnostic log rule upsert returned no row"))?;
    let rule = diagnostic_log_rule_from_row(row)?;
    record_diagnostic_rule_admin_change(
        state.db.as_ref(),
        actor.id,
        "observability.diagnostic_log.upsert",
        rule.id,
        reason,
    )
    .await?;

    Ok((StatusCode::CREATED, Json(rule)))
}

async fn update_diagnostic_log_rule(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(rule_id): Path<i32>,
    Json(payload): Json<UpdateDiagnosticLogRuleRequest>,
) -> Result<Json<DiagnosticLogRuleSummary>, ApiError> {
    let actor =
        require_admin_permission(state.db.as_ref(), &headers, DIAGNOSTIC_LOG_PERMISSION).await?;

    if payload.enabled.is_none() && payload.ttl_seconds.is_none() && payload.reason.is_none() {
        return Err(ApiError::bad_request(
            "at least one of enabled, ttl_seconds, or reason is required",
        ));
    }

    let reason = match payload.reason.as_deref() {
        Some(value) => Some(validate_diagnostic_reason(value)?),
        None => None,
    };
    let ttl_seconds = match (payload.ttl_seconds, payload.enabled) {
        (Some(value), _) => Some(validate_diagnostic_ttl(Some(value))?),
        (None, Some(true)) => Some(validate_diagnostic_ttl(None)?),
        (None, _) => None,
    };

    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            diagnostic_log_rule_select_sql(
                r#"
                UPDATE api_diagnostic_log_rules
                SET
                    enabled = COALESCE($2::boolean, enabled),
                    reason = COALESCE($3::text, reason),
                    expires_at = CASE
                        WHEN $4::integer IS NULL THEN expires_at
                        ELSE CURRENT_TIMESTAMP + ($4::integer * interval '1 second')
                    END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING
                    id,
                    service,
                    method,
                    route,
                    enabled,
                    expires_at::text AS expires_at,
                    reason,
                    created_by_admin_user_id,
                    created_at::text AS created_at,
                    updated_at::text AS updated_at,
                    CASE
                        WHEN enabled = false THEN 'disabled'
                        WHEN expires_at <= CURRENT_TIMESTAMP THEN 'expired'
                        ELSE 'active'
                    END AS state
                "#,
            ),
            vec![
                rule_id.into(),
                payload.enabled.into(),
                reason.clone().into(),
                ttl_seconds.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::not_found("diagnostic log rule not found"))?;
    let rule = diagnostic_log_rule_from_row(row)?;
    record_diagnostic_rule_admin_change(
        state.db.as_ref(),
        actor.id,
        "observability.diagnostic_log.update",
        rule.id,
        reason.unwrap_or_else(|| "diagnostic log rule updated".to_owned()),
    )
    .await?;

    Ok(Json(rule))
}

async fn delete_diagnostic_log_rule(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(rule_id): Path<i32>,
) -> Result<Json<DiagnosticLogRuleSummary>, ApiError> {
    let actor =
        require_admin_permission(state.db.as_ref(), &headers, DIAGNOSTIC_LOG_PERMISSION).await?;

    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            diagnostic_log_rule_select_sql(
                r#"
                DELETE FROM api_diagnostic_log_rules
                WHERE id = $1
                RETURNING
                    id,
                    service,
                    method,
                    route,
                    enabled,
                    expires_at::text AS expires_at,
                    reason,
                    created_by_admin_user_id,
                    created_at::text AS created_at,
                    updated_at::text AS updated_at,
                    CASE
                        WHEN enabled = false THEN 'disabled'
                        WHEN expires_at <= CURRENT_TIMESTAMP THEN 'expired'
                        ELSE 'active'
                    END AS state
                "#,
            ),
            vec![rule_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::not_found("diagnostic log rule not found"))?;
    let rule = diagnostic_log_rule_from_row(row)?;
    record_diagnostic_rule_admin_change(
        state.db.as_ref(),
        actor.id,
        "observability.diagnostic_log.delete",
        rule.id,
        "diagnostic log rule deleted".to_owned(),
    )
    .await?;

    Ok(Json(rule))
}

#[derive(Debug, Serialize)]
struct TrialRequestSummary {
    id: i32,
    applicant_email: String,
    applicant_name: String,
    tenant_name: String,
    guild_name: String,
    status: String,
}

async fn list_trial_requests(
    State(state): State<AppState>,
) -> Result<Json<Vec<TrialRequestSummary>>, ApiError> {
    let rows = state
        .db
        .query_all(Statement::from_string(
            DbBackend::Postgres,
            r#"
            SELECT id, applicant_email, applicant_name, tenant_name, guild_name, status
            FROM trial_requests
            ORDER BY created_at DESC
            LIMIT 100
            "#,
        ))
        .await?;

    let requests = rows
        .into_iter()
        .map(|row| {
            let applicant_name: Option<String> = row.try_get("", "applicant_name")?;
            Ok(TrialRequestSummary {
                id: row.try_get("", "id")?,
                applicant_email: row.try_get("", "applicant_email")?,
                applicant_name: applicant_name.unwrap_or_default(),
                tenant_name: row.try_get("", "tenant_name")?,
                guild_name: row.try_get("", "guild_name")?,
                status: row.try_get("", "status")?,
            })
        })
        .collect::<Result<Vec<_>, DbErr>>()?;

    Ok(Json(requests))
}

#[derive(Debug, Deserialize)]
struct ApproveTrialRequest {
    reviewed_by: Option<i32>,
    owner_username: Option<String>,
    owner_password_hash: Option<String>,
}

#[derive(Debug, Serialize)]
struct ApproveTrialResponse {
    trial_request_id: i32,
    tenant_id: i32,
    guild_id: i32,
    owner_user_id: i32,
    subscription_id: i32,
    guild_member_id: i32,
}

#[derive(Debug, Serialize)]
struct GuildSummary {
    id: i32,
    tenant_id: i32,
    slug: String,
    name: String,
    is_active: bool,
    frozen_at: Option<String>,
}

#[derive(Debug, Serialize)]
struct ListingSummary {
    id: i32,
    tenant_id: i32,
    guild_id: i32,
    seller_user_id: i32,
    title: String,
    mode: String,
    visibility: String,
    status: String,
    frozen_at: Option<String>,
}

#[derive(Debug, Serialize)]
struct ProcurementOrderSummary {
    id: i32,
    tenant_id: i32,
    guild_id: i32,
    requester_user_id: i32,
    supplier_user_id: Option<i32>,
    title: String,
    order_type: String,
    visibility: String,
    status: String,
    budget_amount: Option<String>,
}

#[derive(Debug, Serialize)]
struct LotterySummary {
    id: i32,
    tenant_id: i32,
    guild_id: Option<i32>,
    title: String,
    lottery_type: String,
    status: String,
    entry_limit_per_user: Option<i32>,
    drawn_at: Option<String>,
}

#[derive(Debug, Serialize)]
struct TreasuryAccountSummary {
    id: i32,
    tenant_id: i32,
    guild_id: i32,
    currency_id: i32,
    balance: String,
    held_balance: String,
}

#[derive(Debug, Serialize)]
struct TreasuryLedgerEntrySummary {
    id: i32,
    tenant_id: i32,
    guild_id: i32,
    account_id: i32,
    currency_id: i32,
    entry_type: String,
    amount_delta: String,
    held_amount_delta: String,
    balance_after: Option<String>,
    held_balance_after: Option<String>,
    source_type: Option<String>,
    source_id: Option<String>,
    created_by: Option<i32>,
    created_at: String,
}

#[derive(Debug, Serialize)]
struct WarehouseItemSummary {
    id: i32,
    tenant_id: i32,
    guild_id: i32,
    game_id: i32,
    item_name: String,
    quantity: i32,
    status: String,
    custodian_user_id: Option<i32>,
    source_type: Option<String>,
    source_id: Option<String>,
}

#[derive(Debug, Serialize)]
struct TradeDepositSummary {
    id: i32,
    tenant_id: i32,
    guild_id: i32,
    listing_id: Option<i32>,
    bid_id: Option<i32>,
    user_id: i32,
    role: String,
    currency_id: i32,
    amount: String,
    status: String,
    handled_by: Option<i32>,
    created_at: String,
}

#[derive(Debug, Serialize)]
struct AuditLogSummary {
    id: i32,
    tenant_id: Option<i32>,
    guild_id: Option<i32>,
    actor_user_id: Option<i32>,
    actor_admin_user_id: Option<i32>,
    action: String,
    resource_type: String,
    resource_id: Option<String>,
    created_at: String,
}

#[derive(Debug, Serialize)]
struct DisputeSummary {
    id: i32,
    tenant_id: i32,
    guild_id: Option<i32>,
    listing_id: Option<i32>,
    procurement_order_id: Option<i32>,
    lottery_id: Option<i32>,
    opened_by: i32,
    reason: String,
    status: String,
    assigned_to: Option<i32>,
    created_at: String,
}

#[derive(Debug, Serialize)]
struct ReportSummary {
    id: i32,
    tenant_id: Option<i32>,
    guild_id: Option<i32>,
    reporter_user_id: i32,
    reported_user_id: Option<i32>,
    resource_type: String,
    resource_id: Option<String>,
    reason: String,
    status: String,
    created_at: String,
}

#[derive(Debug, Deserialize)]
struct FreezeResource {
    tenant_id: i32,
    actor_user_id: Option<i32>,
    reason: String,
    confirmation_token: String,
}

#[derive(Debug, Deserialize)]
struct ResolveResource {
    tenant_id: i32,
    actor_user_id: Option<i32>,
    resolution: String,
    confirmation_token: String,
}

#[derive(Debug, Deserialize)]
struct CreateAdminActionConfirmation {
    tenant_id: Option<i32>,
    actor_user_id: Option<i32>,
    action: String,
    resource_type: String,
    resource_id: Option<String>,
    reason: String,
    expires_minutes: Option<i64>,
}

#[derive(Debug, Serialize)]
struct AdminActionConfirmationResponse {
    id: i32,
    confirmation_token: String,
    expires_at: String,
}

#[derive(Debug, Serialize)]
struct FreezeResponse {
    id: i32,
    frozen: bool,
}

#[derive(Debug, Serialize)]
struct ResolveResponse {
    id: i32,
    status: String,
}

async fn approve_trial_request(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i32>,
    Json(payload): Json<ApproveTrialRequest>,
) -> Result<(StatusCode, Json<ApproveTrialResponse>), ApiError> {
    let actor = resolve_cms_actor(
        state.db.as_ref(),
        &headers,
        payload.reviewed_by,
        "trial_request.approve",
    )
    .await?;

    let tx = state.db.begin().await?;

    let trial_request = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT id, applicant_email, applicant_name, tenant_name, guild_name, status
            FROM trial_requests
            WHERE id = $1
            FOR UPDATE
            "#,
            vec![id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::not_found("trial request not found"))?;

    let status: String = trial_request.try_get("", "status")?;
    if status != "pending" {
        return Err(ApiError::bad_request("trial request is not pending"));
    }

    let applicant_email: String = trial_request.try_get("", "applicant_email")?;
    let applicant_name: Option<String> = trial_request.try_get("", "applicant_name")?;
    let tenant_name: String = trial_request.try_get("", "tenant_name")?;
    let guild_name: String = trial_request.try_get("", "guild_name")?;
    let tenant_code = unique_code(&tenant_name, id);
    let guild_slug = unique_code(&guild_name, id);
    let owner_username = payload
        .owner_username
        .unwrap_or_else(|| default_username(&applicant_email, id));
    let owner_password_hash = payload
        .owner_password_hash
        .unwrap_or_else(|| "temporary-password-hash".into());

    let tenant_id = insert_tenant(&tx, &tenant_code, &tenant_name).await?;
    let guild_id = insert_guild(&tx, tenant_id, &guild_slug, &guild_name).await?;
    let owner_user_id = insert_owner_user(
        &tx,
        tenant_id,
        guild_id,
        &owner_username,
        &applicant_email,
        &owner_password_hash,
    )
    .await?;
    update_guild_owner(&tx, guild_id, owner_user_id).await?;
    let subscription_id = insert_trial_subscription(&tx, tenant_id, guild_id).await?;
    let guild_member_id = insert_guild_owner_member(
        &tx,
        tenant_id,
        guild_id,
        owner_user_id,
        applicant_name.as_deref().unwrap_or_default(),
    )
    .await?;
    seed_guild_owner_role(&tx, tenant_id, guild_id, guild_member_id, actor.user_id).await?;

    tx.execute(Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        UPDATE trial_requests
        SET status = 'approved',
            reviewed_by = $1,
            reviewed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        "#,
        vec![actor.user_id.into(), id.into()],
    ))
    .await?;

    insert_audit_log(
        &tx,
        Some(tenant_id),
        Some(guild_id),
        actor.user_id,
        actor.admin_user_id,
        "trial_request.approve",
        "trial_request",
        id.to_string(),
    )
    .await?;

    tx.commit().await?;

    Ok((
        StatusCode::CREATED,
        Json(ApproveTrialResponse {
            trial_request_id: id,
            tenant_id,
            guild_id,
            owner_user_id,
            subscription_id,
            guild_member_id,
        }),
    ))
}

async fn list_guilds(
    State(state): State<AppState>,
    Path(tenant_id): Path<i32>,
) -> Result<Json<Vec<GuildSummary>>, ApiError> {
    let rows = state
        .db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT id, tenant_id, slug, name, is_active, frozen_at::text AS frozen_at
            FROM guilds
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            LIMIT 200
            "#,
            vec![tenant_id.into()],
        ))
        .await?;

    let guilds = rows
        .into_iter()
        .map(|row| {
            Ok(GuildSummary {
                id: row.try_get("", "id")?,
                tenant_id: row.try_get("", "tenant_id")?,
                slug: row.try_get("", "slug")?,
                name: row.try_get("", "name")?,
                is_active: row.try_get("", "is_active")?,
                frozen_at: row.try_get("", "frozen_at")?,
            })
        })
        .collect::<Result<Vec<_>, DbErr>>()?;

    Ok(Json(guilds))
}

async fn list_listings(
    State(state): State<AppState>,
    Path(tenant_id): Path<i32>,
) -> Result<Json<Vec<ListingSummary>>, ApiError> {
    let rows = state
        .db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT
                id,
                tenant_id,
                guild_id,
                seller_user_id,
                title,
                mode,
                visibility,
                status,
                frozen_at::text AS frozen_at
            FROM listings
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            LIMIT 200
            "#,
            vec![tenant_id.into()],
        ))
        .await?;

    let listings = rows
        .into_iter()
        .map(|row| {
            Ok(ListingSummary {
                id: row.try_get("", "id")?,
                tenant_id: row.try_get("", "tenant_id")?,
                guild_id: row.try_get("", "guild_id")?,
                seller_user_id: row.try_get("", "seller_user_id")?,
                title: row.try_get("", "title")?,
                mode: row.try_get("", "mode")?,
                visibility: row.try_get("", "visibility")?,
                status: row.try_get("", "status")?,
                frozen_at: row.try_get("", "frozen_at")?,
            })
        })
        .collect::<Result<Vec<_>, DbErr>>()?;

    Ok(Json(listings))
}

async fn list_procurement_orders(
    State(state): State<AppState>,
    Path(tenant_id): Path<i32>,
) -> Result<Json<Vec<ProcurementOrderSummary>>, ApiError> {
    let rows = state
        .db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT
                id,
                tenant_id,
                guild_id,
                requester_user_id,
                supplier_user_id,
                title,
                order_type,
                visibility,
                status,
                budget_amount::text AS budget_amount
            FROM procurement_orders
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            LIMIT 200
            "#,
            vec![tenant_id.into()],
        ))
        .await?;

    let orders = rows
        .into_iter()
        .map(|row| {
            Ok(ProcurementOrderSummary {
                id: row.try_get("", "id")?,
                tenant_id: row.try_get("", "tenant_id")?,
                guild_id: row.try_get("", "guild_id")?,
                requester_user_id: row.try_get("", "requester_user_id")?,
                supplier_user_id: row.try_get("", "supplier_user_id")?,
                title: row.try_get("", "title")?,
                order_type: row.try_get("", "order_type")?,
                visibility: row.try_get("", "visibility")?,
                status: row.try_get("", "status")?,
                budget_amount: row.try_get("", "budget_amount")?,
            })
        })
        .collect::<Result<Vec<_>, DbErr>>()?;

    Ok(Json(orders))
}

async fn list_lotteries(
    State(state): State<AppState>,
    Path(tenant_id): Path<i32>,
) -> Result<Json<Vec<LotterySummary>>, ApiError> {
    let rows = state
        .db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT
                id,
                tenant_id,
                guild_id,
                title,
                lottery_type,
                status,
                entry_limit_per_user,
                drawn_at::text AS drawn_at
            FROM lotteries
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            LIMIT 200
            "#,
            vec![tenant_id.into()],
        ))
        .await?;

    let lotteries = rows
        .into_iter()
        .map(|row| {
            Ok(LotterySummary {
                id: row.try_get("", "id")?,
                tenant_id: row.try_get("", "tenant_id")?,
                guild_id: row.try_get("", "guild_id")?,
                title: row.try_get("", "title")?,
                lottery_type: row.try_get("", "lottery_type")?,
                status: row.try_get("", "status")?,
                entry_limit_per_user: row.try_get("", "entry_limit_per_user")?,
                drawn_at: row.try_get("", "drawn_at")?,
            })
        })
        .collect::<Result<Vec<_>, DbErr>>()?;

    Ok(Json(lotteries))
}

async fn list_treasury_accounts(
    State(state): State<AppState>,
    Path(tenant_id): Path<i32>,
) -> Result<Json<Vec<TreasuryAccountSummary>>, ApiError> {
    let rows = state
        .db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT
                id,
                tenant_id,
                guild_id,
                currency_id,
                balance::text AS balance,
                held_balance::text AS held_balance
            FROM guild_treasury_accounts
            WHERE tenant_id = $1
            ORDER BY guild_id, currency_id
            LIMIT 300
            "#,
            vec![tenant_id.into()],
        ))
        .await?;

    let accounts = rows
        .into_iter()
        .map(|row| {
            Ok(TreasuryAccountSummary {
                id: row.try_get("", "id")?,
                tenant_id: row.try_get("", "tenant_id")?,
                guild_id: row.try_get("", "guild_id")?,
                currency_id: row.try_get("", "currency_id")?,
                balance: row.try_get("", "balance")?,
                held_balance: row.try_get("", "held_balance")?,
            })
        })
        .collect::<Result<Vec<_>, DbErr>>()?;

    Ok(Json(accounts))
}

async fn list_treasury_ledger(
    State(state): State<AppState>,
    Path(tenant_id): Path<i32>,
) -> Result<Json<Vec<TreasuryLedgerEntrySummary>>, ApiError> {
    let rows = state
        .db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT
                id,
                tenant_id,
                guild_id,
                account_id,
                currency_id,
                entry_type,
                amount_delta::text AS amount_delta,
                held_amount_delta::text AS held_amount_delta,
                balance_after::text AS balance_after,
                held_balance_after::text AS held_balance_after,
                source_type,
                source_id,
                created_by,
                created_at::text AS created_at
            FROM guild_treasury_ledger_entries
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            LIMIT 300
            "#,
            vec![tenant_id.into()],
        ))
        .await?;

    let entries = rows
        .into_iter()
        .map(|row| {
            Ok(TreasuryLedgerEntrySummary {
                id: row.try_get("", "id")?,
                tenant_id: row.try_get("", "tenant_id")?,
                guild_id: row.try_get("", "guild_id")?,
                account_id: row.try_get("", "account_id")?,
                currency_id: row.try_get("", "currency_id")?,
                entry_type: row.try_get("", "entry_type")?,
                amount_delta: row.try_get("", "amount_delta")?,
                held_amount_delta: row.try_get("", "held_amount_delta")?,
                balance_after: row.try_get("", "balance_after")?,
                held_balance_after: row.try_get("", "held_balance_after")?,
                source_type: row.try_get("", "source_type")?,
                source_id: row.try_get("", "source_id")?,
                created_by: row.try_get("", "created_by")?,
                created_at: row.try_get("", "created_at")?,
            })
        })
        .collect::<Result<Vec<_>, DbErr>>()?;

    Ok(Json(entries))
}

async fn list_warehouse_items(
    State(state): State<AppState>,
    Path(tenant_id): Path<i32>,
) -> Result<Json<Vec<WarehouseItemSummary>>, ApiError> {
    let rows = state
        .db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT
                id,
                tenant_id,
                guild_id,
                game_id,
                item_name,
                quantity,
                status,
                custodian_user_id,
                source_type,
                source_id
            FROM guild_warehouse_items
            WHERE tenant_id = $1
            ORDER BY updated_at DESC, created_at DESC
            LIMIT 300
            "#,
            vec![tenant_id.into()],
        ))
        .await?;

    let items = rows
        .into_iter()
        .map(|row| {
            Ok(WarehouseItemSummary {
                id: row.try_get("", "id")?,
                tenant_id: row.try_get("", "tenant_id")?,
                guild_id: row.try_get("", "guild_id")?,
                game_id: row.try_get("", "game_id")?,
                item_name: row.try_get("", "item_name")?,
                quantity: row.try_get("", "quantity")?,
                status: row.try_get("", "status")?,
                custodian_user_id: row.try_get("", "custodian_user_id")?,
                source_type: row.try_get("", "source_type")?,
                source_id: row.try_get("", "source_id")?,
            })
        })
        .collect::<Result<Vec<_>, DbErr>>()?;

    Ok(Json(items))
}

async fn list_trade_deposits(
    State(state): State<AppState>,
    Path(tenant_id): Path<i32>,
) -> Result<Json<Vec<TradeDepositSummary>>, ApiError> {
    let rows = state
        .db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT
                id,
                tenant_id,
                guild_id,
                listing_id,
                bid_id,
                user_id,
                role,
                currency_id,
                amount::text AS amount,
                status,
                handled_by,
                created_at::text AS created_at
            FROM trade_deposits
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            LIMIT 300
            "#,
            vec![tenant_id.into()],
        ))
        .await?;

    let deposits = rows
        .into_iter()
        .map(|row| {
            Ok(TradeDepositSummary {
                id: row.try_get("", "id")?,
                tenant_id: row.try_get("", "tenant_id")?,
                guild_id: row.try_get("", "guild_id")?,
                listing_id: row.try_get("", "listing_id")?,
                bid_id: row.try_get("", "bid_id")?,
                user_id: row.try_get("", "user_id")?,
                role: row.try_get("", "role")?,
                currency_id: row.try_get("", "currency_id")?,
                amount: row.try_get("", "amount")?,
                status: row.try_get("", "status")?,
                handled_by: row.try_get("", "handled_by")?,
                created_at: row.try_get("", "created_at")?,
            })
        })
        .collect::<Result<Vec<_>, DbErr>>()?;

    Ok(Json(deposits))
}

async fn list_audit_logs(
    State(state): State<AppState>,
    Path(tenant_id): Path<i32>,
) -> Result<Json<Vec<AuditLogSummary>>, ApiError> {
    let rows = state
        .db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT
                id,
                tenant_id,
                guild_id,
                actor_user_id,
                actor_admin_user_id,
                action,
                resource_type,
                resource_id,
                created_at::text AS created_at
            FROM audit_logs
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            LIMIT 300
            "#,
            vec![tenant_id.into()],
        ))
        .await?;

    let logs = rows
        .into_iter()
        .map(|row| {
            Ok(AuditLogSummary {
                id: row.try_get("", "id")?,
                tenant_id: row.try_get("", "tenant_id")?,
                guild_id: row.try_get("", "guild_id")?,
                actor_user_id: row.try_get("", "actor_user_id")?,
                actor_admin_user_id: row.try_get("", "actor_admin_user_id")?,
                action: row.try_get("", "action")?,
                resource_type: row.try_get("", "resource_type")?,
                resource_id: row.try_get("", "resource_id")?,
                created_at: row.try_get("", "created_at")?,
            })
        })
        .collect::<Result<Vec<_>, DbErr>>()?;

    Ok(Json(logs))
}

async fn list_disputes(
    State(state): State<AppState>,
    Path(tenant_id): Path<i32>,
) -> Result<Json<Vec<DisputeSummary>>, ApiError> {
    let rows = state
        .db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT
                id,
                tenant_id,
                guild_id,
                listing_id,
                procurement_order_id,
                lottery_id,
                opened_by,
                reason,
                status,
                assigned_to,
                created_at::text AS created_at
            FROM dispute_cases
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            LIMIT 300
            "#,
            vec![tenant_id.into()],
        ))
        .await?;

    let disputes = rows
        .into_iter()
        .map(|row| {
            Ok(DisputeSummary {
                id: row.try_get("", "id")?,
                tenant_id: row.try_get("", "tenant_id")?,
                guild_id: row.try_get("", "guild_id")?,
                listing_id: row.try_get("", "listing_id")?,
                procurement_order_id: row.try_get("", "procurement_order_id")?,
                lottery_id: row.try_get("", "lottery_id")?,
                opened_by: row.try_get("", "opened_by")?,
                reason: row.try_get("", "reason")?,
                status: row.try_get("", "status")?,
                assigned_to: row.try_get("", "assigned_to")?,
                created_at: row.try_get("", "created_at")?,
            })
        })
        .collect::<Result<Vec<_>, DbErr>>()?;

    Ok(Json(disputes))
}

async fn list_reports(
    State(state): State<AppState>,
    Path(tenant_id): Path<i32>,
) -> Result<Json<Vec<ReportSummary>>, ApiError> {
    let rows = state
        .db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT
                id,
                tenant_id,
                guild_id,
                reporter_user_id,
                reported_user_id,
                resource_type,
                resource_id,
                reason,
                status,
                created_at::text AS created_at
            FROM reports
            WHERE tenant_id = $1
            ORDER BY created_at DESC
            LIMIT 300
            "#,
            vec![tenant_id.into()],
        ))
        .await?;

    let reports = rows
        .into_iter()
        .map(|row| {
            Ok(ReportSummary {
                id: row.try_get("", "id")?,
                tenant_id: row.try_get("", "tenant_id")?,
                guild_id: row.try_get("", "guild_id")?,
                reporter_user_id: row.try_get("", "reporter_user_id")?,
                reported_user_id: row.try_get("", "reported_user_id")?,
                resource_type: row.try_get("", "resource_type")?,
                resource_id: row.try_get("", "resource_id")?,
                reason: row.try_get("", "reason")?,
                status: row.try_get("", "status")?,
                created_at: row.try_get("", "created_at")?,
            })
        })
        .collect::<Result<Vec<_>, DbErr>>()?;

    Ok(Json(reports))
}

async fn create_admin_action_confirmation(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateAdminActionConfirmation>,
) -> Result<(StatusCode, Json<AdminActionConfirmationResponse>), ApiError> {
    validate_required(&payload.action, "action")?;
    validate_required(&payload.resource_type, "resource_type")?;
    validate_required(&payload.reason, "reason")?;
    let actor = resolve_cms_actor(
        state.db.as_ref(),
        &headers,
        payload.actor_user_id,
        &payload.action,
    )
    .await?;

    let token = Uuid::new_v4().to_string();
    let expires_minutes = payload.expires_minutes.unwrap_or(10).clamp(1, 60);
    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO admin_action_confirmations (
                tenant_id,
                actor_user_id,
                actor_admin_user_id,
                action,
                resource_type,
                resource_id,
                confirmation_token,
                reason,
                expires_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP + ($9::text || ' minutes')::interval)
            RETURNING id, confirmation_token, expires_at::text AS expires_at
            "#,
            vec![
                payload.tenant_id.into(),
                actor.user_id.into(),
                actor.admin_user_id.into(),
                payload.action.into(),
                payload.resource_type.into(),
                payload.resource_id.into(),
                token.into(),
                payload.reason.into(),
                expires_minutes.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("confirmation insert returned no row"))?;

    Ok((
        StatusCode::CREATED,
        Json(AdminActionConfirmationResponse {
            id: row.try_get("", "id")?,
            confirmation_token: row.try_get("", "confirmation_token")?,
            expires_at: row.try_get("", "expires_at")?,
        }),
    ))
}

async fn resolve_dispute(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(dispute_id): Path<i32>,
    Json(payload): Json<ResolveResource>,
) -> Result<Json<ResolveResponse>, ApiError> {
    validate_required(&payload.resolution, "resolution")?;
    let actor = resolve_cms_actor(
        state.db.as_ref(),
        &headers,
        payload.actor_user_id,
        "dispute.resolve",
    )
    .await?;
    consume_admin_action_confirmation(
        state.db.as_ref(),
        Some(payload.tenant_id),
        actor.user_id,
        actor.admin_user_id,
        "dispute.resolve",
        "dispute_case",
        Some(dispute_id.to_string()),
        &payload.confirmation_token,
    )
    .await?;
    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE dispute_cases
            SET status = 'resolved',
                resolution = $1,
                resolved_by = $2,
                resolved_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
              AND tenant_id = $4
              AND status <> 'resolved'
            RETURNING id, status, guild_id
            "#,
            vec![
                payload.resolution.clone().into(),
                actor.user_id.into(),
                dispute_id.into(),
                payload.tenant_id.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::bad_request("dispute is not resolvable"))?;
    let guild_id: Option<i32> = row.try_get("", "guild_id")?;

    insert_audit_log(
        state.db.as_ref(),
        Some(payload.tenant_id),
        guild_id,
        actor.user_id,
        actor.admin_user_id,
        "dispute.resolve",
        "dispute_case",
        dispute_id.to_string(),
    )
    .await?;
    insert_admin_action(
        state.db.as_ref(),
        Some(payload.tenant_id),
        guild_id,
        actor.user_id,
        actor.admin_user_id,
        "dispute.resolve",
        "dispute_case",
        dispute_id.to_string(),
        payload.resolution,
    )
    .await?;

    Ok(Json(ResolveResponse {
        id: row.try_get("", "id")?,
        status: row.try_get("", "status")?,
    }))
}

async fn resolve_report(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(report_id): Path<i32>,
    Json(payload): Json<ResolveResource>,
) -> Result<Json<ResolveResponse>, ApiError> {
    validate_required(&payload.resolution, "resolution")?;
    let actor = resolve_cms_actor(
        state.db.as_ref(),
        &headers,
        payload.actor_user_id,
        "report.resolve",
    )
    .await?;
    consume_admin_action_confirmation(
        state.db.as_ref(),
        Some(payload.tenant_id),
        actor.user_id,
        actor.admin_user_id,
        "report.resolve",
        "report",
        Some(report_id.to_string()),
        &payload.confirmation_token,
    )
    .await?;
    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE reports
            SET status = 'resolved',
                resolution = $1,
                reviewed_by = $2,
                reviewed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
              AND tenant_id = $4
              AND status <> 'resolved'
            RETURNING id, status, guild_id
            "#,
            vec![
                payload.resolution.clone().into(),
                actor.user_id.into(),
                report_id.into(),
                payload.tenant_id.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::bad_request("report is not resolvable"))?;
    let guild_id: Option<i32> = row.try_get("", "guild_id")?;

    insert_audit_log(
        state.db.as_ref(),
        Some(payload.tenant_id),
        guild_id,
        actor.user_id,
        actor.admin_user_id,
        "report.resolve",
        "report",
        report_id.to_string(),
    )
    .await?;
    insert_admin_action(
        state.db.as_ref(),
        Some(payload.tenant_id),
        guild_id,
        actor.user_id,
        actor.admin_user_id,
        "report.resolve",
        "report",
        report_id.to_string(),
        payload.resolution,
    )
    .await?;

    Ok(Json(ResolveResponse {
        id: row.try_get("", "id")?,
        status: row.try_get("", "status")?,
    }))
}

async fn freeze_user(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(user_id): Path<i32>,
    Json(payload): Json<FreezeResource>,
) -> Result<Json<FreezeResponse>, ApiError> {
    validate_required(&payload.reason, "reason")?;
    let actor = resolve_cms_actor(
        state.db.as_ref(),
        &headers,
        payload.actor_user_id,
        "user.freeze",
    )
    .await?;
    consume_admin_action_confirmation(
        state.db.as_ref(),
        Some(payload.tenant_id),
        actor.user_id,
        actor.admin_user_id,
        "user.freeze",
        "user",
        Some(user_id.to_string()),
        &payload.confirmation_token,
    )
    .await?;
    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE users
            SET is_active = false,
                frozen_at = CURRENT_TIMESTAMP,
                frozen_by = $1,
                freeze_reason = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
              AND tenant_id = $4
            RETURNING id, guild_id
            "#,
            vec![
                actor.user_id.into(),
                payload.reason.clone().into(),
                user_id.into(),
                payload.tenant_id.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::not_found("user not found"))?;
    let guild_id: Option<i32> = row.try_get("", "guild_id")?;

    insert_audit_log(
        state.db.as_ref(),
        Some(payload.tenant_id),
        guild_id,
        actor.user_id,
        actor.admin_user_id,
        "user.freeze",
        "user",
        user_id.to_string(),
    )
    .await?;
    insert_admin_action(
        state.db.as_ref(),
        Some(payload.tenant_id),
        guild_id,
        actor.user_id,
        actor.admin_user_id,
        "user.freeze",
        "user",
        user_id.to_string(),
        payload.reason,
    )
    .await?;

    Ok(Json(FreezeResponse {
        id: row.try_get("", "id")?,
        frozen: true,
    }))
}

async fn freeze_guild(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(guild_id): Path<i32>,
    Json(payload): Json<FreezeResource>,
) -> Result<Json<FreezeResponse>, ApiError> {
    validate_required(&payload.reason, "reason")?;
    let actor = resolve_cms_actor(
        state.db.as_ref(),
        &headers,
        payload.actor_user_id,
        "guild.freeze",
    )
    .await?;
    consume_admin_action_confirmation(
        state.db.as_ref(),
        Some(payload.tenant_id),
        actor.user_id,
        actor.admin_user_id,
        "guild.freeze",
        "guild",
        Some(guild_id.to_string()),
        &payload.confirmation_token,
    )
    .await?;
    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE guilds
            SET is_active = false,
                frozen_at = CURRENT_TIMESTAMP,
                frozen_by = $1,
                freeze_reason = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
              AND tenant_id = $4
            RETURNING id
            "#,
            vec![
                actor.user_id.into(),
                payload.reason.clone().into(),
                guild_id.into(),
                payload.tenant_id.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::not_found("guild not found"))?;

    insert_audit_log(
        state.db.as_ref(),
        Some(payload.tenant_id),
        Some(guild_id),
        actor.user_id,
        actor.admin_user_id,
        "guild.freeze",
        "guild",
        guild_id.to_string(),
    )
    .await?;
    insert_admin_action(
        state.db.as_ref(),
        Some(payload.tenant_id),
        Some(guild_id),
        actor.user_id,
        actor.admin_user_id,
        "guild.freeze",
        "guild",
        guild_id.to_string(),
        payload.reason,
    )
    .await?;

    Ok(Json(FreezeResponse {
        id: row.try_get("", "id")?,
        frozen: true,
    }))
}

async fn freeze_listing(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(listing_id): Path<i32>,
    Json(payload): Json<FreezeResource>,
) -> Result<Json<FreezeResponse>, ApiError> {
    validate_required(&payload.reason, "reason")?;
    let actor = resolve_cms_actor(
        state.db.as_ref(),
        &headers,
        payload.actor_user_id,
        "listing.freeze",
    )
    .await?;
    consume_admin_action_confirmation(
        state.db.as_ref(),
        Some(payload.tenant_id),
        actor.user_id,
        actor.admin_user_id,
        "listing.freeze",
        "listing",
        Some(listing_id.to_string()),
        &payload.confirmation_token,
    )
    .await?;
    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE listings
            SET frozen_at = CURRENT_TIMESTAMP,
                frozen_by = $1,
                freeze_reason = $2,
                status = 'frozen',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
              AND tenant_id = $4
            RETURNING id, guild_id
            "#,
            vec![
                actor.user_id.into(),
                payload.reason.clone().into(),
                listing_id.into(),
                payload.tenant_id.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::not_found("listing not found"))?;
    let guild_id: i32 = row.try_get("", "guild_id")?;

    insert_audit_log(
        state.db.as_ref(),
        Some(payload.tenant_id),
        Some(guild_id),
        actor.user_id,
        actor.admin_user_id,
        "listing.freeze",
        "listing",
        listing_id.to_string(),
    )
    .await?;
    insert_admin_action(
        state.db.as_ref(),
        Some(payload.tenant_id),
        Some(guild_id),
        actor.user_id,
        actor.admin_user_id,
        "listing.freeze",
        "listing",
        listing_id.to_string(),
        payload.reason,
    )
    .await?;

    Ok(Json(FreezeResponse {
        id: row.try_get("", "id")?,
        frozen: true,
    }))
}

async fn insert_tenant(tx: &DatabaseTransaction, code: &str, name: &str) -> Result<i32, ApiError> {
    let row = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO tenants (code, name)
            VALUES ($1, $2)
            RETURNING id
            "#,
            vec![code.to_owned().into(), name.to_owned().into()],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("tenant insert returned no row"))?;

    Ok(row.try_get("", "id")?)
}

async fn insert_guild(
    tx: &DatabaseTransaction,
    tenant_id: i32,
    slug: &str,
    name: &str,
) -> Result<i32, ApiError> {
    let row = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO guilds (tenant_id, slug, name)
            VALUES ($1, $2, $3)
            RETURNING id
            "#,
            vec![
                tenant_id.into(),
                slug.to_owned().into(),
                name.to_owned().into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("guild insert returned no row"))?;

    Ok(row.try_get("", "id")?)
}

async fn insert_owner_user(
    tx: &DatabaseTransaction,
    tenant_id: i32,
    guild_id: i32,
    username: &str,
    email: &str,
    password_hash: &str,
) -> Result<i32, ApiError> {
    let row = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO users (
                username,
                email,
                password_hash,
                role,
                tenant_id,
                guild_id,
                must_reset_password
            )
            VALUES ($1, $2, $3, 'guild_owner', $4, $5, true)
            RETURNING id
            "#,
            vec![
                username.to_owned().into(),
                email.to_owned().into(),
                password_hash.to_owned().into(),
                tenant_id.into(),
                guild_id.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("owner user insert returned no row"))?;

    Ok(row.try_get("", "id")?)
}

async fn update_guild_owner(
    tx: &DatabaseTransaction,
    guild_id: i32,
    owner_user_id: i32,
) -> Result<(), ApiError> {
    tx.execute(Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        UPDATE guilds
        SET owner_user_id = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        "#,
        vec![owner_user_id.into(), guild_id.into()],
    ))
    .await?;

    Ok(())
}

async fn insert_trial_subscription(
    tx: &DatabaseTransaction,
    tenant_id: i32,
    guild_id: i32,
) -> Result<i32, ApiError> {
    let row = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO subscriptions (tenant_id, guild_id, plan_id, seat_limit, seats_used)
            SELECT $1, $2, id, seat_limit, 1
            FROM plans
            WHERE code = 'trial'
            RETURNING id
            "#,
            vec![tenant_id.into(), guild_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("trial plan not found"))?;

    Ok(row.try_get("", "id")?)
}

async fn insert_guild_owner_member(
    tx: &DatabaseTransaction,
    tenant_id: i32,
    guild_id: i32,
    owner_user_id: i32,
    display_name: &str,
) -> Result<i32, ApiError> {
    let row = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO guild_members (tenant_id, guild_id, user_id, display_name)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            "#,
            vec![
                tenant_id.into(),
                guild_id.into(),
                owner_user_id.into(),
                display_name.to_owned().into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("guild member insert returned no row"))?;

    Ok(row.try_get("", "id")?)
}

async fn seed_guild_owner_role(
    tx: &DatabaseTransaction,
    tenant_id: i32,
    guild_id: i32,
    guild_member_id: i32,
    assigned_by: i32,
) -> Result<(), ApiError> {
    let role = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO roles (tenant_id, guild_id, code, name, scope, is_system)
            VALUES ($1, $2, 'guild_owner', 'Guild Owner', 'guild', true)
            ON CONFLICT (tenant_id, guild_id, code)
            DO UPDATE SET updated_at = CURRENT_TIMESTAMP
            RETURNING id
            "#,
            vec![tenant_id.into(), guild_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("guild owner role upsert returned no row"))?;

    let role_id: i32 = role.try_get("", "id")?;
    tx.execute(Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT $1, id
        FROM permissions
        ON CONFLICT (role_id, permission_id) DO NOTHING
        "#,
        vec![role_id.into()],
    ))
    .await?;

    tx.execute(Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        INSERT INTO member_roles (guild_member_id, role_id, assigned_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (guild_member_id, role_id) DO NOTHING
        "#,
        vec![guild_member_id.into(), role_id.into(), assigned_by.into()],
    ))
    .await?;

    Ok(())
}

async fn consume_admin_action_confirmation<C>(
    db: &C,
    tenant_id: Option<i32>,
    actor_user_id: i32,
    actor_admin_user_id: Option<i32>,
    action: &str,
    resource_type: &str,
    resource_id: Option<String>,
    confirmation_token: &str,
) -> Result<(), ApiError>
where
    C: ConnectionTrait,
{
    validate_required(confirmation_token, "confirmation_token")?;

    let row = db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE admin_action_confirmations
            SET consumed_at = CURRENT_TIMESTAMP
            WHERE confirmation_token = $1
              AND tenant_id IS NOT DISTINCT FROM $2
              AND actor_user_id = $3
              AND actor_admin_user_id IS NOT DISTINCT FROM $4
              AND action = $5
              AND resource_type = $6
              AND resource_id IS NOT DISTINCT FROM $7
              AND consumed_at IS NULL
              AND expires_at > CURRENT_TIMESTAMP
            RETURNING id
            "#,
            vec![
                confirmation_token.to_owned().into(),
                tenant_id.into(),
                actor_user_id.into(),
                actor_admin_user_id.into(),
                action.to_owned().into(),
                resource_type.to_owned().into(),
                resource_id.into(),
            ],
        ))
        .await?;

    if row.is_none() {
        return Err(ApiError::bad_request(
            "confirmation token is invalid, expired, or already used",
        ));
    }

    Ok(())
}

async fn insert_audit_log<C>(
    db: &C,
    tenant_id: Option<i32>,
    guild_id: Option<i32>,
    actor_user_id: i32,
    actor_admin_user_id: Option<i32>,
    action: &str,
    resource_type: &str,
    resource_id: String,
) -> Result<(), ApiError>
where
    C: ConnectionTrait,
{
    db.execute(Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        INSERT INTO audit_logs (
            tenant_id,
            guild_id,
            actor_user_id,
            actor_admin_user_id,
            action,
            resource_type,
            resource_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
        vec![
            tenant_id.into(),
            guild_id.into(),
            actor_user_id.into(),
            actor_admin_user_id.into(),
            action.to_owned().into(),
            resource_type.to_owned().into(),
            resource_id.into(),
        ],
    ))
    .await?;

    Ok(())
}

async fn insert_admin_action<C>(
    db: &C,
    tenant_id: Option<i32>,
    guild_id: Option<i32>,
    actor_user_id: i32,
    actor_admin_user_id: Option<i32>,
    action: &str,
    resource_type: &str,
    resource_id: String,
    reason: String,
) -> Result<(), ApiError>
where
    C: ConnectionTrait,
{
    db.execute(Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        INSERT INTO admin_actions (
            tenant_id,
            guild_id,
            actor_user_id,
            actor_admin_user_id,
            action,
            resource_type,
            resource_id,
            reason
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
        vec![
            tenant_id.into(),
            guild_id.into(),
            actor_user_id.into(),
            actor_admin_user_id.into(),
            action.to_owned().into(),
            resource_type.to_owned().into(),
            resource_id.into(),
            reason.into(),
        ],
    ))
    .await?;

    Ok(())
}

fn validate_required(value: &str, field: &'static str) -> Result<(), ApiError> {
    if value.trim().is_empty() {
        return Err(ApiError::bad_request(format!("{field} is required")));
    }

    Ok(())
}

fn bearer_token(headers: &HeaderMap) -> Result<String, ApiError> {
    let value = headers
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| ApiError::unauthorized("missing authorization header"))?;
    let token = value
        .strip_prefix("Bearer ")
        .ok_or_else(|| ApiError::unauthorized("authorization header must be a bearer token"))?;
    validate_required(token, "token")?;
    Ok(token.to_owned())
}

async fn require_admin_permission<C>(
    db: &C,
    headers: &HeaderMap,
    permission: &str,
) -> Result<AdminUserSummary, ApiError>
where
    C: ConnectionTrait,
{
    let admin = load_admin_context_from_headers(db, headers).await?;
    if admin.permissions.iter().any(|code| code == permission) {
        Ok(admin)
    } else {
        Err(ApiError::forbidden(
            "admin user does not have the required permission",
        ))
    }
}

async fn require_any_admin_permission<C>(
    db: &C,
    headers: &HeaderMap,
    permissions: &[&str],
) -> Result<AdminUserSummary, ApiError>
where
    C: ConnectionTrait,
{
    let admin = load_admin_context_from_headers(db, headers).await?;
    if permissions
        .iter()
        .any(|permission| admin.permissions.iter().any(|code| code == permission))
    {
        Ok(admin)
    } else {
        Err(ApiError::forbidden(
            "admin user does not have any required permission",
        ))
    }
}

async fn resolve_cms_actor<C>(
    db: &C,
    headers: &HeaderMap,
    legacy_actor_user_id: Option<i32>,
    action: &str,
) -> Result<CmsActor, ApiError>
where
    C: ConnectionTrait,
{
    if headers.get("authorization").is_some() {
        let admin = require_admin_permission(db, headers, action).await?;
        return Ok(CmsActor {
            user_id: LEGACY_PLATFORM_ACTOR_USER_ID,
            admin_user_id: Some(admin.id),
        });
    }

    let actor_user_id = legacy_actor_user_id
        .ok_or_else(|| ApiError::unauthorized("missing admin session or actor_user_id"))?;
    ensure_cms_permission(db, actor_user_id, action).await?;
    Ok(CmsActor {
        user_id: actor_user_id,
        admin_user_id: None,
    })
}

async fn load_admin_context_from_headers<C>(
    db: &C,
    headers: &HeaderMap,
) -> Result<AdminUserSummary, ApiError>
where
    C: ConnectionTrait,
{
    let token = bearer_token(headers)?;
    let row = db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT u.id
            FROM admin_sessions s
            JOIN admin_users u ON u.id = s.admin_user_id
            WHERE s.session_token = $1
              AND s.revoked_at IS NULL
              AND s.expires_at > CURRENT_TIMESTAMP
              AND u.is_active = true
            "#,
            vec![token.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::unauthorized("admin session is invalid or expired"))?;
    load_admin_user_summary(db, row.try_get("", "id")?).await
}

async fn load_admin_user_summary<C>(
    db: &C,
    admin_user_id: i32,
) -> Result<AdminUserSummary, ApiError>
where
    C: ConnectionTrait,
{
    let row = db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT id, email, username, display_name, tenant_id, is_active, must_reset_password
            FROM admin_users
            WHERE id = $1
            "#,
            vec![admin_user_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::not_found("admin user not found"))?;

    Ok(AdminUserSummary {
        id: row.try_get("", "id")?,
        email: row.try_get("", "email")?,
        username: row.try_get("", "username")?,
        display_name: row.try_get("", "display_name")?,
        tenant_id: row.try_get("", "tenant_id")?,
        is_active: row.try_get("", "is_active")?,
        must_reset_password: row.try_get("", "must_reset_password")?,
        roles: load_admin_user_roles(db, admin_user_id).await?,
        permissions: load_admin_user_permissions(db, admin_user_id).await?,
    })
}

async fn load_admin_user_roles<C>(db: &C, admin_user_id: i32) -> Result<Vec<String>, ApiError>
where
    C: ConnectionTrait,
{
    let rows = db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT r.code
            FROM admin_user_roles ur
            JOIN admin_roles r ON r.id = ur.admin_role_id
            WHERE ur.admin_user_id = $1
            ORDER BY r.code
            "#,
            vec![admin_user_id.into()],
        ))
        .await?;
    rows.into_iter()
        .map(|row| row.try_get("", "code").map_err(ApiError::from))
        .collect()
}

async fn load_admin_user_permissions<C>(db: &C, admin_user_id: i32) -> Result<Vec<String>, ApiError>
where
    C: ConnectionTrait,
{
    let rows = db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT DISTINCT p.code
            FROM admin_user_roles ur
            JOIN admin_role_permissions rp ON rp.admin_role_id = ur.admin_role_id
            JOIN admin_permissions p ON p.id = rp.admin_permission_id
            WHERE ur.admin_user_id = $1
            ORDER BY p.code
            "#,
            vec![admin_user_id.into()],
        ))
        .await?;
    rows.into_iter()
        .map(|row| row.try_get("", "code").map_err(ApiError::from))
        .collect()
}

async fn load_admin_role_permissions<C>(db: &C, role_id: i32) -> Result<Vec<String>, ApiError>
where
    C: ConnectionTrait,
{
    let rows = db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT p.code
            FROM admin_role_permissions rp
            JOIN admin_permissions p ON p.id = rp.admin_permission_id
            WHERE rp.admin_role_id = $1
            ORDER BY p.code
            "#,
            vec![role_id.into()],
        ))
        .await?;
    rows.into_iter()
        .map(|row| row.try_get("", "code").map_err(ApiError::from))
        .collect()
}

async fn replace_admin_user_roles<C>(
    db: &C,
    admin_user_id: i32,
    assigned_by: i32,
    role_codes: &[String],
) -> Result<(), ApiError>
where
    C: ConnectionTrait,
{
    db.execute(Statement::from_sql_and_values(
        DbBackend::Postgres,
        "DELETE FROM admin_user_roles WHERE admin_user_id = $1",
        vec![admin_user_id.into()],
    ))
    .await?;

    for role_code in role_codes {
        validate_required(role_code, "role_code")?;
        db.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO admin_user_roles (admin_user_id, admin_role_id, assigned_by)
            SELECT $1, id, $2
            FROM admin_roles
            WHERE code = $3
            ON CONFLICT DO NOTHING
            "#,
            vec![
                admin_user_id.into(),
                assigned_by.into(),
                role_code.clone().into(),
            ],
        ))
        .await?;
    }

    Ok(())
}

async fn insert_admin_audit_log<C>(
    db: &C,
    actor_admin_user_id: i32,
    action: &str,
    resource_type: &str,
    resource_id: String,
) -> Result<(), ApiError>
where
    C: ConnectionTrait,
{
    db.execute(Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        INSERT INTO admin_actions (
            actor_user_id,
            actor_admin_user_id,
            action,
            resource_type,
            resource_id,
            reason
        )
        VALUES (1, $1, $2, $3, $4, $5)
        "#,
        vec![
            actor_admin_user_id.into(),
            action.to_owned().into(),
            resource_type.to_owned().into(),
            resource_id.into(),
            "admin_user.audit".to_owned().into(),
        ],
    ))
    .await?;

    Ok(())
}

const DIAGNOSTIC_LOG_PERMISSION: &str = "observability.diagnostic_log.manage";
const DIAGNOSTIC_LOG_DEFAULT_TTL_SECONDS: i32 = 900;
const DIAGNOSTIC_LOG_MAX_TTL_SECONDS: i32 = 3600;

fn diagnostic_log_rule_select_sql(sql: &str) -> String {
    sql.to_owned()
}

fn diagnostic_log_rule_from_row(row: QueryResult) -> Result<DiagnosticLogRuleSummary, DbErr> {
    Ok(DiagnosticLogRuleSummary {
        id: row.try_get("", "id")?,
        service: row.try_get("", "service")?,
        method: row.try_get("", "method")?,
        route: row.try_get("", "route")?,
        enabled: row.try_get("", "enabled")?,
        expires_at: row.try_get("", "expires_at")?,
        reason: row.try_get("", "reason")?,
        created_by_admin_user_id: row.try_get("", "created_by_admin_user_id")?,
        created_at: row.try_get("", "created_at")?,
        updated_at: row.try_get("", "updated_at")?,
        state: row.try_get("", "state")?,
    })
}

fn validate_diagnostic_service(value: &str) -> Result<String, ApiError> {
    let service = value.trim();
    validate_required(service, "service")?;
    if service != "user-api" {
        return Err(ApiError::bad_request("service must be user-api in v1"));
    }
    Ok(service.to_owned())
}

fn validate_diagnostic_method(value: &str) -> Result<String, ApiError> {
    let method = value.trim().to_uppercase();
    validate_required(&method, "method")?;
    match method.as_str() {
        "GET" | "POST" | "PUT" | "PATCH" | "DELETE" => Ok(method),
        _ => Err(ApiError::bad_request(
            "method must be GET, POST, PUT, PATCH, or DELETE",
        )),
    }
}

fn validate_diagnostic_route(value: &str) -> Result<String, ApiError> {
    let route = value.trim();
    validate_required(route, "route")?;
    if !route.starts_with('/') {
        return Err(ApiError::bad_request("route must start with /"));
    }
    if route.contains('?') || route.contains('#') || route.chars().any(char::is_whitespace) {
        return Err(ApiError::bad_request(
            "route must be a normalized Axum route without query string or whitespace",
        ));
    }
    Ok(route.to_owned())
}

fn validate_diagnostic_ttl(value: Option<i32>) -> Result<i32, ApiError> {
    let ttl = value.unwrap_or(DIAGNOSTIC_LOG_DEFAULT_TTL_SECONDS);
    if !(1..=DIAGNOSTIC_LOG_MAX_TTL_SECONDS).contains(&ttl) {
        return Err(ApiError::bad_request(format!(
            "ttl_seconds must be between 1 and {DIAGNOSTIC_LOG_MAX_TTL_SECONDS}"
        )));
    }
    Ok(ttl)
}

fn validate_diagnostic_reason(value: &str) -> Result<String, ApiError> {
    let reason = value.trim();
    validate_required(reason, "reason")?;
    Ok(reason.to_owned())
}

async fn record_diagnostic_rule_admin_change<C>(
    db: &C,
    actor_admin_user_id: i32,
    action: &str,
    rule_id: i32,
    reason: String,
) -> Result<(), ApiError>
where
    C: ConnectionTrait,
{
    insert_admin_action(
        db,
        None,
        None,
        LEGACY_PLATFORM_ACTOR_USER_ID,
        Some(actor_admin_user_id),
        action,
        "api_diagnostic_log_rule",
        rule_id.to_string(),
        reason,
    )
    .await?;
    insert_audit_log(
        db,
        None,
        None,
        LEGACY_PLATFORM_ACTOR_USER_ID,
        Some(actor_admin_user_id),
        action,
        "api_diagnostic_log_rule",
        rule_id.to_string(),
    )
    .await?;

    Ok(())
}

async fn ensure_cms_permission<C>(db: &C, actor_user_id: i32, action: &str) -> Result<(), ApiError>
where
    C: ConnectionTrait,
{
    let row = db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT role
            FROM users
            WHERE id = $1
              AND is_active = true
            "#,
            vec![actor_user_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::forbidden("actor is not an active CMS user"))?;
    let role: String = row.try_get("", "role")?;

    if cms_role_allows_action(&role, action) {
        Ok(())
    } else {
        Err(ApiError::forbidden(
            "actor role cannot perform this CMS action",
        ))
    }
}

fn cms_role_allows_action(role: &str, action: &str) -> bool {
    match role {
        "platform_admin" | "admin" => true,
        "platform_operator" => matches!(
            action,
            "trial_request.approve"
                | "dispute.resolve"
                | "report.resolve"
                | "listing.freeze"
                | "guild.freeze"
        ),
        "platform_support" => matches!(action, "dispute.resolve" | "report.resolve"),
        _ => false,
    }
}

fn unique_code(value: &str, id: i32) -> String {
    let mut slug = String::new();
    let mut last_dash = false;

    for ch in value.trim().to_lowercase().chars() {
        if ch.is_ascii_alphanumeric() {
            slug.push(ch);
            last_dash = false;
        } else if !last_dash {
            slug.push('-');
            last_dash = true;
        }
    }

    let trimmed = slug.trim_matches('-');
    let base = if trimmed.is_empty() { "guild" } else { trimmed };
    format!("{base}-{id}")
}

fn default_username(email: &str, id: i32) -> String {
    let local_part = email.split('@').next().unwrap_or("owner");
    unique_code(local_part, id)
}

#[derive(Debug)]
struct ApiError {
    status: StatusCode,
    message: String,
}

impl ApiError {
    fn bad_request(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::BAD_REQUEST,
            message: message.into(),
        }
    }

    fn unauthorized(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::UNAUTHORIZED,
            message: message.into(),
        }
    }

    fn forbidden(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::FORBIDDEN,
            message: message.into(),
        }
    }

    fn not_found(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::NOT_FOUND,
            message: message.into(),
        }
    }

    fn internal(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: message.into(),
        }
    }
}

impl From<DbErr> for ApiError {
    fn from(err: DbErr) -> Self {
        Self::internal(err.to_string())
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        #[derive(Serialize)]
        struct ErrorBody {
            error: String,
        }

        (
            self.status,
            Json(ErrorBody {
                error: self.message,
            }),
        )
            .into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unique_code_normalizes_ascii_names() {
        assert_eq!(unique_code("My Guild!!", 42), "my-guild-42");
        assert_eq!(unique_code("   ", 9), "guild-9");
    }

    #[test]
    fn default_username_uses_email_local_part() {
        assert_eq!(
            default_username("Leader.Name@example.com", 3),
            "leader-name-3"
        );
        assert_eq!(default_username("", 7), "guild-7");
    }
}
