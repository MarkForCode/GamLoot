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
just install

# Start full stack
just docker-up

# Development
just dev
```

## Commands

### Development
```bash
just dev              # All frontend apps
just dev-web          # Next.js only
just dev-app          # Expo only
just dev-admin        # CMS only
just dev-rust         # Rust backend (cargo watch)
```

### Build & Deploy
```bash
just build            # Build all packages/apps
just build-rust       # Rust release build
just docker-up        # Start all Docker services
just docker-down      # Stop all containers
```

### Utilities
```bash
just smoke            # Health check all services
just db-reset         # Reset database
just clean            # Clean build artifacts
just lint             # Lint all
just test             # Run tests
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
just docker-up  # seed/01-init.sql runs automatically
```

### Migrations
```bash
# Migration files: rust/infrastructure/db/migrations/
```

## Testing

```bash
just test             # Run tests
just smoke            # Health check (requires services running)
```

## OpenCode Integration

This project includes OpenCode configuration:
- `.opencode/instructions.md` - Development guidelines
- `.opencode/skills/` - SOPs for different tasks
- `AGENTS.md` - Agent instructions

## License

Private - All rights reserved
