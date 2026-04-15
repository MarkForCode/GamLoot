# Game Trade Platform - AGENTS.md

## Project Overview
Game trading platform monorepo (Turborepo + pnpm). Frontend: Expo + Next.js. Backend: Rust + SeaORM.

## Commands
```bash
pnpm dev           # all frontend apps via turbo
pnpm build         # all packages/apps
pnpm dev:rust     # cargo watch in rust/
pnpm build:rust  # cargo build --release

# single app
pnpm --filter @gam/user-app dev     # Expo mobile
pnpm --filter @gam/user-web dev    # Next.js web
pnpm --filter @gam/admin-web dev   # CMS
```

## Architecture
```
apps/user/app/     # Expo (React Native)
apps/user/web/     # Next.js  
apps/admin/web/   # CMS admin
packages/ui/      # Tamagui components
packages/features/ # Solito hooks
packages/api-client/ # axios + react-query
packages/types/   # Specta-generated from Rust
packages/config/  # Shared eslint, tsconfig, tailwind/tamagui configs
rust/services/    # user-api (8080), cms-api (8081)
rust/domain/core/   # Shared domain logic
rust/infrastructure/db/    # SeaORM migrations
rust/infrastructure/redis/   # Redis client
rust/workers/     # order, payment, notification
```

## Docker
```bash
docker-compose up --build   # starts postgres:5432, redis:6379, apis, workers
# seed runs automatically on first start (seed/01-init.sql)
```

## Key Technical Notes
- `packages/types` auto-gen: run `specta gen` after Rust API changes
- DATABASE_URL, REDIS_URL, STRIPE_SECRET_KEY required for build
- SeaORM migrations in `rust/infrastructure/db`
- Use `turbo run --filter=<pkg>` for single package operations