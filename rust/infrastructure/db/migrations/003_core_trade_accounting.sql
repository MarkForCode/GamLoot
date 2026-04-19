-- SeaORM Migration: 003_core_trade_accounting
-- Created at: 2026-04-18
-- Description: Add core game, RBAC, bidding, deposit, treasury, and warehouse schema

CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    code VARCHAR(64) NOT NULL,
    name VARCHAR(120) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS game_currencies (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    game_id INTEGER NOT NULL REFERENCES games(id),
    code VARCHAR(32) NOT NULL,
    name VARCHAR(80) NOT NULL,
    decimal_places SMALLINT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (game_id, code)
);

CREATE TABLE IF NOT EXISTS game_items (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    game_id INTEGER NOT NULL REFERENCES games(id),
    external_code VARCHAR(100),
    name VARCHAR(150) NOT NULL,
    item_type VARCHAR(60),
    rarity VARCHAR(60),
    is_stackable BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (game_id, external_code)
);

CREATE TABLE IF NOT EXISTS alliances (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    game_id INTEGER REFERENCES games(id),
    slug VARCHAR(80) NOT NULL,
    name VARCHAR(120) NOT NULL,
    owner_guild_id INTEGER REFERENCES guilds(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS alliance_guilds (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    alliance_id INTEGER NOT NULL REFERENCES alliances(id),
    guild_id INTEGER NOT NULL REFERENCES guilds(id),
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    UNIQUE (alliance_id, guild_id)
);

CREATE TABLE IF NOT EXISTS guild_members (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    guild_id INTEGER NOT NULL REFERENCES guilds(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    display_name VARCHAR(120),
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    invited_by INTEGER REFERENCES users(id),
    suspended_at TIMESTAMP,
    left_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    guild_id INTEGER REFERENCES guilds(id),
    code VARCHAR(64) NOT NULL,
    name VARCHAR(100) NOT NULL,
    scope VARCHAR(24) NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, guild_id, code)
);

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    permission_id INTEGER NOT NULL REFERENCES permissions(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS member_roles (
    id SERIAL PRIMARY KEY,
    guild_member_id INTEGER NOT NULL REFERENCES guild_members(id),
    role_id INTEGER NOT NULL REFERENCES roles(id),
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (guild_member_id, role_id)
);

ALTER TABLE guilds
    ADD COLUMN IF NOT EXISTS game_id INTEGER REFERENCES games(id),
    ADD COLUMN IF NOT EXISTS alliance_id INTEGER REFERENCES alliances(id),
    ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS frozen_by INTEGER REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS freeze_reason TEXT;

ALTER TABLE listings
    ADD COLUMN IF NOT EXISTS game_id INTEGER REFERENCES games(id),
    ADD COLUMN IF NOT EXISTS alliance_id INTEGER REFERENCES alliances(id),
    ADD COLUMN IF NOT EXISTS currency_id INTEGER REFERENCES game_currencies(id),
    ADD COLUMN IF NOT EXISTS min_bid_increment DECIMAL(12, 2),
    ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS matched_bid_id INTEGER,
    ADD COLUMN IF NOT EXISTS matched_buyer_user_id INTEGER REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS frozen_by INTEGER REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS freeze_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

ALTER TABLE listing_items
    ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id),
    ADD COLUMN IF NOT EXISTS game_id INTEGER REFERENCES games(id),
    ADD COLUMN IF NOT EXISTS game_item_id INTEGER REFERENCES game_items(id),
    ADD COLUMN IF NOT EXISTS currency_id INTEGER REFERENCES game_currencies(id),
    ADD COLUMN IF NOT EXISTS price_amount DECIMAL(12, 2);

CREATE TABLE IF NOT EXISTS listing_visibility_rules (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    listing_id INTEGER NOT NULL REFERENCES listings(id),
    rule_type VARCHAR(32) NOT NULL,
    target_guild_id INTEGER REFERENCES guilds(id),
    target_alliance_id INTEGER REFERENCES alliances(id),
    target_user_id INTEGER REFERENCES users(id),
    target_role_id INTEGER REFERENCES roles(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS listing_bid_eligibility_rules (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    listing_id INTEGER NOT NULL REFERENCES listings(id),
    rule_type VARCHAR(32) NOT NULL,
    target_guild_id INTEGER REFERENCES guilds(id),
    target_alliance_id INTEGER REFERENCES alliances(id),
    target_user_id INTEGER REFERENCES users(id),
    target_role_id INTEGER REFERENCES roles(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS listing_bids (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    listing_id INTEGER NOT NULL REFERENCES listings(id),
    bidder_user_id INTEGER NOT NULL REFERENCES users(id),
    bidder_guild_id INTEGER REFERENCES guilds(id),
    currency_id INTEGER NOT NULL REFERENCES game_currencies(id),
    amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    is_auto_bid BOOLEAN NOT NULL DEFAULT false,
    placed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancelled_by INTEGER REFERENCES users(id),
    cancel_reason TEXT
);

ALTER TABLE listings
    ADD CONSTRAINT fk_listings_matched_bid
    FOREIGN KEY (matched_bid_id)
    REFERENCES listing_bids(id);

CREATE TABLE IF NOT EXISTS trade_deposits (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    guild_id INTEGER NOT NULL REFERENCES guilds(id),
    listing_id INTEGER REFERENCES listings(id),
    bid_id INTEGER REFERENCES listing_bids(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    role VARCHAR(24) NOT NULL,
    currency_id INTEGER NOT NULL REFERENCES game_currencies(id),
    amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'required',
    held_at TIMESTAMP,
    released_at TIMESTAMP,
    forfeited_at TIMESTAMP,
    applied_at TIMESTAMP,
    handled_by INTEGER REFERENCES users(id),
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE trade_settlements
    ADD COLUMN IF NOT EXISTS game_id INTEGER REFERENCES games(id),
    ADD COLUMN IF NOT EXISTS currency_id INTEGER REFERENCES game_currencies(id),
    ADD COLUMN IF NOT EXISTS completed_by INTEGER REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS dispute_reason TEXT;

ALTER TABLE trade_settlement_recipients
    ADD COLUMN IF NOT EXISTS currency_id INTEGER REFERENCES game_currencies(id),
    ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id),
    ADD COLUMN IF NOT EXISTS guild_id INTEGER REFERENCES guilds(id),
    ADD COLUMN IF NOT EXISTS platform_account_code VARCHAR(64);

CREATE TABLE IF NOT EXISTS guild_treasury_accounts (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    guild_id INTEGER NOT NULL REFERENCES guilds(id),
    currency_id INTEGER NOT NULL REFERENCES game_currencies(id),
    balance DECIMAL(18, 2) NOT NULL DEFAULT 0,
    held_balance DECIMAL(18, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (guild_id, currency_id)
);

CREATE TABLE IF NOT EXISTS guild_treasury_ledger_entries (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    guild_id INTEGER NOT NULL REFERENCES guilds(id),
    account_id INTEGER NOT NULL REFERENCES guild_treasury_accounts(id),
    currency_id INTEGER NOT NULL REFERENCES game_currencies(id),
    entry_type VARCHAR(40) NOT NULL,
    amount_delta DECIMAL(18, 2) NOT NULL,
    held_amount_delta DECIMAL(18, 2) NOT NULL DEFAULT 0,
    balance_after DECIMAL(18, 2),
    held_balance_after DECIMAL(18, 2),
    source_type VARCHAR(60),
    source_id VARCHAR(64),
    reason TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guild_warehouse_items (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    guild_id INTEGER NOT NULL REFERENCES guilds(id),
    game_id INTEGER NOT NULL REFERENCES games(id),
    game_item_id INTEGER REFERENCES game_items(id),
    item_name VARCHAR(150) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(24) NOT NULL DEFAULT 'available',
    custodian_user_id INTEGER REFERENCES users(id),
    source_type VARCHAR(60),
    source_id VARCHAR(64),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guild_warehouse_movements (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    guild_id INTEGER NOT NULL REFERENCES guilds(id),
    warehouse_item_id INTEGER NOT NULL REFERENCES guild_warehouse_items(id),
    movement_type VARCHAR(40) NOT NULL,
    quantity_delta INTEGER NOT NULL,
    from_status VARCHAR(24),
    to_status VARCHAR(24),
    related_listing_id INTEGER REFERENCES listings(id),
    related_settlement_id INTEGER REFERENCES trade_settlements(id),
    reason TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_actions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    guild_id INTEGER REFERENCES guilds(id),
    actor_user_id INTEGER NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(64),
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO permissions (code, description)
VALUES
    ('notice:manage', 'Manage guild notices'),
    ('member:invite', 'Invite guild members'),
    ('member:role_manage', 'Manage guild member roles'),
    ('listing:create', 'Create listings'),
    ('listing:approve', 'Approve listings'),
    ('listing:bid', 'Bid on listings'),
    ('listing:restrict_bidders', 'Restrict listing bidders'),
    ('order:create', 'Create procurement orders'),
    ('order:approve', 'Approve procurement orders'),
    ('settlement:approve', 'Approve settlements'),
    ('treasury:view', 'View guild treasury'),
    ('treasury:manage', 'Manage guild treasury'),
    ('warehouse:view', 'View guild warehouse'),
    ('warehouse:manage', 'Manage guild warehouse'),
    ('deposit:manage', 'Manage trade deposits'),
    ('lottery:manage', 'Manage lottery events'),
    ('admin:tenant_manage', 'Manage tenants'),
    ('admin:guild_manage', 'Manage guilds'),
    ('admin:trade_moderate', 'Moderate trades')
ON CONFLICT (code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_games_tenant ON games(tenant_id);
CREATE INDEX IF NOT EXISTS idx_game_currencies_game ON game_currencies(game_id);
CREATE INDEX IF NOT EXISTS idx_game_items_game ON game_items(game_id);
CREATE INDEX IF NOT EXISTS idx_alliances_tenant ON alliances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alliance_guilds_guild ON alliance_guilds(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_user ON guild_members(user_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_guild_status ON guild_members(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_roles_scope ON roles(scope, tenant_id, guild_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_role ON member_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_listings_game_status ON listings(game_id, status);
CREATE INDEX IF NOT EXISTS idx_listing_visibility_listing ON listing_visibility_rules(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_eligibility_listing ON listing_bid_eligibility_rules(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_bids_listing_amount ON listing_bids(listing_id, amount);
CREATE INDEX IF NOT EXISTS idx_listing_bids_bidder ON listing_bids(bidder_user_id);
CREATE INDEX IF NOT EXISTS idx_trade_deposits_listing_status ON trade_deposits(listing_id, status);
CREATE INDEX IF NOT EXISTS idx_trade_deposits_user_status ON trade_deposits(user_id, status);
CREATE INDEX IF NOT EXISTS idx_treasury_accounts_guild ON guild_treasury_accounts(guild_id);
CREATE INDEX IF NOT EXISTS idx_treasury_ledger_account_created ON guild_treasury_ledger_entries(account_id, created_at);
CREATE INDEX IF NOT EXISTS idx_treasury_ledger_source ON guild_treasury_ledger_entries(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_items_guild_status ON guild_warehouse_items(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_warehouse_movements_item ON guild_warehouse_movements(warehouse_item_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_actor_created ON admin_actions(actor_user_id, created_at);
