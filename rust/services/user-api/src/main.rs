use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use sea_orm::{
    ConnectionTrait, Database, DatabaseConnection, DatabaseTransaction, DbBackend, DbErr,
    Statement, TransactionTrait,
};
use serde::{Deserialize, Serialize};
use std::{env, net::SocketAddr, sync::Arc};
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    db: Arc<DatabaseConnection>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| {
        "postgresql://gam_trade:gam_trade_secure_pass@localhost:5432/gam_trade_dev".into()
    });
    let db = Database::connect(database_url)
        .await
        .expect("failed to connect to database");

    let app = app(db);
    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    println!("user-api listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

fn app(db: DatabaseConnection) -> Router {
    let state = AppState { db: Arc::new(db) };

    Router::new()
        .route("/health", get(health))
        .route("/auth/login", post(login))
        .route("/trial-requests", post(create_trial_request))
        .route("/tenants/:tenant_id/listings", get(list_tenant_listings))
        .route("/listings/:listing_id", get(get_listing_detail))
        .route(
            "/guilds/:guild_id/invitations",
            post(create_guild_invitation),
        )
        .route(
            "/guild-invitations/:token/accept",
            post(accept_guild_invitation),
        )
        .route("/guilds/:guild_id/listings", post(create_listing))
        .route("/listings/:listing_id/approve", post(approve_listing))
        .route("/listings/:listing_id/bids", post(create_bid))
        .route("/listings/:listing_id/settle", post(settle_listing))
        .route("/listings/:listing_id/deposits", post(create_trade_deposit))
        .route("/trade-deposits/:deposit_id/hold", post(hold_trade_deposit))
        .route(
            "/trade-deposits/:deposit_id/release",
            post(release_trade_deposit),
        )
        .route(
            "/trade-deposits/:deposit_id/forfeit",
            post(forfeit_trade_deposit),
        )
        .route(
            "/guilds/:guild_id/warehouse/items",
            post(create_warehouse_item),
        )
        .route(
            "/warehouse/items/:warehouse_item_id/list",
            post(create_listing_from_warehouse),
        )
        .route(
            "/tenants/:tenant_id/guilds/:guild_id/warehouse/listed",
            get(list_guild_listed_items),
        )
        .route(
            "/tenants/:tenant_id/guilds/:guild_id/warehouse/items",
            get(list_guild_warehouse_items),
        )
        .route(
            "/tenants/:tenant_id/guilds/:guild_id/treasury/accounts",
            get(list_guild_treasury_accounts),
        )
        .route(
            "/tenants/:tenant_id/guilds/:guild_id/treasury/ledger",
            get(list_guild_treasury_ledger),
        )
        .route(
            "/guilds/:guild_id/procurement-orders",
            post(create_procurement_order),
        )
        .route(
            "/procurement-orders/:order_id/approve",
            post(approve_procurement_order),
        )
        .route(
            "/procurement-orders/:order_id/accept",
            post(accept_procurement_order),
        )
        .route(
            "/procurement-orders/:order_id/deliver",
            post(deliver_procurement_order),
        )
        .route(
            "/procurement-orders/:order_id/complete",
            post(complete_procurement_order),
        )
        .route("/guilds/:guild_id/lotteries", post(create_lottery))
        .route("/lotteries/:lottery_id/approve", post(approve_lottery))
        .route("/lotteries/:lottery_id/entries", post(enter_lottery))
        .route("/lotteries/:lottery_id/draw", post(draw_lottery))
        .route(
            "/listings/:listing_id/disputes",
            post(create_listing_dispute),
        )
        .route(
            "/disputes/:dispute_id/messages",
            post(create_dispute_message),
        )
        .route("/reports", post(create_report))
        .with_state(state)
}

async fn health() -> &'static str {
    "OK"
}

#[derive(Debug, Deserialize)]
struct CreateTrialRequest {
    applicant_email: String,
    applicant_name: Option<String>,
    tenant_name: String,
    guild_name: String,
}

#[derive(Debug, Serialize)]
struct TrialRequestResponse {
    id: i32,
    status: String,
}

#[derive(Debug, Deserialize)]
struct LoginRequest {
    username_or_email: String,
    password_hash: Option<String>,
}

#[derive(Debug, Serialize)]
struct LoginResponse {
    user_id: i32,
    username: String,
    email: String,
    role: String,
    tenant_id: Option<i32>,
    guild_id: Option<i32>,
}

async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, ApiError> {
    validate_required(&payload.username_or_email, "username_or_email")?;
    let principal = payload.username_or_email.trim().to_lowercase();

    let user = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT id, username, email, password_hash, role, tenant_id, guild_id
            FROM users
            WHERE (LOWER(username) = $1 OR LOWER(email) = $1)
              AND is_active = true
              AND frozen_at IS NULL
            LIMIT 1
            "#,
            vec![principal.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::not_found("user not found"))?;

    if let Some(password_hash) = payload.password_hash {
        let stored_password_hash: String = user.try_get("", "password_hash")?;
        if stored_password_hash != password_hash {
            return Err(ApiError::forbidden("invalid credentials"));
        }
    }

    let user_id: i32 = user.try_get("", "id")?;
    state
        .db
        .execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE users
            SET last_login_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            "#,
            vec![user_id.into()],
        ))
        .await?;

    Ok(Json(LoginResponse {
        user_id,
        username: user.try_get("", "username")?,
        email: user.try_get("", "email")?,
        role: user.try_get("", "role")?,
        tenant_id: user.try_get("", "tenant_id")?,
        guild_id: user.try_get("", "guild_id")?,
    }))
}

async fn create_trial_request(
    State(state): State<AppState>,
    Json(payload): Json<CreateTrialRequest>,
) -> Result<(StatusCode, Json<TrialRequestResponse>), ApiError> {
    validate_required(&payload.applicant_email, "applicant_email")?;
    validate_required(&payload.tenant_name, "tenant_name")?;
    validate_required(&payload.guild_name, "guild_name")?;

    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO trial_requests (
                applicant_email,
                applicant_name,
                tenant_name,
                guild_name
            )
            VALUES ($1, $2, $3, $4)
            RETURNING id, status
            "#,
            vec![
                payload.applicant_email.trim().to_lowercase().into(),
                payload
                    .applicant_name
                    .unwrap_or_default()
                    .trim()
                    .to_owned()
                    .into(),
                payload.tenant_name.trim().to_owned().into(),
                payload.guild_name.trim().to_owned().into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("trial request insert returned no row"))?;

    Ok((
        StatusCode::CREATED,
        Json(TrialRequestResponse {
            id: row.try_get("", "id")?,
            status: row.try_get("", "status")?,
        }),
    ))
}

#[derive(Debug, Deserialize)]
struct CreateGuildInvitation {
    tenant_id: i32,
    email: String,
    role_code: Option<String>,
    invited_by: i32,
    expires_hours: Option<i64>,
}

#[derive(Debug, Serialize)]
struct GuildInvitationResponse {
    id: i32,
    invite_token: String,
    status: String,
}

async fn create_guild_invitation(
    State(state): State<AppState>,
    Path(guild_id): Path<i32>,
    Json(payload): Json<CreateGuildInvitation>,
) -> Result<(StatusCode, Json<GuildInvitationResponse>), ApiError> {
    validate_required(&payload.email, "email")?;
    ensure_user_permission(
        state.db.as_ref(),
        payload.tenant_id,
        Some(guild_id),
        payload.invited_by,
        "member:invite",
    )
    .await?;

    let role_code = payload.role_code.unwrap_or_else(|| "guild_member".into());
    let invite_token = Uuid::new_v4().to_string();
    let expires_hours = payload.expires_hours.unwrap_or(72).clamp(1, 720);

    let subscription = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT seat_limit, seats_used
            FROM subscriptions
            WHERE tenant_id = $1
              AND guild_id = $2
              AND status = 'active'
            ORDER BY started_at DESC
            LIMIT 1
            "#,
            vec![payload.tenant_id.into(), guild_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::bad_request("active subscription not found"))?;

    let seat_limit: i32 = subscription.try_get("", "seat_limit")?;
    let seats_used: i32 = subscription.try_get("", "seats_used")?;
    if seats_used >= seat_limit {
        return Err(ApiError::bad_request("seat limit reached"));
    }

    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO guild_invitations (
                tenant_id,
                guild_id,
                email,
                role_code,
                invite_token,
                invited_by,
                expires_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP + ($7::text || ' hours')::interval)
            RETURNING id, invite_token
            "#,
            vec![
                payload.tenant_id.into(),
                guild_id.into(),
                payload.email.trim().to_lowercase().into(),
                role_code.into(),
                invite_token.into(),
                payload.invited_by.into(),
                expires_hours.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("guild invitation insert returned no row"))?;

    Ok((
        StatusCode::CREATED,
        Json(GuildInvitationResponse {
            id: row.try_get("", "id")?,
            invite_token: row.try_get("", "invite_token")?,
            status: "pending".into(),
        }),
    ))
}

#[derive(Debug, Deserialize)]
struct AcceptGuildInvitation {
    username: String,
    password_hash: String,
}

#[derive(Debug, Serialize)]
struct AcceptInvitationResponse {
    user_id: i32,
    guild_member_id: i32,
    guild_id: i32,
}

async fn accept_guild_invitation(
    State(state): State<AppState>,
    Path(token): Path<String>,
    Json(payload): Json<AcceptGuildInvitation>,
) -> Result<Json<AcceptInvitationResponse>, ApiError> {
    validate_required(&payload.username, "username")?;
    validate_required(&payload.password_hash, "password_hash")?;

    let tx = state.db.begin().await?;
    let invitation = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT id, tenant_id, guild_id, email, role_code, invited_by
            FROM guild_invitations
            WHERE invite_token = $1
              AND accepted_at IS NULL
              AND expires_at > CURRENT_TIMESTAMP
            "#,
            vec![token.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::bad_request("invitation is invalid or expired"))?;

    let invitation_id: i32 = invitation.try_get("", "id")?;
    let tenant_id: i32 = invitation.try_get("", "tenant_id")?;
    let guild_id: i32 = invitation.try_get("", "guild_id")?;
    let email: String = invitation.try_get("", "email")?;
    let role_code: String = invitation.try_get("", "role_code")?;
    let invited_by: i32 = invitation.try_get("", "invited_by")?;

    let subscription = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT id, seat_limit, seats_used
            FROM subscriptions
            WHERE tenant_id = $1
              AND guild_id = $2
              AND status = 'active'
            ORDER BY started_at DESC
            LIMIT 1
            FOR UPDATE
            "#,
            vec![tenant_id.into(), guild_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::bad_request("active subscription not found"))?;

    let subscription_id: i32 = subscription.try_get("", "id")?;
    let seat_limit: i32 = subscription.try_get("", "seat_limit")?;
    let seats_used: i32 = subscription.try_get("", "seats_used")?;
    if seats_used >= seat_limit {
        return Err(ApiError::bad_request("seat limit reached"));
    }

    let user = tx
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
                must_reset_password,
                invited_by
            )
            VALUES ($1, $2, $3, 'guild_member', $4, $5, true, $6)
            RETURNING id
            "#,
            vec![
                payload.username.trim().to_owned().into(),
                email.into(),
                payload.password_hash.into(),
                tenant_id.into(),
                guild_id.into(),
                invited_by.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("user insert returned no row"))?;

    let user_id: i32 = user.try_get("", "id")?;
    let member = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO guild_members (tenant_id, guild_id, user_id, invited_by)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            "#,
            vec![
                tenant_id.into(),
                guild_id.into(),
                user_id.into(),
                invited_by.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("guild member insert returned no row"))?;
    let guild_member_id: i32 = member.try_get("", "id")?;

    assign_member_role(
        &tx,
        tenant_id,
        guild_id,
        guild_member_id,
        &role_code,
        invited_by,
    )
    .await?;

    tx.execute(Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        UPDATE guild_invitations
        SET accepted_at = CURRENT_TIMESTAMP
        WHERE id = $1
        "#,
        vec![invitation_id.into()],
    ))
    .await?;

    tx.execute(Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        UPDATE subscriptions
        SET seats_used = seats_used + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        "#,
        vec![subscription_id.into()],
    ))
    .await?;

    tx.commit().await?;

    Ok(Json(AcceptInvitationResponse {
        user_id,
        guild_member_id,
        guild_id,
    }))
}

#[derive(Debug, Deserialize)]
struct CreateListing {
    tenant_id: i32,
    seller_user_id: i32,
    title: String,
    description: Option<String>,
    mode: String,
    visibility: String,
    game_id: Option<i32>,
    currency_id: Option<i32>,
    start_price: Option<String>,
    buyout_price: Option<String>,
}

#[derive(Debug, Serialize)]
struct ListingResponse {
    id: i32,
    status: String,
}

#[derive(Debug, Deserialize)]
struct ApproveListing {
    tenant_id: i32,
    approved_by: i32,
}

#[derive(Debug, Serialize)]
struct ApproveListingResponse {
    id: i32,
    status: String,
    approved_by: i32,
}

#[derive(Debug, Deserialize)]
struct CreateBid {
    tenant_id: i32,
    bidder_user_id: i32,
    bidder_guild_id: Option<i32>,
    currency_id: i32,
    amount: String,
}

#[derive(Debug, Serialize)]
struct BidResponse {
    id: i32,
    status: String,
}

#[derive(Debug, Deserialize)]
struct ListingQuery {
    guild_id: Option<i32>,
    status: Option<String>,
}

#[derive(Debug, Serialize)]
struct ListingMarketSummary {
    id: i32,
    tenant_id: i32,
    guild_id: i32,
    seller_user_id: i32,
    title: String,
    description: String,
    mode: String,
    visibility: String,
    status: String,
    currency_id: Option<i32>,
    start_price: Option<String>,
    buyout_price: Option<String>,
    bid_count: i64,
    top_bid_amount: Option<String>,
    matched_buyer_user_id: Option<i32>,
    created_at: String,
}

#[derive(Debug, Serialize)]
struct ListingBidSummary {
    id: i32,
    bidder_user_id: i32,
    bidder_guild_id: Option<i32>,
    currency_id: i32,
    amount: String,
    status: String,
    placed_at: String,
}

#[derive(Debug, Serialize)]
struct ListingDetailResponse {
    listing: ListingMarketSummary,
    bids: Vec<ListingBidSummary>,
}

#[derive(Debug, Deserialize)]
struct SettleListing {
    tenant_id: i32,
    completed_by: i32,
    winning_bid_id: Option<i32>,
    guild_donation_amount: Option<String>,
}

#[derive(Debug, Serialize)]
struct SettlementResponse {
    listing_id: i32,
    settlement_id: i32,
    winning_bid_id: i32,
    status: String,
}

#[derive(Debug, Deserialize)]
struct CreateTradeDeposit {
    tenant_id: i32,
    guild_id: i32,
    user_id: i32,
    role: String,
    currency_id: i32,
    amount: String,
    bid_id: Option<i32>,
}

#[derive(Debug, Deserialize)]
struct HandleTradeDeposit {
    tenant_id: i32,
    handled_by: i32,
    reason: Option<String>,
}

#[derive(Debug, Serialize)]
struct TradeDepositResponse {
    id: i32,
    status: String,
}

#[derive(Debug, Deserialize)]
struct CreateWarehouseItem {
    tenant_id: i32,
    game_id: i32,
    game_item_id: Option<i32>,
    item_name: String,
    quantity: i32,
    custodian_user_id: Option<i32>,
    source_type: Option<String>,
    source_id: Option<String>,
    created_by: i32,
}

#[derive(Debug, Serialize)]
struct WarehouseItemResponse {
    id: i32,
    status: String,
}

#[derive(Debug, Deserialize)]
struct CreateListingFromWarehouse {
    tenant_id: i32,
    seller_user_id: i32,
    title: String,
    description: Option<String>,
    mode: String,
    visibility: String,
    currency_id: i32,
    start_price: Option<String>,
    buyout_price: Option<String>,
}

#[derive(Debug, Serialize)]
struct ListedWarehouseItem {
    warehouse_item_id: i32,
    listing_id: i32,
    item_name: String,
    quantity: i32,
    listing_status: String,
    title: String,
}

#[derive(Debug, Serialize)]
struct GuildWarehouseItemSummary {
    id: i32,
    game_id: i32,
    item_name: String,
    quantity: i32,
    status: String,
    custodian_user_id: Option<i32>,
    source_type: Option<String>,
    source_id: Option<String>,
}

#[derive(Debug, Serialize)]
struct GuildTreasuryAccountSummary {
    id: i32,
    currency_id: i32,
    balance: String,
    held_balance: String,
}

#[derive(Debug, Serialize)]
struct GuildTreasuryLedgerEntrySummary {
    id: i32,
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

#[derive(Debug, Deserialize)]
struct ActorQuery {
    actor_user_id: i32,
}

#[derive(Debug, Deserialize)]
struct ProcurementOrderItemInput {
    game_item_id: Option<i32>,
    item_name: String,
    quantity: i32,
    unit_budget_amount: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CreateProcurementOrder {
    tenant_id: i32,
    requester_user_id: i32,
    game_id: Option<i32>,
    currency_id: Option<i32>,
    title: String,
    description: Option<String>,
    order_type: Option<String>,
    visibility: Option<String>,
    budget_amount: Option<String>,
    supplier_deposit_amount: Option<String>,
    guild_donation_amount: Option<String>,
    items: Vec<ProcurementOrderItemInput>,
}

#[derive(Debug, Serialize)]
struct ProcurementOrderResponse {
    id: i32,
    status: String,
}

#[derive(Debug, Deserialize)]
struct ApproveProcurementOrder {
    tenant_id: i32,
    approved_by: i32,
}

#[derive(Debug, Deserialize)]
struct AcceptProcurementOrder {
    tenant_id: i32,
    supplier_user_id: i32,
    supplier_guild_id: Option<i32>,
}

#[derive(Debug, Deserialize)]
struct DeliverProcurementOrder {
    tenant_id: i32,
    supplier_user_id: i32,
}

#[derive(Debug, Deserialize)]
struct CompleteProcurementOrder {
    tenant_id: i32,
    completed_by: i32,
}

#[derive(Debug, Deserialize)]
struct LotteryPrizeInput {
    warehouse_item_id: Option<i32>,
    game_item_id: Option<i32>,
    currency_id: Option<i32>,
    prize_name: String,
    quantity: Option<i32>,
    amount: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CreateLottery {
    tenant_id: i32,
    game_id: Option<i32>,
    title: String,
    description: Option<String>,
    lottery_type: Option<String>,
    entry_limit_per_user: Option<i32>,
    starts_at: Option<String>,
    ends_at: Option<String>,
    created_by: i32,
    prizes: Vec<LotteryPrizeInput>,
}

#[derive(Debug, Serialize)]
struct LotteryResponse {
    id: i32,
    status: String,
}

#[derive(Debug, Deserialize)]
struct ApproveLottery {
    tenant_id: i32,
    approved_by: i32,
}

#[derive(Debug, Deserialize)]
struct EnterLottery {
    tenant_id: i32,
    user_id: i32,
    guild_id: Option<i32>,
    source_type: Option<String>,
    source_id: Option<String>,
    entry_count: Option<i32>,
}

#[derive(Debug, Serialize)]
struct LotteryEntryResponse {
    id: i32,
    entry_count: i32,
}

#[derive(Debug, Deserialize)]
struct DrawLottery {
    tenant_id: i32,
    drawn_by: i32,
}

#[derive(Debug, Serialize)]
struct LotteryDrawResultResponse {
    result_id: i32,
    prize_id: i32,
    winner_user_id: i32,
}

#[derive(Debug, Deserialize)]
struct CreateListingDispute {
    tenant_id: i32,
    guild_id: Option<i32>,
    opened_by: i32,
    reason: String,
    description: String,
}

#[derive(Debug, Serialize)]
struct DisputeResponse {
    id: i32,
    status: String,
}

#[derive(Debug, Deserialize)]
struct CreateDisputeMessage {
    tenant_id: i32,
    user_id: i32,
    content: String,
    is_internal_note: Option<bool>,
}

#[derive(Debug, Serialize)]
struct DisputeMessageResponse {
    id: i32,
}

#[derive(Debug, Deserialize)]
struct CreateReport {
    tenant_id: Option<i32>,
    guild_id: Option<i32>,
    reporter_user_id: i32,
    reported_user_id: Option<i32>,
    resource_type: String,
    resource_id: Option<String>,
    reason: String,
    description: String,
}

#[derive(Debug, Serialize)]
struct ReportResponse {
    id: i32,
    status: String,
}

async fn create_listing(
    State(state): State<AppState>,
    Path(guild_id): Path<i32>,
    Json(payload): Json<CreateListing>,
) -> Result<(StatusCode, Json<ListingResponse>), ApiError> {
    validate_required(&payload.title, "title")?;
    validate_listing_mode(&payload.mode)?;
    validate_listing_visibility(&payload.visibility)?;
    ensure_user_permission(
        state.db.as_ref(),
        payload.tenant_id,
        Some(guild_id),
        payload.seller_user_id,
        "listing:create",
    )
    .await?;

    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO listings (
                tenant_id,
                guild_id,
                seller_user_id,
                title,
                description,
                mode,
                visibility,
                status,
                game_id,
                currency_id,
                start_price,
                buyout_price
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9, $10::decimal, $11::decimal)
            RETURNING id, status
            "#,
            vec![
                payload.tenant_id.into(),
                guild_id.into(),
                payload.seller_user_id.into(),
                payload.title.trim().to_owned().into(),
                payload.description.unwrap_or_default().into(),
                payload.mode.into(),
                payload.visibility.into(),
                payload.game_id.into(),
                payload.currency_id.into(),
                payload.start_price.clone().into(),
                payload.buyout_price.clone().into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("listing insert returned no row"))?;

    Ok((
        StatusCode::CREATED,
        Json(ListingResponse {
            id: row.try_get("", "id")?,
            status: row.try_get("", "status")?,
        }),
    ))
}

async fn approve_listing(
    State(state): State<AppState>,
    Path(listing_id): Path<i32>,
    Json(payload): Json<ApproveListing>,
) -> Result<Json<ApproveListingResponse>, ApiError> {
    ensure_user_permission(
        state.db.as_ref(),
        payload.tenant_id,
        None,
        payload.approved_by,
        "listing:approve",
    )
    .await?;

    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE listings
            SET status = 'active',
                approved_by = $1,
                approved_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
              AND tenant_id = $3
              AND status IN ('draft', 'pending_approval')
            RETURNING id, status, approved_by
            "#,
            vec![
                payload.approved_by.into(),
                listing_id.into(),
                payload.tenant_id.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::bad_request("listing is not approvable"))?;

    insert_audit_log(
        state.db.as_ref(),
        Some(payload.tenant_id),
        None,
        payload.approved_by,
        "listing.approve",
        "listing",
        listing_id.to_string(),
    )
    .await?;

    Ok(Json(ApproveListingResponse {
        id: row.try_get("", "id")?,
        status: row.try_get("", "status")?,
        approved_by: row.try_get("", "approved_by")?,
    }))
}

async fn list_tenant_listings(
    State(state): State<AppState>,
    Path(tenant_id): Path<i32>,
    Query(query): Query<ListingQuery>,
) -> Result<Json<Vec<ListingMarketSummary>>, ApiError> {
    let rows = state
        .db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT
                l.id,
                l.tenant_id,
                l.guild_id,
                l.seller_user_id,
                l.title,
                COALESCE(l.description, '') AS description,
                l.mode,
                l.visibility,
                l.status,
                l.currency_id,
                l.start_price::text AS start_price,
                l.buyout_price::text AS buyout_price,
                COALESCE(COUNT(b.id), 0)::bigint AS bid_count,
                MAX(b.amount)::text AS top_bid_amount,
                l.matched_buyer_user_id,
                l.created_at::text AS created_at
            FROM listings l
            LEFT JOIN listing_bids b
              ON b.listing_id = l.id
             AND b.status = 'active'
            WHERE l.tenant_id = $1
              AND ($2::integer IS NULL OR l.guild_id = $2)
              AND ($3::text IS NULL OR l.status = $3)
            GROUP BY l.id
            ORDER BY l.created_at DESC
            LIMIT 100
            "#,
            vec![
                tenant_id.into(),
                query.guild_id.into(),
                query.status.map(|status| status.trim().to_owned()).into(),
            ],
        ))
        .await?;

    Ok(Json(
        rows.into_iter()
            .map(listing_market_summary_from_row)
            .collect::<Result<Vec<_>, DbErr>>()?,
    ))
}

async fn get_listing_detail(
    State(state): State<AppState>,
    Path(listing_id): Path<i32>,
) -> Result<Json<ListingDetailResponse>, ApiError> {
    let listing_row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT
                l.id,
                l.tenant_id,
                l.guild_id,
                l.seller_user_id,
                l.title,
                COALESCE(l.description, '') AS description,
                l.mode,
                l.visibility,
                l.status,
                l.currency_id,
                l.start_price::text AS start_price,
                l.buyout_price::text AS buyout_price,
                COALESCE(COUNT(b.id), 0)::bigint AS bid_count,
                MAX(b.amount)::text AS top_bid_amount,
                l.matched_buyer_user_id,
                l.created_at::text AS created_at
            FROM listings l
            LEFT JOIN listing_bids b
              ON b.listing_id = l.id
             AND b.status = 'active'
            WHERE l.id = $1
            GROUP BY l.id
            "#,
            vec![listing_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::not_found("listing not found"))?;

    let bid_rows = state
        .db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT
                id,
                bidder_user_id,
                bidder_guild_id,
                currency_id,
                amount::text AS amount,
                status,
                placed_at::text AS placed_at
            FROM listing_bids
            WHERE listing_id = $1
            ORDER BY amount DESC, placed_at ASC
            "#,
            vec![listing_id.into()],
        ))
        .await?;

    let bids = bid_rows
        .into_iter()
        .map(|row| {
            Ok(ListingBidSummary {
                id: row.try_get("", "id")?,
                bidder_user_id: row.try_get("", "bidder_user_id")?,
                bidder_guild_id: row.try_get("", "bidder_guild_id")?,
                currency_id: row.try_get("", "currency_id")?,
                amount: row.try_get("", "amount")?,
                status: row.try_get("", "status")?,
                placed_at: row.try_get("", "placed_at")?,
            })
        })
        .collect::<Result<Vec<_>, DbErr>>()?;

    Ok(Json(ListingDetailResponse {
        listing: listing_market_summary_from_row(listing_row)?,
        bids,
    }))
}

async fn create_bid(
    State(state): State<AppState>,
    Path(listing_id): Path<i32>,
    Json(payload): Json<CreateBid>,
) -> Result<(StatusCode, Json<BidResponse>), ApiError> {
    validate_required(&payload.amount, "amount")?;
    ensure_user_permission(
        state.db.as_ref(),
        payload.tenant_id,
        payload.bidder_guild_id,
        payload.bidder_user_id,
        "listing:bid",
    )
    .await?;

    let listing = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT id, tenant_id, guild_id, alliance_id, visibility, status, start_price, currency_id
            FROM listings
            WHERE id = $1
              AND tenant_id = $2
            "#,
            vec![listing_id.into(), payload.tenant_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::not_found("listing not found"))?;

    let listing_status: String = listing.try_get("", "status")?;
    if listing_status != "active" && listing_status != "bidding" {
        return Err(ApiError::bad_request("listing is not open for bids"));
    }

    let listing_currency_id: Option<i32> = listing.try_get("", "currency_id")?;
    if let Some(listing_currency_id) = listing_currency_id {
        if listing_currency_id != payload.currency_id {
            return Err(ApiError::bad_request("bid currency does not match listing"));
        }
    }

    ensure_bid_eligibility(state.db.as_ref(), &listing, &payload).await?;

    let current_max = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT amount
            FROM listing_bids
            WHERE listing_id = $1
              AND status = 'active'
            ORDER BY amount DESC, placed_at ASC
            LIMIT 1
            "#,
            vec![listing_id.into()],
        ))
        .await?;

    if let Some(current_max) = current_max {
        let is_higher = state
            .db
            .query_one(Statement::from_sql_and_values(
                DbBackend::Postgres,
                r#"
                SELECT ($1::decimal > $2::decimal) AS ok
                "#,
                vec![
                    payload.amount.clone().into(),
                    current_max.try_get::<String>("", "amount")?.into(),
                ],
            ))
            .await?
            .ok_or_else(|| ApiError::internal("bid comparison returned no row"))?;
        let ok: bool = is_higher.try_get("", "ok")?;
        if !ok {
            return Err(ApiError::bad_request(
                "bid must be higher than current max bid",
            ));
        }
    }

    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO listing_bids (
                tenant_id,
                listing_id,
                bidder_user_id,
                bidder_guild_id,
                currency_id,
                amount
            )
            VALUES ($1, $2, $3, $4, $5, $6::decimal)
            RETURNING id, status
            "#,
            vec![
                payload.tenant_id.into(),
                listing_id.into(),
                payload.bidder_user_id.into(),
                payload.bidder_guild_id.into(),
                payload.currency_id.into(),
                payload.amount.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("bid insert returned no row"))?;

    state
        .db
        .execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE listings
            SET status = 'bidding',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND status = 'active'
            "#,
            vec![listing_id.into()],
        ))
        .await?;

    Ok((
        StatusCode::CREATED,
        Json(BidResponse {
            id: row.try_get("", "id")?,
            status: row.try_get("", "status")?,
        }),
    ))
}

async fn settle_listing(
    State(state): State<AppState>,
    Path(listing_id): Path<i32>,
    Json(payload): Json<SettleListing>,
) -> Result<Json<SettlementResponse>, ApiError> {
    validate_optional_amount(&payload.guild_donation_amount)?;
    ensure_user_permission(
        state.db.as_ref(),
        payload.tenant_id,
        None,
        payload.completed_by,
        "settlement:approve",
    )
    .await?;

    let tx = state.db.begin().await?;
    let listing = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT id, tenant_id, guild_id, game_id, seller_user_id, status
            FROM listings
            WHERE id = $1
              AND tenant_id = $2
            FOR UPDATE
            "#,
            vec![listing_id.into(), payload.tenant_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::not_found("listing not found"))?;

    let listing_status: String = listing.try_get("", "status")?;
    if listing_status != "bidding" && listing_status != "ended" && listing_status != "matched" {
        return Err(ApiError::bad_request("listing is not settleable"));
    }

    let winning_bid = select_winning_bid(&tx, listing_id, payload.winning_bid_id).await?;
    let winning_bid_id: i32 = winning_bid.try_get("", "id")?;
    let buyer_user_id: i32 = winning_bid.try_get("", "bidder_user_id")?;
    let currency_id: i32 = winning_bid.try_get("", "currency_id")?;
    let total_amount: String = winning_bid.try_get("", "amount")?;
    let tenant_id: i32 = listing.try_get("", "tenant_id")?;
    let guild_id: i32 = listing.try_get("", "guild_id")?;
    let game_id: Option<i32> = listing.try_get("", "game_id")?;
    let seller_user_id: i32 = listing.try_get("", "seller_user_id")?;
    let donation_amount = payload.guild_donation_amount.unwrap_or_else(|| "0".into());
    ensure_amount_not_greater(&tx, &donation_amount, &total_amount).await?;

    let settlement = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO trade_settlements (
                tenant_id,
                guild_id,
                listing_id,
                game_id,
                currency_id,
                total_amount,
                status,
                completed_by,
                completed_at,
                settled_at
            )
            VALUES ($1, $2, $3, $4, $5, $6::decimal, 'settled', $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
            "#,
            vec![
                tenant_id.into(),
                guild_id.into(),
                listing_id.into(),
                game_id.into(),
                currency_id.into(),
                total_amount.clone().into(),
                payload.completed_by.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("settlement insert returned no row"))?;
    let settlement_id: i32 = settlement.try_get("", "id")?;

    let seller_amount = subtract_amount(&tx, &total_amount, &donation_amount).await?;
    insert_settlement_recipient(
        &tx,
        settlement_id,
        Some(seller_user_id),
        "seller",
        currency_id,
        "100",
        &seller_amount,
        None,
    )
    .await?;

    if is_positive_amount(&tx, &donation_amount).await? {
        insert_settlement_recipient(
            &tx,
            settlement_id,
            None,
            "guild_treasury",
            currency_id,
            "0",
            &donation_amount,
            Some(guild_id),
        )
        .await?;
        write_treasury_ledger(
            &tx,
            tenant_id,
            guild_id,
            currency_id,
            "donation",
            &donation_amount,
            "settlement",
            settlement_id.to_string(),
            payload.completed_by,
        )
        .await?;
    }

    tx.execute(Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        UPDATE listings
        SET status = 'settled',
            matched_bid_id = $1,
            matched_buyer_user_id = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        "#,
        vec![
            winning_bid_id.into(),
            buyer_user_id.into(),
            listing_id.into(),
        ],
    ))
    .await?;

    insert_audit_log_tx(
        &tx,
        Some(tenant_id),
        Some(guild_id),
        payload.completed_by,
        "listing.settle",
        "listing",
        listing_id.to_string(),
    )
    .await?;

    tx.commit().await?;

    Ok(Json(SettlementResponse {
        listing_id,
        settlement_id,
        winning_bid_id,
        status: "settled".into(),
    }))
}

async fn create_trade_deposit(
    State(state): State<AppState>,
    Path(listing_id): Path<i32>,
    Json(payload): Json<CreateTradeDeposit>,
) -> Result<(StatusCode, Json<TradeDepositResponse>), ApiError> {
    validate_required(&payload.amount, "amount")?;
    ensure_user_permission(
        state.db.as_ref(),
        payload.tenant_id,
        Some(payload.guild_id),
        payload.user_id,
        "listing:bid",
    )
    .await?;

    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO trade_deposits (
                tenant_id,
                guild_id,
                listing_id,
                bid_id,
                user_id,
                role,
                currency_id,
                amount
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::decimal)
            RETURNING id, status
            "#,
            vec![
                payload.tenant_id.into(),
                payload.guild_id.into(),
                listing_id.into(),
                payload.bid_id.into(),
                payload.user_id.into(),
                payload.role.into(),
                payload.currency_id.into(),
                payload.amount.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("deposit insert returned no row"))?;

    Ok((
        StatusCode::CREATED,
        Json(TradeDepositResponse {
            id: row.try_get("", "id")?,
            status: row.try_get("", "status")?,
        }),
    ))
}

async fn hold_trade_deposit(
    State(state): State<AppState>,
    Path(deposit_id): Path<i32>,
    Json(payload): Json<HandleTradeDeposit>,
) -> Result<Json<TradeDepositResponse>, ApiError> {
    update_trade_deposit_status(
        state.db.as_ref(),
        deposit_id,
        payload.tenant_id,
        payload.handled_by,
        "required",
        "held",
        "held_at",
        payload.reason,
    )
    .await
}

async fn release_trade_deposit(
    State(state): State<AppState>,
    Path(deposit_id): Path<i32>,
    Json(payload): Json<HandleTradeDeposit>,
) -> Result<Json<TradeDepositResponse>, ApiError> {
    update_trade_deposit_status(
        state.db.as_ref(),
        deposit_id,
        payload.tenant_id,
        payload.handled_by,
        "held",
        "released",
        "released_at",
        payload.reason,
    )
    .await
}

async fn forfeit_trade_deposit(
    State(state): State<AppState>,
    Path(deposit_id): Path<i32>,
    Json(payload): Json<HandleTradeDeposit>,
) -> Result<Json<TradeDepositResponse>, ApiError> {
    ensure_user_permission(
        state.db.as_ref(),
        payload.tenant_id,
        None,
        payload.handled_by,
        "deposit:manage",
    )
    .await?;

    let tx = state.db.begin().await?;
    let deposit = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT id, tenant_id, guild_id, currency_id, amount, status
            FROM trade_deposits
            WHERE id = $1
              AND tenant_id = $2
            FOR UPDATE
            "#,
            vec![deposit_id.into(), payload.tenant_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::not_found("deposit not found"))?;
    let status: String = deposit.try_get("", "status")?;
    if status != "held" {
        return Err(ApiError::bad_request("deposit is not held"));
    }

    let tenant_id: i32 = deposit.try_get("", "tenant_id")?;
    let guild_id: i32 = deposit.try_get("", "guild_id")?;
    let currency_id: i32 = deposit.try_get("", "currency_id")?;
    let amount: String = deposit.try_get("", "amount")?;
    let reason = payload.reason.unwrap_or_else(|| "deposit forfeited".into());

    let row = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE trade_deposits
            SET status = 'forfeited',
                forfeited_at = CURRENT_TIMESTAMP,
                handled_by = $1,
                reason = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING id, status
            "#,
            vec![payload.handled_by.into(), reason.into(), deposit_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("deposit update returned no row"))?;

    write_treasury_ledger(
        &tx,
        tenant_id,
        guild_id,
        currency_id,
        "deposit_forfeit",
        &amount,
        "trade_deposit",
        deposit_id.to_string(),
        payload.handled_by,
    )
    .await?;
    insert_audit_log_tx(
        &tx,
        Some(tenant_id),
        Some(guild_id),
        payload.handled_by,
        "deposit.forfeit",
        "trade_deposit",
        deposit_id.to_string(),
    )
    .await?;

    tx.commit().await?;

    Ok(Json(TradeDepositResponse {
        id: row.try_get("", "id")?,
        status: row.try_get("", "status")?,
    }))
}

async fn create_warehouse_item(
    State(state): State<AppState>,
    Path(guild_id): Path<i32>,
    Json(payload): Json<CreateWarehouseItem>,
) -> Result<(StatusCode, Json<WarehouseItemResponse>), ApiError> {
    validate_required(&payload.item_name, "item_name")?;
    if payload.quantity <= 0 {
        return Err(ApiError::bad_request("quantity must be positive"));
    }
    ensure_user_permission(
        state.db.as_ref(),
        payload.tenant_id,
        Some(guild_id),
        payload.created_by,
        "warehouse:manage",
    )
    .await?;

    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO guild_warehouse_items (
                tenant_id,
                guild_id,
                game_id,
                game_item_id,
                item_name,
                quantity,
                custodian_user_id,
                source_type,
                source_id,
                created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, status
            "#,
            vec![
                payload.tenant_id.into(),
                guild_id.into(),
                payload.game_id.into(),
                payload.game_item_id.into(),
                payload.item_name.into(),
                payload.quantity.into(),
                payload.custodian_user_id.into(),
                payload.source_type.into(),
                payload.source_id.into(),
                payload.created_by.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("warehouse item insert returned no row"))?;

    Ok((
        StatusCode::CREATED,
        Json(WarehouseItemResponse {
            id: row.try_get("", "id")?,
            status: row.try_get("", "status")?,
        }),
    ))
}

async fn create_listing_from_warehouse(
    State(state): State<AppState>,
    Path(warehouse_item_id): Path<i32>,
    Json(payload): Json<CreateListingFromWarehouse>,
) -> Result<(StatusCode, Json<ListingResponse>), ApiError> {
    validate_required(&payload.title, "title")?;
    validate_listing_mode(&payload.mode)?;
    validate_listing_visibility(&payload.visibility)?;

    let tx = state.db.begin().await?;
    let item = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT id, tenant_id, guild_id, game_id, item_name, quantity, status
            FROM guild_warehouse_items
            WHERE id = $1
              AND tenant_id = $2
            FOR UPDATE
            "#,
            vec![warehouse_item_id.into(), payload.tenant_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::not_found("warehouse item not found"))?;
    let status: String = item.try_get("", "status")?;
    if status != "available" {
        return Err(ApiError::bad_request("warehouse item is not available"));
    }

    let guild_id: i32 = item.try_get("", "guild_id")?;
    let game_id: i32 = item.try_get("", "game_id")?;
    let item_name: String = item.try_get("", "item_name")?;
    let quantity: i32 = item.try_get("", "quantity")?;
    ensure_user_permission(
        &tx,
        payload.tenant_id,
        Some(guild_id),
        payload.seller_user_id,
        "warehouse:manage",
    )
    .await?;

    let listing = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO listings (
                tenant_id,
                guild_id,
                seller_user_id,
                title,
                description,
                mode,
                visibility,
                status,
                game_id,
                currency_id,
                start_price,
                buyout_price
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9, $10::decimal, $11::decimal)
            RETURNING id, status
            "#,
            vec![
                payload.tenant_id.into(),
                guild_id.into(),
                payload.seller_user_id.into(),
                payload.title.into(),
                payload.description.unwrap_or_default().into(),
                payload.mode.into(),
                payload.visibility.into(),
                game_id.into(),
                payload.currency_id.into(),
                payload.start_price.clone().into(),
                payload.buyout_price.clone().into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("listing insert returned no row"))?;
    let listing_id: i32 = listing.try_get("", "id")?;

    tx.execute(Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        INSERT INTO listing_items (
            listing_id,
            tenant_id,
            game_id,
            currency_id,
            item_name,
            quantity,
            unit_price,
            price_amount
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::decimal, $7::decimal)
        "#,
        vec![
            listing_id.into(),
            payload.tenant_id.into(),
            game_id.into(),
            payload.currency_id.into(),
            item_name.into(),
            quantity.into(),
            payload
                .start_price
                .clone()
                .or(payload.buyout_price.clone())
                .into(),
        ],
    ))
    .await?;

    tx.execute(Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        UPDATE guild_warehouse_items
        SET status = 'listed',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        "#,
        vec![warehouse_item_id.into()],
    ))
    .await?;

    tx.execute(Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        INSERT INTO guild_warehouse_movements (
            tenant_id,
            guild_id,
            warehouse_item_id,
            movement_type,
            quantity_delta,
            from_status,
            to_status,
            related_listing_id,
            created_by
        )
        VALUES ($1, $2, $3, 'listed', $4, 'available', 'listed', $5, $6)
        "#,
        vec![
            payload.tenant_id.into(),
            guild_id.into(),
            warehouse_item_id.into(),
            (quantity * -1).into(),
            listing_id.into(),
            payload.seller_user_id.into(),
        ],
    ))
    .await?;

    tx.commit().await?;

    Ok((
        StatusCode::CREATED,
        Json(ListingResponse {
            id: listing_id,
            status: listing.try_get("", "status")?,
        }),
    ))
}

async fn list_guild_listed_items(
    State(state): State<AppState>,
    Path((tenant_id, guild_id)): Path<(i32, i32)>,
) -> Result<Json<Vec<ListedWarehouseItem>>, ApiError> {
    let rows = state
        .db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT
                wi.id AS warehouse_item_id,
                l.id AS listing_id,
                wi.item_name,
                wi.quantity,
                l.status AS listing_status,
                l.title
            FROM guild_warehouse_items wi
            JOIN guild_warehouse_movements wm ON wm.warehouse_item_id = wi.id
            JOIN listings l ON l.id = wm.related_listing_id
            WHERE wi.tenant_id = $1
              AND wi.guild_id = $2
              AND wi.status = 'listed'
              AND wm.movement_type = 'listed'
            ORDER BY l.created_at DESC
            "#,
            vec![tenant_id.into(), guild_id.into()],
        ))
        .await?;

    let items = rows
        .into_iter()
        .map(|row| {
            Ok(ListedWarehouseItem {
                warehouse_item_id: row.try_get("", "warehouse_item_id")?,
                listing_id: row.try_get("", "listing_id")?,
                item_name: row.try_get("", "item_name")?,
                quantity: row.try_get("", "quantity")?,
                listing_status: row.try_get("", "listing_status")?,
                title: row.try_get("", "title")?,
            })
        })
        .collect::<Result<Vec<_>, DbErr>>()?;

    Ok(Json(items))
}

async fn list_guild_warehouse_items(
    State(state): State<AppState>,
    Path((tenant_id, guild_id)): Path<(i32, i32)>,
    Query(query): Query<ActorQuery>,
) -> Result<Json<Vec<GuildWarehouseItemSummary>>, ApiError> {
    ensure_user_permission(
        state.db.as_ref(),
        tenant_id,
        Some(guild_id),
        query.actor_user_id,
        "warehouse:view",
    )
    .await?;

    let rows = state
        .db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT
                id,
                game_id,
                item_name,
                quantity,
                status,
                custodian_user_id,
                source_type,
                source_id
            FROM guild_warehouse_items
            WHERE tenant_id = $1
              AND guild_id = $2
            ORDER BY updated_at DESC, created_at DESC
            LIMIT 200
            "#,
            vec![tenant_id.into(), guild_id.into()],
        ))
        .await?;

    let items = rows
        .into_iter()
        .map(|row| {
            Ok(GuildWarehouseItemSummary {
                id: row.try_get("", "id")?,
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

async fn list_guild_treasury_accounts(
    State(state): State<AppState>,
    Path((tenant_id, guild_id)): Path<(i32, i32)>,
    Query(query): Query<ActorQuery>,
) -> Result<Json<Vec<GuildTreasuryAccountSummary>>, ApiError> {
    ensure_user_permission(
        state.db.as_ref(),
        tenant_id,
        Some(guild_id),
        query.actor_user_id,
        "treasury:view",
    )
    .await?;

    let rows = state
        .db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT
                id,
                currency_id,
                balance::text AS balance,
                held_balance::text AS held_balance
            FROM guild_treasury_accounts
            WHERE tenant_id = $1
              AND guild_id = $2
            ORDER BY currency_id
            "#,
            vec![tenant_id.into(), guild_id.into()],
        ))
        .await?;

    let accounts = rows
        .into_iter()
        .map(|row| {
            Ok(GuildTreasuryAccountSummary {
                id: row.try_get("", "id")?,
                currency_id: row.try_get("", "currency_id")?,
                balance: row.try_get("", "balance")?,
                held_balance: row.try_get("", "held_balance")?,
            })
        })
        .collect::<Result<Vec<_>, DbErr>>()?;

    Ok(Json(accounts))
}

async fn list_guild_treasury_ledger(
    State(state): State<AppState>,
    Path((tenant_id, guild_id)): Path<(i32, i32)>,
    Query(query): Query<ActorQuery>,
) -> Result<Json<Vec<GuildTreasuryLedgerEntrySummary>>, ApiError> {
    ensure_user_permission(
        state.db.as_ref(),
        tenant_id,
        Some(guild_id),
        query.actor_user_id,
        "treasury:view",
    )
    .await?;

    let rows = state
        .db
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT
                id,
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
              AND guild_id = $2
            ORDER BY created_at DESC
            LIMIT 200
            "#,
            vec![tenant_id.into(), guild_id.into()],
        ))
        .await?;

    let entries = rows
        .into_iter()
        .map(|row| {
            Ok(GuildTreasuryLedgerEntrySummary {
                id: row.try_get("", "id")?,
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

async fn create_procurement_order(
    State(state): State<AppState>,
    Path(guild_id): Path<i32>,
    Json(payload): Json<CreateProcurementOrder>,
) -> Result<(StatusCode, Json<ProcurementOrderResponse>), ApiError> {
    validate_required(&payload.title, "title")?;
    validate_optional_amount(&payload.budget_amount)?;
    validate_optional_amount(&payload.supplier_deposit_amount)?;
    validate_optional_amount(&payload.guild_donation_amount)?;
    if payload.items.is_empty() {
        return Err(ApiError::bad_request("items are required"));
    }
    ensure_user_permission(
        state.db.as_ref(),
        payload.tenant_id,
        Some(guild_id),
        payload.requester_user_id,
        "order:create",
    )
    .await?;

    let tx = state.db.begin().await?;
    let order_type = payload.order_type.unwrap_or_else(|| "one_time".into());
    let visibility = payload.visibility.unwrap_or_else(|| "guild_only".into());
    let order = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO procurement_orders (
                tenant_id,
                guild_id,
                requester_user_id,
                game_id,
                currency_id,
                title,
                description,
                order_type,
                visibility,
                budget_amount,
                supplier_deposit_amount,
                guild_donation_amount
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::decimal, $11::decimal, $12::decimal)
            RETURNING id, status
            "#,
            vec![
                payload.tenant_id.into(),
                guild_id.into(),
                payload.requester_user_id.into(),
                payload.game_id.into(),
                payload.currency_id.into(),
                payload.title.trim().to_owned().into(),
                payload.description.unwrap_or_default().into(),
                order_type.into(),
                visibility.into(),
                payload.budget_amount.clone().into(),
                payload.supplier_deposit_amount.clone().into(),
                payload.guild_donation_amount.clone().into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("procurement order insert returned no row"))?;
    let order_id: i32 = order.try_get("", "id")?;

    for item in payload.items {
        validate_required(&item.item_name, "item_name")?;
        if item.quantity <= 0 {
            return Err(ApiError::bad_request("item quantity must be positive"));
        }
        tx.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO procurement_order_items (
                order_id,
                game_item_id,
                item_name,
                quantity,
                unit_budget_amount
            )
            VALUES ($1, $2, $3, $4, $5::decimal)
            "#,
            vec![
                order_id.into(),
                item.game_item_id.into(),
                item.item_name.into(),
                item.quantity.into(),
                item.unit_budget_amount.into(),
            ],
        ))
        .await?;
    }

    insert_audit_log_tx(
        &tx,
        Some(payload.tenant_id),
        Some(guild_id),
        payload.requester_user_id,
        "procurement_order.create",
        "procurement_order",
        order_id.to_string(),
    )
    .await?;
    tx.commit().await?;

    Ok((
        StatusCode::CREATED,
        Json(ProcurementOrderResponse {
            id: order_id,
            status: order.try_get("", "status")?,
        }),
    ))
}

async fn approve_procurement_order(
    State(state): State<AppState>,
    Path(order_id): Path<i32>,
    Json(payload): Json<ApproveProcurementOrder>,
) -> Result<Json<ProcurementOrderResponse>, ApiError> {
    update_procurement_order_status(
        state.db.as_ref(),
        order_id,
        payload.tenant_id,
        payload.approved_by,
        "order:approve",
        &["draft", "pending_approval"],
        "open",
        "approved_by",
        "approved_at",
        "procurement_order.approve",
    )
    .await
}

async fn accept_procurement_order(
    State(state): State<AppState>,
    Path(order_id): Path<i32>,
    Json(payload): Json<AcceptProcurementOrder>,
) -> Result<Json<ProcurementOrderResponse>, ApiError> {
    ensure_user_permission(
        state.db.as_ref(),
        payload.tenant_id,
        payload.supplier_guild_id,
        payload.supplier_user_id,
        "order:accept",
    )
    .await?;

    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE procurement_orders
            SET status = 'accepted',
                supplier_user_id = $1,
                accepted_by = $1,
                accepted_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
              AND tenant_id = $3
              AND status = 'open'
            RETURNING id, status, guild_id
            "#,
            vec![
                payload.supplier_user_id.into(),
                order_id.into(),
                payload.tenant_id.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::bad_request("procurement order is not open"))?;
    let guild_id: i32 = row.try_get("", "guild_id")?;
    insert_audit_log(
        state.db.as_ref(),
        Some(payload.tenant_id),
        Some(guild_id),
        payload.supplier_user_id,
        "procurement_order.accept",
        "procurement_order",
        order_id.to_string(),
    )
    .await?;

    Ok(Json(ProcurementOrderResponse {
        id: row.try_get("", "id")?,
        status: row.try_get("", "status")?,
    }))
}

async fn deliver_procurement_order(
    State(state): State<AppState>,
    Path(order_id): Path<i32>,
    Json(payload): Json<DeliverProcurementOrder>,
) -> Result<Json<ProcurementOrderResponse>, ApiError> {
    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE procurement_orders
            SET status = 'delivered',
                delivered_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND tenant_id = $2
              AND supplier_user_id = $3
              AND status = 'accepted'
            RETURNING id, status, guild_id
            "#,
            vec![
                order_id.into(),
                payload.tenant_id.into(),
                payload.supplier_user_id.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::bad_request("procurement order is not deliverable"))?;
    let guild_id: i32 = row.try_get("", "guild_id")?;
    insert_audit_log(
        state.db.as_ref(),
        Some(payload.tenant_id),
        Some(guild_id),
        payload.supplier_user_id,
        "procurement_order.deliver",
        "procurement_order",
        order_id.to_string(),
    )
    .await?;

    Ok(Json(ProcurementOrderResponse {
        id: row.try_get("", "id")?,
        status: row.try_get("", "status")?,
    }))
}

async fn complete_procurement_order(
    State(state): State<AppState>,
    Path(order_id): Path<i32>,
    Json(payload): Json<CompleteProcurementOrder>,
) -> Result<Json<ProcurementOrderResponse>, ApiError> {
    update_procurement_order_status(
        state.db.as_ref(),
        order_id,
        payload.tenant_id,
        payload.completed_by,
        "order:approve",
        &["delivered"],
        "completed",
        "completed_by",
        "completed_at",
        "procurement_order.complete",
    )
    .await
}

async fn create_lottery(
    State(state): State<AppState>,
    Path(guild_id): Path<i32>,
    Json(payload): Json<CreateLottery>,
) -> Result<(StatusCode, Json<LotteryResponse>), ApiError> {
    validate_required(&payload.title, "title")?;
    if payload.prizes.is_empty() {
        return Err(ApiError::bad_request("prizes are required"));
    }
    if let Some(limit) = payload.entry_limit_per_user {
        if limit <= 0 {
            return Err(ApiError::bad_request(
                "entry_limit_per_user must be positive",
            ));
        }
    }
    ensure_user_permission(
        state.db.as_ref(),
        payload.tenant_id,
        Some(guild_id),
        payload.created_by,
        "lottery:manage",
    )
    .await?;

    let tx = state.db.begin().await?;
    let lottery_type = payload.lottery_type.unwrap_or_else(|| "free".into());
    let lottery = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO lotteries (
                tenant_id,
                guild_id,
                game_id,
                title,
                description,
                lottery_type,
                entry_limit_per_user,
                starts_at,
                ends_at,
                created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamp, $9::timestamp, $10)
            RETURNING id, status
            "#,
            vec![
                payload.tenant_id.into(),
                guild_id.into(),
                payload.game_id.into(),
                payload.title.trim().to_owned().into(),
                payload.description.unwrap_or_default().into(),
                lottery_type.into(),
                payload.entry_limit_per_user.into(),
                payload.starts_at.into(),
                payload.ends_at.into(),
                payload.created_by.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("lottery insert returned no row"))?;
    let lottery_id: i32 = lottery.try_get("", "id")?;

    for prize in payload.prizes {
        validate_required(&prize.prize_name, "prize_name")?;
        validate_optional_amount(&prize.amount)?;
        let quantity = prize.quantity.unwrap_or(1);
        if quantity <= 0 {
            return Err(ApiError::bad_request("prize quantity must be positive"));
        }
        tx.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO lottery_prizes (
                lottery_id,
                warehouse_item_id,
                game_item_id,
                currency_id,
                prize_name,
                quantity,
                amount
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7::decimal)
            "#,
            vec![
                lottery_id.into(),
                prize.warehouse_item_id.into(),
                prize.game_item_id.into(),
                prize.currency_id.into(),
                prize.prize_name.into(),
                quantity.into(),
                prize.amount.into(),
            ],
        ))
        .await?;
    }

    insert_audit_log_tx(
        &tx,
        Some(payload.tenant_id),
        Some(guild_id),
        payload.created_by,
        "lottery.create",
        "lottery",
        lottery_id.to_string(),
    )
    .await?;
    tx.commit().await?;

    Ok((
        StatusCode::CREATED,
        Json(LotteryResponse {
            id: lottery_id,
            status: lottery.try_get("", "status")?,
        }),
    ))
}

async fn approve_lottery(
    State(state): State<AppState>,
    Path(lottery_id): Path<i32>,
    Json(payload): Json<ApproveLottery>,
) -> Result<Json<LotteryResponse>, ApiError> {
    let lottery = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT guild_id
            FROM lotteries
            WHERE id = $1
              AND tenant_id = $2
            "#,
            vec![lottery_id.into(), payload.tenant_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::not_found("lottery not found"))?;
    let guild_id: Option<i32> = lottery.try_get("", "guild_id")?;
    ensure_user_permission(
        state.db.as_ref(),
        payload.tenant_id,
        guild_id,
        payload.approved_by,
        "lottery:manage",
    )
    .await?;

    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE lotteries
            SET status = 'open',
                approved_by = $1,
                approved_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
              AND tenant_id = $3
              AND status IN ('draft', 'pending_approval')
            RETURNING id, status
            "#,
            vec![
                payload.approved_by.into(),
                lottery_id.into(),
                payload.tenant_id.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::bad_request("lottery is not approvable"))?;
    insert_audit_log(
        state.db.as_ref(),
        Some(payload.tenant_id),
        guild_id,
        payload.approved_by,
        "lottery.approve",
        "lottery",
        lottery_id.to_string(),
    )
    .await?;

    Ok(Json(LotteryResponse {
        id: row.try_get("", "id")?,
        status: row.try_get("", "status")?,
    }))
}

async fn enter_lottery(
    State(state): State<AppState>,
    Path(lottery_id): Path<i32>,
    Json(payload): Json<EnterLottery>,
) -> Result<(StatusCode, Json<LotteryEntryResponse>), ApiError> {
    let entry_count = payload.entry_count.unwrap_or(1);
    if entry_count <= 0 {
        return Err(ApiError::bad_request("entry_count must be positive"));
    }
    ensure_user_permission(
        state.db.as_ref(),
        payload.tenant_id,
        payload.guild_id,
        payload.user_id,
        "lottery:enter",
    )
    .await?;

    let lottery = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT id, guild_id, status, entry_limit_per_user
            FROM lotteries
            WHERE id = $1
              AND tenant_id = $2
              AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
              AND (ends_at IS NULL OR ends_at >= CURRENT_TIMESTAMP)
            "#,
            vec![lottery_id.into(), payload.tenant_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::not_found("open lottery not found"))?;
    let status: String = lottery.try_get("", "status")?;
    if status != "open" {
        return Err(ApiError::bad_request("lottery is not open"));
    }
    let lottery_guild_id: Option<i32> = lottery.try_get("", "guild_id")?;
    ensure_user_permission(
        state.db.as_ref(),
        payload.tenant_id,
        lottery_guild_id.or(payload.guild_id),
        payload.user_id,
        "lottery:enter",
    )
    .await?;
    let limit: Option<i32> = lottery.try_get("", "entry_limit_per_user")?;
    if let Some(limit) = limit {
        let existing =
            current_lottery_entry_count(state.db.as_ref(), lottery_id, payload.user_id).await?;
        if existing + entry_count > limit {
            return Err(ApiError::bad_request("entry limit exceeded"));
        }
    }

    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO lottery_entries (
                lottery_id,
                user_id,
                guild_id,
                source_type,
                source_id,
                entry_count
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (lottery_id, user_id, source_type, source_id)
            DO UPDATE SET entry_count = lottery_entries.entry_count + EXCLUDED.entry_count
            RETURNING id, entry_count
            "#,
            vec![
                lottery_id.into(),
                payload.user_id.into(),
                payload.guild_id.into(),
                payload.source_type.into(),
                payload.source_id.into(),
                entry_count.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("lottery entry insert returned no row"))?;

    Ok((
        StatusCode::CREATED,
        Json(LotteryEntryResponse {
            id: row.try_get("", "id")?,
            entry_count: row.try_get("", "entry_count")?,
        }),
    ))
}

async fn draw_lottery(
    State(state): State<AppState>,
    Path(lottery_id): Path<i32>,
    Json(payload): Json<DrawLottery>,
) -> Result<Json<Vec<LotteryDrawResultResponse>>, ApiError> {
    let tx = state.db.begin().await?;
    let lottery = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT id, guild_id, status
            FROM lotteries
            WHERE id = $1
              AND tenant_id = $2
            FOR UPDATE
            "#,
            vec![lottery_id.into(), payload.tenant_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::not_found("lottery not found"))?;
    let guild_id: Option<i32> = lottery.try_get("", "guild_id")?;
    ensure_user_permission(
        &tx,
        payload.tenant_id,
        guild_id,
        payload.drawn_by,
        "lottery:manage",
    )
    .await?;
    let status: String = lottery.try_get("", "status")?;
    if status != "open" && status != "closed" {
        return Err(ApiError::bad_request("lottery is not drawable"));
    }

    let prize_count = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT COUNT(*)::integer AS count FROM lottery_prizes WHERE lottery_id = $1",
            vec![lottery_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("lottery prize count returned no row"))?;
    let prize_count: i32 = prize_count.try_get("", "count")?;
    if prize_count <= 0 {
        return Err(ApiError::bad_request("lottery has no prizes"));
    }

    let entry_count = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT COUNT(*)::integer AS count FROM lottery_entries WHERE lottery_id = $1",
            vec![lottery_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("lottery entry count returned no row"))?;
    let entry_count: i32 = entry_count.try_get("", "count")?;
    if entry_count <= 0 {
        return Err(ApiError::bad_request("lottery has no entries"));
    }

    let rows = tx
        .query_all(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            WITH weighted_entries AS (
                SELECT le.id, le.user_id
                FROM lottery_entries le
                JOIN generate_series(1, le.entry_count) AS chance(n) ON true
                WHERE le.lottery_id = $1
            ),
            shuffled_prizes AS (
                SELECT id, row_number() OVER (ORDER BY id) AS rn
                FROM lottery_prizes
                WHERE lottery_id = $1
            ),
            shuffled_entries AS (
                SELECT id, user_id, row_number() OVER (ORDER BY random()) AS rn
                FROM weighted_entries
            ),
            winners AS (
                SELECT sp.id AS prize_id, se.id AS entry_id, se.user_id
                FROM shuffled_prizes sp
                JOIN shuffled_entries se ON se.rn = sp.rn
            )
            INSERT INTO lottery_draw_results (
                lottery_id,
                prize_id,
                winner_user_id,
                entry_id,
                drawn_by
            )
            SELECT $1, prize_id, user_id, entry_id, $2
            FROM winners
            ON CONFLICT (lottery_id, prize_id) DO NOTHING
            RETURNING id AS result_id, prize_id, winner_user_id
            "#,
            vec![lottery_id.into(), payload.drawn_by.into()],
        ))
        .await?;
    if rows.is_empty() {
        return Err(ApiError::bad_request("lottery was already drawn"));
    }

    tx.execute(Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        UPDATE lotteries
        SET status = 'drawn',
            drawn_by = $1,
            drawn_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        "#,
        vec![payload.drawn_by.into(), lottery_id.into()],
    ))
    .await?;
    insert_audit_log_tx(
        &tx,
        Some(payload.tenant_id),
        guild_id,
        payload.drawn_by,
        "lottery.draw",
        "lottery",
        lottery_id.to_string(),
    )
    .await?;
    tx.commit().await?;

    let results = rows
        .into_iter()
        .map(|row| {
            Ok(LotteryDrawResultResponse {
                result_id: row.try_get("", "result_id")?,
                prize_id: row.try_get("", "prize_id")?,
                winner_user_id: row.try_get("", "winner_user_id")?,
            })
        })
        .collect::<Result<Vec<_>, DbErr>>()?;

    Ok(Json(results))
}

async fn create_listing_dispute(
    State(state): State<AppState>,
    Path(listing_id): Path<i32>,
    Json(payload): Json<CreateListingDispute>,
) -> Result<(StatusCode, Json<DisputeResponse>), ApiError> {
    validate_required(&payload.reason, "reason")?;
    validate_required(&payload.description, "description")?;

    let listing = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT tenant_id, guild_id, seller_user_id, matched_buyer_user_id
            FROM listings
            WHERE id = $1
              AND tenant_id = $2
            "#,
            vec![listing_id.into(), payload.tenant_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::not_found("listing not found"))?;
    let guild_id: i32 = listing.try_get("", "guild_id")?;
    ensure_user_permission(
        state.db.as_ref(),
        payload.tenant_id,
        payload.guild_id.or(Some(guild_id)),
        payload.opened_by,
        "dispute:create",
    )
    .await?;

    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO dispute_cases (
                tenant_id,
                guild_id,
                listing_id,
                opened_by,
                reason,
                description
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, status
            "#,
            vec![
                payload.tenant_id.into(),
                guild_id.into(),
                listing_id.into(),
                payload.opened_by.into(),
                payload.reason.into(),
                payload.description.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("dispute insert returned no row"))?;
    let dispute_id: i32 = row.try_get("", "id")?;

    insert_audit_log(
        state.db.as_ref(),
        Some(payload.tenant_id),
        Some(guild_id),
        payload.opened_by,
        "dispute.create",
        "dispute_case",
        dispute_id.to_string(),
    )
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(DisputeResponse {
            id: dispute_id,
            status: row.try_get("", "status")?,
        }),
    ))
}

async fn create_dispute_message(
    State(state): State<AppState>,
    Path(dispute_id): Path<i32>,
    Json(payload): Json<CreateDisputeMessage>,
) -> Result<(StatusCode, Json<DisputeMessageResponse>), ApiError> {
    validate_required(&payload.content, "content")?;

    let dispute = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT tenant_id, guild_id, status
            FROM dispute_cases
            WHERE id = $1
              AND tenant_id = $2
            "#,
            vec![dispute_id.into(), payload.tenant_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::not_found("dispute not found"))?;
    let status: String = dispute.try_get("", "status")?;
    if status == "resolved" || status == "closed" {
        return Err(ApiError::bad_request("dispute is closed"));
    }
    let guild_id: Option<i32> = dispute.try_get("", "guild_id")?;
    ensure_user_permission(
        state.db.as_ref(),
        payload.tenant_id,
        guild_id,
        payload.user_id,
        "dispute:comment",
    )
    .await?;

    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO dispute_messages (
                dispute_id,
                user_id,
                content,
                is_internal_note
            )
            VALUES ($1, $2, $3, $4)
            RETURNING id
            "#,
            vec![
                dispute_id.into(),
                payload.user_id.into(),
                payload.content.into(),
                payload.is_internal_note.unwrap_or(false).into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("dispute message insert returned no row"))?;

    insert_audit_log(
        state.db.as_ref(),
        Some(payload.tenant_id),
        guild_id,
        payload.user_id,
        "dispute.message",
        "dispute_case",
        dispute_id.to_string(),
    )
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(DisputeMessageResponse {
            id: row.try_get("", "id")?,
        }),
    ))
}

async fn create_report(
    State(state): State<AppState>,
    Json(payload): Json<CreateReport>,
) -> Result<(StatusCode, Json<ReportResponse>), ApiError> {
    validate_required(&payload.resource_type, "resource_type")?;
    validate_required(&payload.reason, "reason")?;
    validate_required(&payload.description, "description")?;

    let row = state
        .db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO reports (
                tenant_id,
                guild_id,
                reporter_user_id,
                reported_user_id,
                resource_type,
                resource_id,
                reason,
                description
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, status
            "#,
            vec![
                payload.tenant_id.into(),
                payload.guild_id.into(),
                payload.reporter_user_id.into(),
                payload.reported_user_id.into(),
                payload.resource_type.into(),
                payload.resource_id.into(),
                payload.reason.into(),
                payload.description.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("report insert returned no row"))?;
    let report_id: i32 = row.try_get("", "id")?;

    insert_audit_log(
        state.db.as_ref(),
        payload.tenant_id,
        payload.guild_id,
        payload.reporter_user_id,
        "report.create",
        "report",
        report_id.to_string(),
    )
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(ReportResponse {
            id: report_id,
            status: row.try_get("", "status")?,
        }),
    ))
}

fn validate_required(value: &str, field: &'static str) -> Result<(), ApiError> {
    if value.trim().is_empty() {
        return Err(ApiError::bad_request(format!("{field} is required")));
    }

    Ok(())
}

fn listing_market_summary_from_row(
    row: sea_orm::QueryResult,
) -> Result<ListingMarketSummary, DbErr> {
    Ok(ListingMarketSummary {
        id: row.try_get("", "id")?,
        tenant_id: row.try_get("", "tenant_id")?,
        guild_id: row.try_get("", "guild_id")?,
        seller_user_id: row.try_get("", "seller_user_id")?,
        title: row.try_get("", "title")?,
        description: row.try_get("", "description")?,
        mode: row.try_get("", "mode")?,
        visibility: row.try_get("", "visibility")?,
        status: row.try_get("", "status")?,
        currency_id: row.try_get("", "currency_id")?,
        start_price: row.try_get("", "start_price")?,
        buyout_price: row.try_get("", "buyout_price")?,
        bid_count: row.try_get("", "bid_count")?,
        top_bid_amount: row.try_get("", "top_bid_amount")?,
        matched_buyer_user_id: row.try_get("", "matched_buyer_user_id")?,
        created_at: row.try_get("", "created_at")?,
    })
}

fn validate_listing_mode(mode: &str) -> Result<(), ApiError> {
    match mode {
        "fixed_price" | "auction_open_bid" | "auction_sealed_bid" | "guild_donation_sale" => Ok(()),
        _ => Err(ApiError::bad_request("unsupported listing mode")),
    }
}

fn validate_listing_visibility(visibility: &str) -> Result<(), ApiError> {
    match visibility {
        "guild_only" | "alliance_only" | "tenant_market" | "invite_only" => Ok(()),
        _ => Err(ApiError::bad_request("unsupported listing visibility")),
    }
}

fn validate_optional_amount(value: &Option<String>) -> Result<(), ApiError> {
    if let Some(value) = value {
        validate_required(value, "amount")?;
    }

    Ok(())
}

async fn ensure_user_permission<C>(
    db: &C,
    tenant_id: i32,
    guild_id: Option<i32>,
    user_id: i32,
    permission: &str,
) -> Result<(), ApiError>
where
    C: ConnectionTrait,
{
    let row = db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT EXISTS (
                SELECT 1
                FROM guild_members gm
                JOIN member_roles mr ON mr.guild_member_id = gm.id
                JOIN role_permissions rp ON rp.role_id = mr.role_id
                JOIN permissions p ON p.id = rp.permission_id
                WHERE gm.tenant_id = $1
                  AND gm.user_id = $2
                  AND gm.status = 'active'
                  AND ($3::integer IS NULL OR gm.guild_id = $3)
                  AND p.code = $4
            ) AS allowed
            "#,
            vec![
                tenant_id.into(),
                user_id.into(),
                guild_id.into(),
                permission.to_owned().into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("permission check returned no row"))?;

    let allowed: bool = row.try_get("", "allowed")?;
    if !allowed {
        return Err(ApiError::forbidden("missing required permission"));
    }

    Ok(())
}

async fn update_procurement_order_status<C>(
    db: &C,
    order_id: i32,
    tenant_id: i32,
    actor_user_id: i32,
    permission: &str,
    from_statuses: &[&str],
    to_status: &str,
    actor_column: &str,
    timestamp_column: &str,
    audit_action: &str,
) -> Result<Json<ProcurementOrderResponse>, ApiError>
where
    C: ConnectionTrait,
{
    ensure_user_permission(db, tenant_id, None, actor_user_id, permission).await?;

    let placeholders = from_statuses
        .iter()
        .enumerate()
        .map(|(index, _)| format!("${}", index + 5))
        .collect::<Vec<_>>()
        .join(", ");
    let sql = format!(
        r#"
        UPDATE procurement_orders
        SET status = $1,
            {actor_column} = $2,
            {timestamp_column} = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
          AND tenant_id = $4
          AND status IN ({placeholders})
        RETURNING id, status, guild_id
        "#
    );
    let mut values = vec![
        to_status.to_owned().into(),
        actor_user_id.into(),
        order_id.into(),
        tenant_id.into(),
    ];
    values.extend(from_statuses.iter().map(|status| (*status).into()));

    let row = db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            sql,
            values,
        ))
        .await?
        .ok_or_else(|| {
            ApiError::bad_request("procurement order status transition is not allowed")
        })?;
    let guild_id: i32 = row.try_get("", "guild_id")?;
    insert_audit_log(
        db,
        Some(tenant_id),
        Some(guild_id),
        actor_user_id,
        audit_action,
        "procurement_order",
        order_id.to_string(),
    )
    .await?;

    Ok(Json(ProcurementOrderResponse {
        id: row.try_get("", "id")?,
        status: row.try_get("", "status")?,
    }))
}

async fn current_lottery_entry_count<C>(
    db: &C,
    lottery_id: i32,
    user_id: i32,
) -> Result<i32, ApiError>
where
    C: ConnectionTrait,
{
    let row = db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT COALESCE(SUM(entry_count), 0)::integer AS count
            FROM lottery_entries
            WHERE lottery_id = $1
              AND user_id = $2
            "#,
            vec![lottery_id.into(), user_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("lottery entry count returned no row"))?;

    Ok(row.try_get("", "count")?)
}

async fn update_trade_deposit_status<C>(
    db: &C,
    deposit_id: i32,
    tenant_id: i32,
    handled_by: i32,
    from_status: &str,
    to_status: &str,
    timestamp_column: &str,
    reason: Option<String>,
) -> Result<Json<TradeDepositResponse>, ApiError>
where
    C: ConnectionTrait,
{
    ensure_user_permission(db, tenant_id, None, handled_by, "deposit:manage").await?;

    let sql = format!(
        r#"
        UPDATE trade_deposits
        SET status = $1,
            {timestamp_column} = CURRENT_TIMESTAMP,
            handled_by = $2,
            reason = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
          AND tenant_id = $5
          AND status = $6
        RETURNING id, status
        "#
    );
    let row = db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            sql,
            vec![
                to_status.to_owned().into(),
                handled_by.into(),
                reason.unwrap_or_default().into(),
                deposit_id.into(),
                tenant_id.into(),
                from_status.to_owned().into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::bad_request("deposit status transition is not allowed"))?;

    insert_audit_log(
        db,
        Some(tenant_id),
        None,
        handled_by,
        &format!("deposit.{to_status}"),
        "trade_deposit",
        deposit_id.to_string(),
    )
    .await?;

    Ok(Json(TradeDepositResponse {
        id: row.try_get("", "id")?,
        status: row.try_get("", "status")?,
    }))
}

async fn assign_member_role(
    tx: &DatabaseTransaction,
    tenant_id: i32,
    guild_id: i32,
    guild_member_id: i32,
    role_code: &str,
    assigned_by: i32,
) -> Result<(), ApiError> {
    let role_name = role_code
        .split('_')
        .map(|part| {
            let mut chars = part.chars();
            match chars.next() {
                Some(first) => format!("{}{}", first.to_uppercase(), chars.as_str()),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ");

    let role = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO roles (tenant_id, guild_id, code, name, scope, is_system)
            VALUES ($1, $2, $3, $4, 'guild', true)
            ON CONFLICT (tenant_id, guild_id, code)
            DO UPDATE SET updated_at = CURRENT_TIMESTAMP
            RETURNING id
            "#,
            vec![
                tenant_id.into(),
                guild_id.into(),
                role_code.to_owned().into(),
                role_name.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("role upsert returned no row"))?;
    let role_id: i32 = role.try_get("", "id")?;

    for permission in permissions_for_role(role_code) {
        tx.execute(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT $1, id
            FROM permissions
            WHERE code = $2
            ON CONFLICT (role_id, permission_id) DO NOTHING
            "#,
            vec![role_id.into(), (*permission).into()],
        ))
        .await?;
    }

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

fn permissions_for_role(role_code: &str) -> &'static [&'static str] {
    match role_code {
        "guild_owner" => &[
            "notice:manage",
            "member:invite",
            "member:role_manage",
            "listing:create",
            "listing:approve",
            "listing:bid",
            "listing:restrict_bidders",
            "order:create",
            "order:approve",
            "order:accept",
            "order:deliver",
            "settlement:approve",
            "treasury:view",
            "treasury:manage",
            "warehouse:view",
            "warehouse:manage",
            "deposit:manage",
            "lottery:manage",
            "lottery:enter",
            "dispute:create",
            "dispute:comment",
            "dispute:view",
            "report:create",
        ],
        "guild_officer" => &[
            "notice:manage",
            "member:invite",
            "listing:create",
            "listing:approve",
            "listing:bid",
            "listing:restrict_bidders",
            "order:create",
            "order:approve",
            "order:accept",
            "order:deliver",
            "lottery:manage",
            "lottery:enter",
            "dispute:create",
            "dispute:comment",
            "dispute:view",
            "report:create",
        ],
        "guild_treasurer" => &[
            "listing:create",
            "listing:bid",
            "order:create",
            "order:accept",
            "order:deliver",
            "settlement:approve",
            "treasury:view",
            "treasury:manage",
            "deposit:manage",
            "lottery:enter",
            "dispute:create",
            "dispute:comment",
            "dispute:view",
            "report:create",
        ],
        "guild_warehouse_manager" => &[
            "listing:create",
            "listing:bid",
            "order:create",
            "order:accept",
            "order:deliver",
            "warehouse:view",
            "warehouse:manage",
            "lottery:enter",
            "dispute:create",
            "dispute:comment",
            "dispute:view",
            "report:create",
        ],
        _ => &[
            "listing:create",
            "listing:bid",
            "order:create",
            "order:accept",
            "order:deliver",
            "lottery:enter",
            "dispute:create",
            "dispute:comment",
            "dispute:view",
            "report:create",
        ],
    }
}

async fn ensure_bid_eligibility<C>(
    db: &C,
    listing: &sea_orm::QueryResult,
    bid: &CreateBid,
) -> Result<(), ApiError>
where
    C: ConnectionTrait,
{
    let listing_id: i32 = listing.try_get("", "id")?;
    let listing_guild_id: i32 = listing.try_get("", "guild_id")?;
    let listing_alliance_id: Option<i32> = listing.try_get("", "alliance_id")?;
    let visibility: String = listing.try_get("", "visibility")?;

    if has_matching_eligibility_rule(db, listing_id, bid).await? {
        return Ok(());
    }

    let rule_count = db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT COUNT(*)::integer AS count
            FROM listing_bid_eligibility_rules
            WHERE listing_id = $1
            "#,
            vec![listing_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("eligibility rule count returned no row"))?;
    let count: i32 = rule_count.try_get("", "count")?;
    if count > 0 {
        return Err(ApiError::forbidden(
            "bidder does not match eligibility rules",
        ));
    }

    match visibility.as_str() {
        "guild_only" => {
            if bid.bidder_guild_id == Some(listing_guild_id) {
                Ok(())
            } else {
                Err(ApiError::forbidden("listing is guild only"))
            }
        },
        "alliance_only" => {
            let alliance_id = listing_alliance_id
                .ok_or_else(|| ApiError::forbidden("listing has no alliance"))?;
            let bidder_guild_id = bid
                .bidder_guild_id
                .ok_or_else(|| ApiError::forbidden("bidder guild is required"))?;
            let row = db
                .query_one(Statement::from_sql_and_values(
                    DbBackend::Postgres,
                    r#"
                    SELECT EXISTS (
                        SELECT 1
                        FROM alliance_guilds
                        WHERE alliance_id = $1
                          AND guild_id = $2
                          AND status = 'active'
                    ) AS allowed
                    "#,
                    vec![alliance_id.into(), bidder_guild_id.into()],
                ))
                .await?
                .ok_or_else(|| ApiError::internal("alliance eligibility returned no row"))?;
            if row.try_get("", "allowed")? {
                Ok(())
            } else {
                Err(ApiError::forbidden("listing is alliance only"))
            }
        },
        "tenant_market" => Ok(()),
        "invite_only" => Err(ApiError::forbidden(
            "invite only listing requires eligibility rule",
        )),
        _ => Err(ApiError::bad_request("unsupported listing visibility")),
    }
}

async fn has_matching_eligibility_rule<C>(
    db: &C,
    listing_id: i32,
    bid: &CreateBid,
) -> Result<bool, ApiError>
where
    C: ConnectionTrait,
{
    let row = db
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            SELECT EXISTS (
                SELECT 1
                FROM listing_bid_eligibility_rules r
                WHERE r.listing_id = $1
                  AND (
                    r.target_user_id = $2
                    OR ($3::integer IS NOT NULL AND r.target_guild_id = $3)
                    OR (
                        $3::integer IS NOT NULL
                        AND r.target_alliance_id IS NOT NULL
                        AND EXISTS (
                            SELECT 1
                            FROM alliance_guilds ag
                            WHERE ag.alliance_id = r.target_alliance_id
                              AND ag.guild_id = $3
                              AND ag.status = 'active'
                        )
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM guild_members gm
                        JOIN member_roles mr ON mr.guild_member_id = gm.id
                        WHERE gm.user_id = $2
                          AND gm.status = 'active'
                          AND mr.role_id = r.target_role_id
                    )
                  )
            ) AS allowed
            "#,
            vec![
                listing_id.into(),
                bid.bidder_user_id.into(),
                bid.bidder_guild_id.into(),
            ],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("eligibility check returned no row"))?;

    Ok(row.try_get("", "allowed")?)
}

async fn select_winning_bid(
    tx: &DatabaseTransaction,
    listing_id: i32,
    winning_bid_id: Option<i32>,
) -> Result<sea_orm::QueryResult, ApiError> {
    let (sql, values) = if let Some(winning_bid_id) = winning_bid_id {
        (
            r#"
            SELECT id, bidder_user_id, currency_id, amount::text AS amount
            FROM listing_bids
            WHERE id = $1
              AND listing_id = $2
              AND status = 'active'
            FOR UPDATE
            "#,
            vec![winning_bid_id.into(), listing_id.into()],
        )
    } else {
        (
            r#"
            SELECT id, bidder_user_id, currency_id, amount::text AS amount
            FROM listing_bids
            WHERE listing_id = $1
              AND status = 'active'
            ORDER BY amount DESC, placed_at ASC
            LIMIT 1
            FOR UPDATE
            "#,
            vec![listing_id.into()],
        )
    };

    tx.query_one(Statement::from_sql_and_values(
        DbBackend::Postgres,
        sql,
        values,
    ))
    .await?
    .ok_or_else(|| ApiError::bad_request("winning bid not found"))
}

async fn ensure_amount_not_greater(
    tx: &DatabaseTransaction,
    amount: &str,
    max_amount: &str,
) -> Result<(), ApiError> {
    let row = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT ($1::decimal <= $2::decimal) AS ok",
            vec![amount.to_owned().into(), max_amount.to_owned().into()],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("amount comparison returned no row"))?;
    if row.try_get("", "ok")? {
        Ok(())
    } else {
        Err(ApiError::bad_request("amount exceeds settlement total"))
    }
}

async fn subtract_amount(
    tx: &DatabaseTransaction,
    total: &str,
    amount: &str,
) -> Result<String, ApiError> {
    let row = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT (($1::decimal - $2::decimal)::text) AS amount",
            vec![total.to_owned().into(), amount.to_owned().into()],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("amount subtraction returned no row"))?;
    Ok(row.try_get("", "amount")?)
}

async fn is_positive_amount(tx: &DatabaseTransaction, amount: &str) -> Result<bool, ApiError> {
    let row = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            "SELECT ($1::decimal > 0) AS ok",
            vec![amount.to_owned().into()],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("amount positivity check returned no row"))?;
    Ok(row.try_get("", "ok")?)
}

async fn insert_settlement_recipient(
    tx: &DatabaseTransaction,
    settlement_id: i32,
    recipient_user_id: Option<i32>,
    recipient_type: &str,
    currency_id: i32,
    share_ratio: &str,
    share_amount: &str,
    guild_id: Option<i32>,
) -> Result<(), ApiError> {
    tx.execute(Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        INSERT INTO trade_settlement_recipients (
            settlement_id,
            recipient_user_id,
            recipient_type,
            currency_id,
            share_ratio,
            share_amount,
            guild_id
        )
        VALUES ($1, $2, $3, $4, $5::decimal, $6::decimal, $7)
        "#,
        vec![
            settlement_id.into(),
            recipient_user_id.into(),
            recipient_type.to_owned().into(),
            currency_id.into(),
            share_ratio.to_owned().into(),
            share_amount.to_owned().into(),
            guild_id.into(),
        ],
    ))
    .await?;

    Ok(())
}

async fn write_treasury_ledger(
    tx: &DatabaseTransaction,
    tenant_id: i32,
    guild_id: i32,
    currency_id: i32,
    entry_type: &str,
    amount_delta: &str,
    source_type: &str,
    source_id: String,
    created_by: i32,
) -> Result<(), ApiError> {
    let account = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            INSERT INTO guild_treasury_accounts (tenant_id, guild_id, currency_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (guild_id, currency_id)
            DO UPDATE SET updated_at = CURRENT_TIMESTAMP
            RETURNING id, balance::text AS balance, held_balance::text AS held_balance
            "#,
            vec![tenant_id.into(), guild_id.into(), currency_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("treasury account upsert returned no row"))?;
    let account_id: i32 = account.try_get("", "id")?;

    let updated = tx
        .query_one(Statement::from_sql_and_values(
            DbBackend::Postgres,
            r#"
            UPDATE guild_treasury_accounts
            SET balance = balance + $1::decimal,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING balance::text AS balance, held_balance::text AS held_balance
            "#,
            vec![amount_delta.to_owned().into(), account_id.into()],
        ))
        .await?
        .ok_or_else(|| ApiError::internal("treasury account update returned no row"))?;
    let balance_after: String = updated.try_get("", "balance")?;
    let held_balance_after: String = updated.try_get("", "held_balance")?;

    tx.execute(Statement::from_sql_and_values(
        DbBackend::Postgres,
        r#"
        INSERT INTO guild_treasury_ledger_entries (
            tenant_id,
            guild_id,
            account_id,
            currency_id,
            entry_type,
            amount_delta,
            balance_after,
            held_balance_after,
            source_type,
            source_id,
            created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6::decimal, $7::decimal, $8::decimal, $9, $10, $11)
        "#,
        vec![
            tenant_id.into(),
            guild_id.into(),
            account_id.into(),
            currency_id.into(),
            entry_type.to_owned().into(),
            amount_delta.to_owned().into(),
            balance_after.into(),
            held_balance_after.into(),
            source_type.to_owned().into(),
            source_id.into(),
            created_by.into(),
        ],
    ))
    .await?;

    Ok(())
}

async fn insert_audit_log<C>(
    db: &C,
    tenant_id: Option<i32>,
    guild_id: Option<i32>,
    actor_user_id: i32,
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
            action,
            resource_type,
            resource_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        "#,
        vec![
            tenant_id.into(),
            guild_id.into(),
            actor_user_id.into(),
            action.to_owned().into(),
            resource_type.to_owned().into(),
            resource_id.into(),
        ],
    ))
    .await?;

    Ok(())
}

async fn insert_audit_log_tx(
    tx: &DatabaseTransaction,
    tenant_id: Option<i32>,
    guild_id: Option<i32>,
    actor_user_id: i32,
    action: &str,
    resource_type: &str,
    resource_id: String,
) -> Result<(), ApiError> {
    insert_audit_log(
        tx,
        tenant_id,
        guild_id,
        actor_user_id,
        action,
        resource_type,
        resource_id,
    )
    .await
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
    fn validates_supported_listing_modes() {
        assert!(validate_listing_mode("fixed_price").is_ok());
        assert!(validate_listing_mode("auction_open_bid").is_ok());
        assert!(validate_listing_mode("auction_sealed_bid").is_ok());
        assert!(validate_listing_mode("guild_donation_sale").is_ok());
        assert!(validate_listing_mode("raffle").is_err());
    }

    #[test]
    fn validates_supported_listing_visibility() {
        assert!(validate_listing_visibility("guild_only").is_ok());
        assert!(validate_listing_visibility("alliance_only").is_ok());
        assert!(validate_listing_visibility("tenant_market").is_ok());
        assert!(validate_listing_visibility("invite_only").is_ok());
        assert!(validate_listing_visibility("public_web").is_err());
    }

    #[test]
    fn maps_default_member_permissions() {
        assert!(permissions_for_role("guild_member").contains(&"listing:create"));
        assert!(permissions_for_role("guild_member").contains(&"listing:bid"));
        assert!(!permissions_for_role("guild_member").contains(&"listing:approve"));
    }

    #[test]
    fn maps_owner_permissions() {
        assert!(permissions_for_role("guild_owner").contains(&"member:invite"));
        assert!(permissions_for_role("guild_owner").contains(&"settlement:approve"));
        assert!(permissions_for_role("guild_owner").contains(&"treasury:manage"));
        assert!(permissions_for_role("guild_owner").contains(&"deposit:manage"));
        assert!(permissions_for_role("guild_owner").contains(&"warehouse:manage"));
    }

    #[test]
    fn maps_treasurer_and_warehouse_permissions() {
        assert!(permissions_for_role("guild_treasurer").contains(&"deposit:manage"));
        assert!(permissions_for_role("guild_treasurer").contains(&"treasury:manage"));
        assert!(permissions_for_role("guild_warehouse_manager").contains(&"warehouse:manage"));
        assert!(!permissions_for_role("guild_warehouse_manager").contains(&"treasury:manage"));
    }
}
