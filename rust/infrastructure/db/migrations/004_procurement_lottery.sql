-- SeaORM Migration: 004_procurement_lottery
-- Created at: 2026-04-18
-- Description: Add guild procurement orders and lottery event schema

CREATE TABLE IF NOT EXISTS procurement_orders (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    guild_id INTEGER NOT NULL REFERENCES guilds(id),
    requester_user_id INTEGER NOT NULL REFERENCES users(id),
    supplier_user_id INTEGER REFERENCES users(id),
    game_id INTEGER REFERENCES games(id),
    currency_id INTEGER REFERENCES game_currencies(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    order_type VARCHAR(32) NOT NULL DEFAULT 'one_time',
    visibility VARCHAR(32) NOT NULL DEFAULT 'guild_only',
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    budget_amount DECIMAL(12, 2),
    supplier_deposit_amount DECIMAL(12, 2),
    guild_donation_amount DECIMAL(12, 2),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    accepted_by INTEGER REFERENCES users(id),
    accepted_at TIMESTAMP,
    delivered_at TIMESTAMP,
    completed_by INTEGER REFERENCES users(id),
    completed_at TIMESTAMP,
    settled_at TIMESTAMP,
    cancellation_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS procurement_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES procurement_orders(id),
    game_item_id INTEGER REFERENCES game_items(id),
    item_name VARCHAR(150) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_budget_amount DECIMAL(12, 2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS procurement_order_eligibility_rules (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    order_id INTEGER NOT NULL REFERENCES procurement_orders(id),
    rule_type VARCHAR(32) NOT NULL,
    target_guild_id INTEGER REFERENCES guilds(id),
    target_alliance_id INTEGER REFERENCES alliances(id),
    target_user_id INTEGER REFERENCES users(id),
    target_role_id INTEGER REFERENCES roles(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS procurement_order_comments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES procurement_orders(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    is_internal_note BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lotteries (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    guild_id INTEGER REFERENCES guilds(id),
    game_id INTEGER REFERENCES games(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    lottery_type VARCHAR(32) NOT NULL DEFAULT 'free',
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    entry_limit_per_user INTEGER,
    starts_at TIMESTAMP,
    ends_at TIMESTAMP,
    created_by INTEGER NOT NULL REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    drawn_by INTEGER REFERENCES users(id),
    drawn_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lottery_eligibility_rules (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    lottery_id INTEGER NOT NULL REFERENCES lotteries(id),
    rule_type VARCHAR(32) NOT NULL,
    target_guild_id INTEGER REFERENCES guilds(id),
    target_alliance_id INTEGER REFERENCES alliances(id),
    target_user_id INTEGER REFERENCES users(id),
    target_role_id INTEGER REFERENCES roles(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lottery_entries (
    id SERIAL PRIMARY KEY,
    lottery_id INTEGER NOT NULL REFERENCES lotteries(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    guild_id INTEGER REFERENCES guilds(id),
    source_type VARCHAR(60),
    source_id VARCHAR(64),
    entry_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (lottery_id, user_id, source_type, source_id)
);

CREATE TABLE IF NOT EXISTS lottery_prizes (
    id SERIAL PRIMARY KEY,
    lottery_id INTEGER NOT NULL REFERENCES lotteries(id),
    warehouse_item_id INTEGER REFERENCES guild_warehouse_items(id),
    game_item_id INTEGER REFERENCES game_items(id),
    currency_id INTEGER REFERENCES game_currencies(id),
    prize_name VARCHAR(150) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    amount DECIMAL(12, 2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lottery_draw_results (
    id SERIAL PRIMARY KEY,
    lottery_id INTEGER NOT NULL REFERENCES lotteries(id),
    prize_id INTEGER NOT NULL REFERENCES lottery_prizes(id),
    winner_user_id INTEGER NOT NULL REFERENCES users(id),
    entry_id INTEGER NOT NULL REFERENCES lottery_entries(id),
    drawn_by INTEGER NOT NULL REFERENCES users(id),
    claimed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (lottery_id, prize_id)
);

INSERT INTO permissions (code, description)
VALUES
    ('order:accept', 'Accept procurement orders'),
    ('order:deliver', 'Deliver procurement orders'),
    ('lottery:enter', 'Enter lottery events')
ON CONFLICT (code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_procurement_orders_guild_status ON procurement_orders(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_procurement_orders_requester ON procurement_orders(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_procurement_orders_supplier ON procurement_orders(supplier_user_id);
CREATE INDEX IF NOT EXISTS idx_procurement_order_items_order ON procurement_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_procurement_order_eligibility_order ON procurement_order_eligibility_rules(order_id);
CREATE INDEX IF NOT EXISTS idx_procurement_order_comments_order ON procurement_order_comments(order_id);
CREATE INDEX IF NOT EXISTS idx_lotteries_tenant_status ON lotteries(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_lotteries_guild_status ON lotteries(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_lottery_eligibility_lottery ON lottery_eligibility_rules(lottery_id);
CREATE INDEX IF NOT EXISTS idx_lottery_entries_lottery_user ON lottery_entries(lottery_id, user_id);
CREATE INDEX IF NOT EXISTS idx_lottery_prizes_lottery ON lottery_prizes(lottery_id);
CREATE INDEX IF NOT EXISTS idx_lottery_draw_results_lottery ON lottery_draw_results(lottery_id);
