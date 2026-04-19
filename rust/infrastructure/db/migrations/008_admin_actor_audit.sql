-- SeaORM Migration: 008_admin_actor_audit
-- Created at: 2026-04-19
-- Description: Track CMS admin actors on audit, admin actions, and confirmations

ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS actor_admin_user_id INTEGER REFERENCES admin_users(id);

ALTER TABLE admin_actions
    ADD COLUMN IF NOT EXISTS actor_admin_user_id INTEGER REFERENCES admin_users(id);

ALTER TABLE admin_action_confirmations
    ADD COLUMN IF NOT EXISTS actor_admin_user_id INTEGER REFERENCES admin_users(id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_actor_created
    ON audit_logs(actor_admin_user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_actor_created
    ON admin_actions(actor_admin_user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_admin_action_confirmations_admin_actor
    ON admin_action_confirmations(actor_admin_user_id, created_at);
