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
