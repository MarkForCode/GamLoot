-- SeaORM Migration: 007_admin_auth
-- Created at: 2026-04-19
-- Description: Add CMS admin login, roles, permissions, and sessions

CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(80) UNIQUE,
    display_name VARCHAR(120) NOT NULL,
    password_hash TEXT NOT NULL,
    tenant_id INTEGER REFERENCES tenants(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    must_reset_password BOOLEAN NOT NULL DEFAULT true,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP,
    last_login_at TIMESTAMP,
    created_by INTEGER REFERENCES admin_users(id),
    disabled_by INTEGER REFERENCES admin_users(id),
    disabled_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_roles (
    id SERIAL PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_role_permissions (
    admin_role_id INTEGER NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
    admin_permission_id INTEGER NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (admin_role_id, admin_permission_id)
);

CREATE TABLE IF NOT EXISTS admin_user_roles (
    admin_user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    admin_role_id INTEGER NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES admin_users(id),
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (admin_user_id, admin_role_id)
);

CREATE TABLE IF NOT EXISTS admin_sessions (
    id SERIAL PRIMARY KEY,
    admin_user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    session_token VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_password_reset_tokens (
    id SERIAL PRIMARY KEY,
    admin_user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    reset_token VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_by INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(admin_user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_user_roles_user ON admin_user_roles(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_role_permissions_role ON admin_role_permissions(admin_role_id);

INSERT INTO admin_permissions (code, description)
VALUES
    ('cms.login', 'Log in to the CMS'),
    ('cms.dashboard.view', 'View CMS dashboard'),
    ('admin_user.create', 'Create CMS admin users'),
    ('admin_user.update', 'Update CMS admin users'),
    ('admin_user.disable', 'Disable CMS admin users'),
    ('admin_user.reset_password', 'Reset CMS admin user passwords'),
    ('admin_role.manage', 'Manage CMS roles and permissions'),
    ('tenant.view', 'View tenants'),
    ('tenant.manage', 'Manage tenants'),
    ('guild.view', 'View guilds'),
    ('guild.freeze', 'Freeze guilds'),
    ('trial_request.view', 'View trial requests'),
    ('trial_request.approve', 'Approve trial requests'),
    ('listing.view', 'View listings'),
    ('listing.freeze', 'Freeze listings'),
    ('user.view', 'View users'),
    ('user.freeze', 'Freeze users'),
    ('treasury.view', 'View treasury records'),
    ('warehouse.view', 'View warehouse records'),
    ('deposit.view', 'View trade deposits'),
    ('settlement.view', 'View settlements'),
    ('dispute.view', 'View disputes'),
    ('dispute.resolve', 'Resolve disputes'),
    ('report.view', 'View reports'),
    ('report.resolve', 'Resolve reports'),
    ('audit_log.view', 'View audit logs'),
    ('admin_action.view', 'View admin actions')
ON CONFLICT (code) DO NOTHING;

INSERT INTO admin_roles (code, name, description, is_system)
VALUES
    ('platform_admin', 'Platform Admin', 'Full CMS access', true),
    ('platform_operator', 'Platform Operator', 'Trial review and trade moderation', true),
    ('platform_support', 'Platform Support', 'Dispute and report support', true),
    ('platform_finance', 'Platform Finance', 'Treasury, deposits, and settlements', true),
    ('platform_auditor', 'Platform Auditor', 'Read-only audit access', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO admin_role_permissions (admin_role_id, admin_permission_id)
SELECT r.id, p.id
FROM admin_roles r
CROSS JOIN admin_permissions p
WHERE r.code = 'platform_admin'
ON CONFLICT DO NOTHING;

INSERT INTO admin_role_permissions (admin_role_id, admin_permission_id)
SELECT r.id, p.id
FROM admin_roles r
JOIN admin_permissions p ON p.code IN (
    'cms.login',
    'cms.dashboard.view',
    'tenant.view',
    'guild.view',
    'guild.freeze',
    'trial_request.view',
    'trial_request.approve',
    'listing.view',
    'listing.freeze',
    'dispute.view',
    'dispute.resolve',
    'report.view',
    'report.resolve'
)
WHERE r.code = 'platform_operator'
ON CONFLICT DO NOTHING;

INSERT INTO admin_role_permissions (admin_role_id, admin_permission_id)
SELECT r.id, p.id
FROM admin_roles r
JOIN admin_permissions p ON p.code IN (
    'cms.login',
    'cms.dashboard.view',
    'trial_request.view',
    'listing.view',
    'dispute.view',
    'dispute.resolve',
    'report.view',
    'report.resolve'
)
WHERE r.code = 'platform_support'
ON CONFLICT DO NOTHING;

INSERT INTO admin_role_permissions (admin_role_id, admin_permission_id)
SELECT r.id, p.id
FROM admin_roles r
JOIN admin_permissions p ON p.code IN (
    'cms.login',
    'cms.dashboard.view',
    'treasury.view',
    'deposit.view',
    'settlement.view',
    'audit_log.view'
)
WHERE r.code = 'platform_finance'
ON CONFLICT DO NOTHING;

INSERT INTO admin_role_permissions (admin_role_id, admin_permission_id)
SELECT r.id, p.id
FROM admin_roles r
JOIN admin_permissions p ON p.code IN (
    'cms.login',
    'cms.dashboard.view',
    'audit_log.view',
    'admin_action.view',
    'tenant.view',
    'guild.view',
    'listing.view'
)
WHERE r.code = 'platform_auditor'
ON CONFLICT DO NOTHING;

INSERT INTO admin_users (
    email,
    username,
    display_name,
    password_hash,
    is_active,
    must_reset_password
)
VALUES (
    'admin@example.com',
    'admin',
    'Platform Admin',
    'admin-password-hash',
    true,
    false
)
ON CONFLICT (email) DO UPDATE
SET display_name = EXCLUDED.display_name,
    is_active = true,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO admin_user_roles (admin_user_id, admin_role_id)
SELECT u.id, r.id
FROM admin_users u
JOIN admin_roles r ON r.code = 'platform_admin'
WHERE u.email = 'admin@example.com'
ON CONFLICT DO NOTHING;
