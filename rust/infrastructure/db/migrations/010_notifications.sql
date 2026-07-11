-- SeaORM Migration: 010_notifications
-- Created at: 2026-06-28
-- Description: Add notification event outbox, in-app inbox, rule, integration, and delivery schema

CREATE TABLE IF NOT EXISTS notification_events (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    guild_id INTEGER REFERENCES guilds(id),
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(60) NOT NULL,
    severity VARCHAR(24) NOT NULL DEFAULT 'info',
    actor_user_id INTEGER REFERENCES users(id),
    actor_admin_user_id INTEGER REFERENCES admin_users(id),
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(64) NOT NULL,
    dedupe_key VARCHAR(200) NOT NULL UNIQUE,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_rules (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    guild_id INTEGER REFERENCES guilds(id),
    name VARCHAR(120) NOT NULL,
    description TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT true,
    event_category VARCHAR(60),
    event_type VARCHAR(100),
    severity_min VARCHAR(24),
    conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
    recipient_scope VARCHAR(60) NOT NULL DEFAULT 'resource_owner',
    created_by_admin_user_id INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_rule_actions (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER NOT NULL REFERENCES notification_rules(id),
    action_type VARCHAR(60) NOT NULL,
    channel VARCHAR(40) NOT NULL,
    template_key VARCHAR(100),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS discord_integrations (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    guild_id INTEGER NOT NULL REFERENCES guilds(id),
    name VARCHAR(120) NOT NULL,
    webhook_url_secret_ref VARCHAR(255) NOT NULL,
    default_channel_label VARCHAR(120),
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    last_success_at TIMESTAMP,
    last_failure_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES notification_events(id),
    rule_id INTEGER REFERENCES notification_rules(id),
    action_id INTEGER REFERENCES notification_rule_actions(id),
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    guild_id INTEGER REFERENCES guilds(id),
    channel VARCHAR(40) NOT NULL,
    recipient_user_id INTEGER REFERENCES users(id),
    integration_id INTEGER REFERENCES discord_integrations(id),
    idempotency_key VARCHAR(240) NOT NULL UNIQUE,
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error_code VARCHAR(80),
    last_error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS in_app_notifications (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    guild_id INTEGER REFERENCES guilds(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    event_id INTEGER NOT NULL REFERENCES notification_events(id),
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    severity VARCHAR(24) NOT NULL DEFAULT 'info',
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(64) NOT NULL,
    link_path VARCHAR(255),
    read_at TIMESTAMP,
    archived_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, event_id)
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    guild_id INTEGER REFERENCES guilds(id),
    user_id INTEGER REFERENCES users(id),
    event_category VARCHAR(60),
    event_type VARCHAR(100),
    channel VARCHAR(40) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    minimum_severity VARCHAR(24) NOT NULL DEFAULT 'info',
    quiet_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, guild_id, user_id, event_category, event_type, channel)
);

CREATE TABLE IF NOT EXISTS inbound_webhook_sources (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    guild_id INTEGER REFERENCES guilds(id),
    source_code VARCHAR(100) NOT NULL,
    name VARCHAR(120) NOT NULL,
    secret_ref VARCHAR(255) NOT NULL,
    signature_header VARCHAR(120) NOT NULL DEFAULT 'x-gam-signature',
    timestamp_header VARCHAR(120) NOT NULL DEFAULT 'x-gam-timestamp',
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_by_admin_user_id INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, source_code)
);

CREATE TABLE IF NOT EXISTS inbound_webhook_events (
    id SERIAL PRIMARY KEY,
    source_id INTEGER NOT NULL REFERENCES inbound_webhook_sources(id),
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    guild_id INTEGER REFERENCES guilds(id),
    external_event_id VARCHAR(160),
    idempotency_key VARCHAR(240) NOT NULL UNIQUE,
    signature_valid BOOLEAN NOT NULL DEFAULT false,
    received_headers JSONB NOT NULL DEFAULT '{}'::jsonb,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    notification_event_id INTEGER REFERENCES notification_events(id),
    status VARCHAR(24) NOT NULL DEFAULT 'received',
    error_message TEXT,
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_action_runs (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES notification_events(id),
    rule_id INTEGER REFERENCES notification_rules(id),
    action_id INTEGER REFERENCES notification_rule_actions(id),
    run_type VARCHAR(40) NOT NULL DEFAULT 'automatic',
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    request_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    created_by_admin_user_id INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO permissions (code, description)
VALUES
    ('notification:view', 'View notification inbox and settings'),
    ('notification:manage', 'Manage guild notification integrations and rules')
ON CONFLICT (code) DO NOTHING;

INSERT INTO admin_permissions (code, description)
VALUES
    ('notification.view', 'View notification events, deliveries, and action runs'),
    ('notification.manage', 'Manage platform notification rules and retries')
ON CONFLICT (code) DO NOTHING;

INSERT INTO admin_role_permissions (admin_role_id, admin_permission_id)
SELECT r.id, p.id
FROM admin_roles r
CROSS JOIN admin_permissions p
WHERE r.code = 'platform_admin'
  AND p.code IN ('notification.view', 'notification.manage')
ON CONFLICT DO NOTHING;

INSERT INTO admin_role_permissions (admin_role_id, admin_permission_id)
SELECT r.id, p.id
FROM admin_roles r
CROSS JOIN admin_permissions p
WHERE r.code IN ('platform_operator', 'platform_support', 'platform_auditor')
  AND p.code = 'notification.view'
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_notification_events_pending
    ON notification_events(status, next_attempt_at, id);
CREATE INDEX IF NOT EXISTS idx_notification_events_tenant_created
    ON notification_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_events_resource
    ON notification_events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_notification_rules_scope
    ON notification_rules(enabled, tenant_id, guild_id, event_category, event_type, priority DESC);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_event
    ON notification_deliveries(event_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_tenant_created
    ON notification_deliveries(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_created
    ON in_app_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_unread
    ON in_app_notifications(user_id, read_at)
    WHERE read_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_preferences_scope_unique
    ON notification_preferences (
        tenant_id,
        COALESCE(guild_id, -1),
        COALESCE(user_id, -1),
        COALESCE(event_category, ''),
        COALESCE(event_type, ''),
        channel
    );
CREATE INDEX IF NOT EXISTS idx_discord_integrations_guild
    ON discord_integrations(guild_id, enabled);
CREATE INDEX IF NOT EXISTS idx_inbound_webhook_events_source
    ON inbound_webhook_events(source_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_action_runs_event
    ON notification_action_runs(event_id);
