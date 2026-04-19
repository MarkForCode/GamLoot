-- SeaORM Migration: 005_disputes_moderation
-- Created at: 2026-04-18
-- Description: Add dispute, report, and user moderation schema

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS frozen_by INTEGER REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS freeze_reason TEXT;

CREATE TABLE IF NOT EXISTS dispute_cases (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    guild_id INTEGER REFERENCES guilds(id),
    listing_id INTEGER REFERENCES listings(id),
    procurement_order_id INTEGER REFERENCES procurement_orders(id),
    lottery_id INTEGER REFERENCES lotteries(id),
    opened_by INTEGER NOT NULL REFERENCES users(id),
    assigned_to INTEGER REFERENCES users(id),
    reason VARCHAR(80) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    resolution TEXT,
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dispute_messages (
    id SERIAL PRIMARY KEY,
    dispute_id INTEGER NOT NULL REFERENCES dispute_cases(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    is_internal_note BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    guild_id INTEGER REFERENCES guilds(id),
    reporter_user_id INTEGER NOT NULL REFERENCES users(id),
    reported_user_id INTEGER REFERENCES users(id),
    resource_type VARCHAR(80) NOT NULL,
    resource_id VARCHAR(64),
    reason VARCHAR(80) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    resolution TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO permissions (code, description)
VALUES
    ('dispute:create', 'Create dispute cases'),
    ('dispute:comment', 'Comment on dispute cases'),
    ('dispute:view', 'View dispute cases'),
    ('report:create', 'Create reports')
ON CONFLICT (code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_dispute_cases_tenant_status ON dispute_cases(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_dispute_cases_guild_status ON dispute_cases(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_dispute_cases_listing ON dispute_cases(listing_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute ON dispute_messages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_reports_tenant_status ON reports(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_guild_status ON reports(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);
