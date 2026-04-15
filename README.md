# Game Trade Platform

Game trading platform with user-facing apps (mobile/web/desktop) and admin CMS.

## Tech Stack

- **Frontend**: Expo + Next.js + Tamagui
- **Backend**: Rust + SeaORM + Axum
- **Monorepo**: Turborepo + pnpm
- **Infrastructure**: Docker, PostgreSQL, Redis

## Quick Start

```bash
# Install dependencies
pnpm install

# Start Docker services
docker-compose up --build

# Development
pnpm dev
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all frontend apps |
| `pnpm dev:rust` | Start Rust backend |
| `pnpm build` | Build all packages/apps |
| `docker-compose up --build` | Start full stack |

## Project Structure

```
apps/user/app/     # Expo (React Native)
apps/user/web/     # Next.js web
apps/admin/web/   # CMS admin
packages/         # Shared packages
rust/             # Rust backend
```

## Environment

Copy `.env.example` to `.env` and configure:
- `DATABASE_URL`
- `REDIS_URL`
- `STRIPE_SECRET_KEY`