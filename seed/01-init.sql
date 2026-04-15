-- Seed data for gam_trade database

-- Categories for game trading
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO categories (name, slug, description, icon) VALUES
    ('Games Accounts', 'games-accounts', 'Game account trading', 'gamepad'),
    ('Game Coins', 'game-coins', 'In-game currency', 'coins'),
    ('Game Items', 'game-items', 'Virtual items & equipment', 'box'),
    ('Gift Cards', 'gift-cards', 'Digital gift cards', 'credit-card'),
    ('Game Keys', 'game-keys', 'Game activation keys', 'key');

-- Sample users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    balance DECIMAL(12, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role, balance) VALUES
    ('admin', 'admin@gamtrade.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIq.hOiWXu', 'admin', 10000.00),
    ('seller01', 'seller01@gamtrade.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIq.hOiWXu', 'seller', 5000.00),
    ('buyer01', 'buyer01@gamtrade.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIq.hOiWXu', 'buyer', 3000.00);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER NOT NULL REFERENCES users(id),
    category_id INTEGER NOT NULL REFERENCES categories(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    game_name VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2),
    stock INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'active',
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (seller_id, category_id, title, description, game_name, price, original_price, stock) VALUES
    (2, 1, 'LOL Diamond Rank Account', 'Level 30, Diamond rank, many skins', 'League of Legends', 150.00, 200.00, 1),
    (2, 2, 'Genshin Impact - 10000 Primogems', 'Direct in-game delivery', 'Genshin Impact', 80.00, 100.00, 99),
    (2, 3, 'Valorant Reaver Vandal Skin', 'Factory new, unused', 'Valorant', 25.00, 35.00, 5),
    (2, 4, 'Steam $50 Gift Card', 'Global region, instant delivery', 'Steam', 45.00, 50.00, 20),
    (2, 5, 'Elden Ring Steam Key', 'Global key, instant', 'Elden Ring', 40.00, 60.00, 10);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    buyer_id INTEGER NOT NULL REFERENCES users(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER DEFAULT 1,
    total_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO orders (buyer_id, product_id, quantity, total_price, status, payment_method) VALUES
    (3, 1, 1, 150.00, 'completed', 'stripe'),
    (3, 2, 2, 160.00, 'processing', 'stripe');

-- Settings table for CMS
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO settings (setting_key, setting_value, description) VALUES
    ('site_name', 'GameTrade', 'Website name'),
    ('site_commission', '5', 'Platform Commission (%)'),
    ('min_withdraw', '100', 'Minimum withdraw amount'),
    (' maintenance_mode', 'false', 'Maintenance mode status');

-- Setsequence for proper ID generation
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));
SELECT setval('orders_id_seq', (SELECT MAX(id) FROM orders));
SELECT setval('settings_id_seq', (SELECT MAX(id) FROM settings));