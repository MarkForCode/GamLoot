-- SeaORM Migration: 002_multi_tenant_guild_mvp
-- Created at: 2026-04-18
-- Description: Add multi-tenant guild trial/subscription core schema for MVP

CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(64) NOT NULL,
    seat_limit INTEGER NOT NULL,
    is_trial BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO plans (code, name, seat_limit, is_trial)
VALUES
    ('trial', 'Trial', 5, true),
    ('starter', 'Starter', 20, false),
    ('guild_pro', 'Guild Pro', 50, false),
    ('alliance', 'Alliance', 300, false)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS guilds (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    slug VARCHAR(80) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    owner_user_id INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, slug)
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id),
    ADD COLUMN IF NOT EXISTS guild_id INTEGER REFERENCES guilds(id),
    ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS invited_by INTEGER REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    guild_id INTEGER NOT NULL REFERENCES guilds(id),
    plan_id INTEGER NOT NULL REFERENCES plans(id),
    seat_limit INTEGER NOT NULL,
    seats_used INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trial_requests (
    id SERIAL PRIMARY KEY,
    applicant_email VARCHAR(255) NOT NULL,
    applicant_name VARCHAR(120),
    tenant_name VARCHAR(120) NOT NULL,
    guild_name VARCHAR(120) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guild_invitations (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    guild_id INTEGER NOT NULL REFERENCES guilds(id),
    email VARCHAR(255) NOT NULL,
    role_code VARCHAR(32) NOT NULL DEFAULT 'guild_member',
    invite_token VARCHAR(128) NOT NULL UNIQUE,
    temp_password_hash VARCHAR(255),
    invited_by INTEGER NOT NULL REFERENCES users(id),
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (guild_id, email)
);

CREATE TABLE IF NOT EXISTS guild_notices (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    guild_id INTEGER NOT NULL REFERENCES guilds(id),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    visibility VARCHAR(24) NOT NULL DEFAULT 'guild_all',
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMP,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guild_notice_reads (
    id SERIAL PRIMARY KEY,
    notice_id INTEGER NOT NULL REFERENCES guild_notices(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (notice_id, user_id)
);

CREATE TABLE IF NOT EXISTS listings (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    guild_id INTEGER NOT NULL REFERENCES guilds(id),
    seller_user_id INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    mode VARCHAR(24) NOT NULL,
    visibility VARCHAR(24) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'draft',
    start_price DECIMAL(12, 2),
    buyout_price DECIMAL(12, 2),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS listing_items (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES listings(id),
    item_name VARCHAR(150) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS listing_comments (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES listings(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    is_internal_note BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trade_settlements (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    guild_id INTEGER NOT NULL REFERENCES guilds(id),
    listing_id INTEGER NOT NULL REFERENCES listings(id),
    total_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    settled_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trade_settlement_recipients (
    id SERIAL PRIMARY KEY,
    settlement_id INTEGER NOT NULL REFERENCES trade_settlements(id),
    recipient_user_id INTEGER REFERENCES users(id),
    recipient_type VARCHAR(24) NOT NULL,
    share_ratio DECIMAL(5, 2) NOT NULL,
    share_amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    guild_id INTEGER REFERENCES guilds(id),
    actor_user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(64),
    before_data JSONB,
    after_data JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE guilds
    ADD CONSTRAINT fk_guilds_owner_user
    FOREIGN KEY (owner_user_id)
    REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_guild ON users(guild_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_guild ON subscriptions(guild_id);
CREATE INDEX IF NOT EXISTS idx_invitations_guild_email ON guild_invitations(guild_id, email);
CREATE INDEX IF NOT EXISTS idx_notices_guild ON guild_notices(guild_id);
CREATE INDEX IF NOT EXISTS idx_listings_guild_status ON listings(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_settlements_listing ON trade_settlements(listing_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created_at ON audit_logs(tenant_id, created_at);
