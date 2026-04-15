# Game Trade Platform

Game trading platform with user-facing apps (mobile/web/desktop) and admin CMS.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend Mobile | Expo (React Native) |
| Frontend Web | Next.js 14 |
| UI Framework | Tamagui |
| Backend | Rust + Axum |
| Database | PostgreSQL + SeaORM |
| Cache | Redis |
| Monorepo | Turborepo + pnpm |
| Container | Docker |

## Quick Start

```bash
# Install dependencies
pnpm install

# Start Docker services (DB + Redis)
docker-compose up -d postgres redis

# Start full stack
docker-compose up --build

# Development
pnpm dev
```

## Commands

### Frontend
```bash
pnpm dev              # All apps
pnpm dev-web         # Next.js only
pnpm dev-app         # Expo only
pnpm dev-admin       # CMS only
```

### Backend
```bash
pnpm dev:rust        # cargo watch
pnpm build:rust     # Release build
```

### Docker
```bash
docker-compose up --build   # Start all services
docker-compose down         # Stop all
just smoke                  # Health check
just db-reset              # Reset database
```

### Build & Test
```bash
pnpm build         # Build all
pnpm lint          # Lint all
just clean         # Clean build artifacts
```

## Project Structure

```
gam_web_rn/
├── apps/
│   ├── user/
│   │   ├── app/        # Expo (React Native)
│   │   └── web/        # Next.js
│   └── admin/
│       └── web/        # CMS
├── packages/
│   ├── ui/             # Tamagui components
│   ├── features/       # Shared hooks (Solito)
│   ├── api-client/     # axios + react-query
│   ├── types/          # Shared TypeScript types
│   └── config/         # ESLint, TSConfig
└── rust/
    ├── services/
    │   ├── user-api/   # Port 8080
    │   └── cms-api/    # Port 8081
    ├── domain/core/    # Shared domain logic
    ├── infrastructure/
    │   ├── db/         # SeaORM + migrations
    │   └── redis/      # Redis client
    └── workers/        # order, payment, notification
```

## Architecture

### Package Boundaries
- `packages/ui` - Cross-platform UI components (Tamagui)
- `packages/features` - Business logic hooks (Solito pattern)
- `packages/api-client` - API communication layer
- `packages/types` - Shared TypeScript types

### API Ports
| Service | Port |
|---------|------|
| user-api | 8080 |
| cms-api | 8081 |
| user-web | 3000 |
| admin-web | 3001 |

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/db
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=sk_test_xxx

# Optional
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Database

### Seed Data
Seed runs automatically on first Docker start:
```bash
docker-compose up --build  # seed/01-init.sql runs automatically
```

### Migrations
```bash
# Run migrations manually
# Migration files: rust/infrastructure/db/migrations/
```

## Testing

```bash
# Run tests
pnpm test

# Smoke test (requires services running)
just smoke
```

## OpenCode Integration

This project includes OpenCode configuration:
- `.opencode/instructions.md` - Development guidelines
- `.opencode/skills/` - SOPs for different tasks
- `AGENTS.md` - Agent instructions

## License

Private - All rights reserved
