-- SeaORM Migration: 009_api_diagnostic_log_rules
-- Created at: 2026-06-14
-- Description: Add short-lived Loki diagnostic log rules for selected APIs

CREATE TABLE IF NOT EXISTS api_diagnostic_log_rules (
    id SERIAL PRIMARY KEY,
    service VARCHAR(80) NOT NULL,
    method VARCHAR(16) NOT NULL,
    route VARCHAR(255) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP NOT NULL,
    reason TEXT NOT NULL,
    created_by_admin_user_id INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_api_diagnostic_log_rules_target UNIQUE (service, method, route),
    CONSTRAINT chk_api_diagnostic_log_rules_service CHECK (service IN ('user-api')),
    CONSTRAINT chk_api_diagnostic_log_rules_reason CHECK (length(trim(reason)) > 0),
    CONSTRAINT chk_api_diagnostic_log_rules_route CHECK (route LIKE '/%')
);

CREATE INDEX IF NOT EXISTS idx_api_diagnostic_log_rules_active
    ON api_diagnostic_log_rules(service, method, route, expires_at)
    WHERE enabled = true;

INSERT INTO admin_permissions (code, description)
VALUES ('observability.diagnostic_log.manage', 'Manage short-lived Loki diagnostic logging rules')
ON CONFLICT (code) DO NOTHING;

INSERT INTO admin_role_permissions (admin_role_id, admin_permission_id)
SELECT r.id, p.id
FROM admin_roles r
JOIN admin_permissions p ON p.code = 'observability.diagnostic_log.manage'
WHERE r.code = 'platform_admin'
ON CONFLICT DO NOTHING;
