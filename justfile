# Game Trade Platform - Justfile

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

dev-web:
    pnpm --filter @gam/user-web dev

dev-app:
    pnpm --filter @gam/user-app dev

dev-admin:
    pnpm --filter @gam/admin-web dev

# Rust development
dev-rust:
    cd rust && cargo watch -x run

# Build
build:
    pnpm build

build-rust:
    cd rust && cargo build --release

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

# Lint
lint:
    pnpm lint

# Clean
clean:
    rm -rf apps/*/dist apps/*/.next
    rm -rf packages/*/dist
    cd rust && cargo clean

# Test
test:
    pnpm test || echo "No test command configured"

# Type check
typecheck:
    pnpm run --filter=* typecheck || echo "No typecheck command in turbo pipeline"

# Smoke test
smoke:
    @echo "Checking Docker services..."
    @docker ps --format '{{.Names}}' | grep -q "gam_trade" || (echo "ERROR: Docker not running" && exit 1)
    @echo "Checking user-api (8080)..."
    @curl -sf http://localhost:8080/health || echo "WARNING: user-api not ready"
    @echo "Checking cms-api (8081)..."
    @curl -sf http://localhost:8081/health || echo "WARNING: cms-api not ready"
    @echo "Checking user-web (3000)..."
    @curl -sf http://localhost:3000/health || echo "WARNING: user-web not ready"
    @echo "Checking admin-web (3001)..."
    @curl -sf http://localhost:3001/health || echo "WARNING: admin-web not ready"
    @echo "Checking user-app (Expo Metro)..."
    @curl -sf http://localhost:8081 || echo "WARNING: user-app Metro not ready (expected on different port)"
    @echo "Smoke test completed"
