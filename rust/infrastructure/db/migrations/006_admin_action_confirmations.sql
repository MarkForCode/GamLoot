-- SeaORM Migration: 006_admin_action_confirmations
-- Created at: 2026-04-19
-- Description: Add confirmation tokens for sensitive CMS actions

CREATE TABLE IF NOT EXISTS admin_action_confirmations (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    actor_user_id INTEGER NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(64),
    confirmation_token VARCHAR(128) NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    consumed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_action_confirmations_actor ON admin_action_confirmations(actor_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_action_confirmations_token ON admin_action_confirmations(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_admin_action_confirmations_resource ON admin_action_confirmations(resource_type, resource_id);
