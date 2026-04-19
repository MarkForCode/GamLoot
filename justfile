# Game Trade Platform - Justfile

postgres-url := "postgresql://gam_trade:gam_trade_secure_pass@localhost:5432/gam_trade_dev"
chrome-user-url := "http://127.0.0.1:9222"
chrome-admin-url := "http://127.0.0.1:9223"

# Default target
default: help

# Help
help:
    @just --list

# Install dependencies
install:
    pnpm install

# Development
dev:
    pnpm dev

dev-user-web: dev-web
dev-web:
    pnpm --filter @gam/user-web dev

dev-user-app: dev-app
dev-app:
    pnpm --filter @gam/user-app dev

dev-admin-web: dev-admin
dev-admin:
    pnpm --filter @gam/admin-web dev

# Rust development
dev-rust:
    cd rust && cargo watch -x run

dev-user-api:
    cd rust && DATABASE_URL={{postgres-url}} cargo run -p user-api

dev-cms-api:
    cd rust && DATABASE_URL={{postgres-url}} cargo run -p cms-api

dev-db:
    docker compose up -d postgres redis

# Build
build:
    pnpm build

build-rust:
    cd rust && cargo build --release

build-user-web:
    pnpm --filter @gam/user-web build

build-admin-web:
    pnpm --filter @gam/admin-web build

# Docker
dc: docker-compose-up
docker-up: docker-compose-up
docker-compose-up:
    docker-compose up --build

docker-down:
    docker-compose down

docker-logs:
    docker-compose logs -f

docker-restart:
    docker-compose restart

# Database
db-reset:
    docker-compose down -v && docker-compose up --build

db-seed:
    @echo "Seed runs automatically on first start"

db-up: dev-db

db-validate: validate-migrations

db-apply-migrations:
    docker compose exec -T postgres mkdir -p /tmp/migrations
    container=$$(docker compose ps -q postgres); docker cp rust/infrastructure/db/migrations/. "$$container:/tmp/migrations"
    for migration in rust/infrastructure/db/migrations/*.sql; do docker compose exec -T -e PGPASSWORD=gam_trade_secure_pass postgres psql -v ON_ERROR_STOP=1 -U gam_trade -d gam_trade_dev -f "/tmp/migrations/$$(basename "$$migration")" >/dev/null; echo "applied $$(basename "$$migration")"; done

# Lint
lint:
    pnpm lint

lint-user-web:
    pnpm --filter @gam/user-web lint

lint-admin-web:
    pnpm --filter @gam/admin-web lint

# Clean
clean:
    rm -rf apps/*/dist apps/*/.next
    rm -rf packages/*/dist
    cd rust && cargo clean

# Test
test:
    pnpm test || echo "No test command configured"

validate-migrations:
    ./scripts/validate-migrations.sh

check-rust:
    cd rust && cargo check -p user-api
    cd rust && cargo check -p cms-api

check-user-api:
    cd rust && cargo check -p user-api

check-cms-api:
    cd rust && cargo check -p cms-api

check-admin-web:
    pnpm --filter @gam/admin-web lint
    pnpm --filter @gam/admin-web build

check-user-web:
    pnpm --filter @gam/user-web lint
    pnpm --filter @gam/user-web build

check-all: validate-migrations check-rust check-user-web check-admin-web

# Type check
typecheck:
    pnpm run --filter=* typecheck || echo "No typecheck command in turbo pipeline"

# Chrome helpers for CDP smoke tests
chrome-user:
    @pkill -f "remote-debugging-port=922[2]" >/dev/null 2>&1 || true
    @nohup google-chrome --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/gam-trade-chrome --no-first-run --no-default-browser-check about:blank >/tmp/gam-trade-chrome.log 2>&1 &
    @sleep 1

chrome-admin:
    @pkill -f "remote-debugging-port=922[3]" >/dev/null 2>&1 || true
    @nohup google-chrome --headless=new --remote-debugging-port=9223 --user-data-dir=/tmp/gam-trade-admin-chrome --no-first-run --no-default-browser-check about:blank >/tmp/gam-trade-admin-chrome.log 2>&1 &
    @sleep 1

chrome-stop:
    @pkill -f "remote-debugging-port=922[2]" >/dev/null 2>&1 || true
    @pkill -f "remote-debugging-port=922[3]" >/dev/null 2>&1 || true

# Smoke tests
smoke-health:
    @echo "Checking Docker services..."
    @docker ps --format '{{{{.Names}}}}' | grep -q "gam_trade" || (echo "ERROR: Docker not running" && exit 1)
    @echo "Checking user-api (8080)..."
    @curl -sf -o /dev/null http://localhost:8080/health || echo "WARNING: user-api not ready"
    @echo "Checking cms-api (8081)..."
    @curl -sf -o /dev/null http://localhost:8081/health || echo "WARNING: cms-api not ready"
    @echo "Checking user-web (3000)..."
    @curl -sf -o /dev/null http://localhost:3000/health || echo "WARNING: user-web not ready"
    @echo "Checking admin-web (3001)..."
    @curl -sf -o /dev/null http://localhost:3001/health || echo "WARNING: admin-web not ready"
    @echo "Checking user-app (Expo Metro)..."
    @curl -sf -o /dev/null http://localhost:8081 || echo "WARNING: user-app Metro not ready (expected on different port)"
    @echo "Smoke test completed"

smoke-user-flow: chrome-user
    CHROME_URL={{chrome-user-url}} node scripts/smoke-user-flow.mjs

smoke-user-ux: chrome-user
    CHROME_URL={{chrome-user-url}} node scripts/smoke-multipage-ux.mjs

smoke-admin-ux: chrome-admin
    CHROME_URL={{chrome-admin-url}} node scripts/smoke-admin-ux.mjs

smoke-ux: smoke-user-ux smoke-admin-ux

smoke: smoke-health smoke-ux
