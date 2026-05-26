-- Demo accounts used by web/native smoke and Appium tests.
-- Kept separate from 01-init.sql so existing local databases can be repaired
-- without resetting Docker volumes.

WITH tenant_row AS (
    INSERT INTO tenants (code, name)
    VALUES ('demo-gamloot', 'GamLoot Demo Tenant')
    ON CONFLICT (code) DO UPDATE
        SET name = EXCLUDED.name,
            updated_at = CURRENT_TIMESTAMP
    RETURNING id
),
guild_row AS (
    INSERT INTO guilds (tenant_id, slug, name)
    SELECT id, 'demo-guild', 'GamLoot Demo Guild'
    FROM tenant_row
    ON CONFLICT (tenant_id, slug) DO UPDATE
        SET name = EXCLUDED.name,
            is_active = true,
            updated_at = CURRENT_TIMESTAMP
    RETURNING id, tenant_id
),
owner_user AS (
    INSERT INTO users (
        username,
        email,
        password_hash,
        role,
        balance,
        is_active,
        tenant_id,
        guild_id,
        must_reset_password,
        frozen_at,
        frozen_by,
        freeze_reason
    )
    SELECT
        'flow-owner',
        'flow-owner@gamloot.local',
        'temporary-password-hash',
        'guild_owner',
        10000.00,
        true,
        tenant_id,
        id,
        false,
        NULL,
        NULL,
        NULL
    FROM guild_row
    ON CONFLICT (username) DO UPDATE
        SET email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            balance = EXCLUDED.balance,
            is_active = true,
            tenant_id = EXCLUDED.tenant_id,
            guild_id = EXCLUDED.guild_id,
            must_reset_password = false,
            frozen_at = NULL,
            frozen_by = NULL,
            freeze_reason = NULL,
            updated_at = CURRENT_TIMESTAMP
    RETURNING id, tenant_id, guild_id
),
buyer_user AS (
    INSERT INTO users (
        username,
        email,
        password_hash,
        role,
        balance,
        is_active,
        tenant_id,
        guild_id,
        must_reset_password,
        frozen_at,
        frozen_by,
        freeze_reason
    )
    SELECT
        'demo-buyer',
        'demo-buyer@gamloot.local',
        'buyer-password-hash',
        'buyer',
        3000.00,
        true,
        tenant_id,
        id,
        false,
        NULL,
        NULL,
        NULL
    FROM guild_row
    ON CONFLICT (username) DO UPDATE
        SET email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            balance = EXCLUDED.balance,
            is_active = true,
            tenant_id = EXCLUDED.tenant_id,
            guild_id = EXCLUDED.guild_id,
            must_reset_password = false,
            frozen_at = NULL,
            frozen_by = NULL,
            freeze_reason = NULL,
            updated_at = CURRENT_TIMESTAMP
    RETURNING id, tenant_id, guild_id
)
UPDATE guilds
SET owner_user_id = owner_user.id,
    is_active = true,
    frozen_at = NULL,
    frozen_by = NULL,
    freeze_reason = NULL,
    updated_at = CURRENT_TIMESTAMP
FROM owner_user
WHERE guilds.id = owner_user.guild_id;

UPDATE guilds
SET owner_user_id = users.id,
    is_active = true,
    frozen_at = NULL,
    frozen_by = NULL,
    freeze_reason = NULL,
    updated_at = CURRENT_TIMESTAMP
FROM users
WHERE guilds.id = users.guild_id
  AND users.username = 'flow-owner';
