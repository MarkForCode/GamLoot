# OpenCode Instructions

## Project Overview
- Game trading platform: user apps (Expo + Next.js) + admin CMS
- Monorepo: Turborepo + pnpm
- Backend: Rust + SeaORM + Axum

## Commands
```bash
# Frontend dev
pnpm dev              # all apps
pnpm --filter @gam/user-web dev    # single app
pnpm --filter @gam/user-app dev    # Expo mobile
pnpm --filter @gam/admin-web dev   # CMS

# Rust dev
pnpm dev:rust        # cargo watch

# Docker
docker-compose up --build
just smoke           # health check
```

## Architecture
- `apps/user/app/` - Expo (React Native)
- `apps/user/web/` - Next.js
- `apps/admin/web/` - CMS
- `packages/` - Shared: ui, features, api-client, types, config
- `rust/services/` - user-api (8080), cms-api (8081)
- `rust/workers/` - order, payment, notification

## Conventions

### Frontend
- Use `@repo/ui` components for cross-platform UI
- Use `@repo/api-client` for API calls
- Use `@repo/features` for shared business logic (Solito pattern)
- Run `specta gen` after changing Rust API

### Rust
- Services run on ports 8080, 8081
- All services need `/health` endpoint
- Use SeaORM for database
- Run `cargo fmt` before commit

### Git
- Branch: `feature/`, `fix/`, `refactor/`
- Commit: imperative mood (e.g., "add user login")
- No commit without tests for new features

## Key Files
- `docker-compose.yml` - Full stack
- `seed/01-init.sql` - Database seed
- `AGENTS.md` - This file
- `justfile` - Dev commands
