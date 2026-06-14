# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All primary dev commands go through `just`. Run `just` alone to list all targets.

### Development

```bash
just install          # Install all dependencies (pnpm)
just docker-up        # Start full stack (postgres, redis, APIs, workers, frontends)
just docker-up-backend  # Backend only (postgres, redis, APIs, workers — no frontends)
just dev              # All frontend apps (Turborepo)
just dev-web          # Next.js user web only
just dev-app          # Expo mobile only
just dev-admin        # CMS admin only
just dev-rust         # Rust backend with cargo watch
just dev-user-api     # user-api only (port 8080)
just dev-cms-api      # cms-api only (port 8081)
just dev-db           # Start only postgres + redis via Docker
```

### Build

```bash
just build            # All frontend packages/apps via Turborepo
just build-rust       # Rust release build
just build-user-app-android   # Android APK (requires Android SDK)
just build-user-app-ios       # iOS simulator build (requires macOS + Xcode)
```

### Rust checks (fast feedback, no full build)

```bash
just check-rust       # cargo check for both user-api and cms-api
just check-user-api   # cargo check user-api only
just check-cms-api    # cargo check cms-api only
```

Rust CI equivalents locally:
```bash
cd rust && cargo fmt --all --check
cd rust && cargo clippy --all-targets -- -D warnings
cd rust && cargo test --all
```

### Linting & Type-checking

```bash
just lint             # All packages via Turborepo
just typecheck        # TypeScript type-check all packages
# Single package:
pnpm --filter @gam/user-web lint
pnpm --filter @gam/admin-web lint
```

### Database

```bash
just db-reset              # Wipe and recreate (docker compose down -v && up)
just db-seed               # Apply seed/*.sql (skips if data exists)
just db-seed-demo-users    # Apply seed/02-demo-appium-users.sql
just validate-migrations   # Apply SQL migrations to a disposable Postgres container
just db-apply-migrations   # Apply migrations to running Docker Postgres
```

Migrations live in `rust/infrastructure/db/migrations/`.

### Pre-PR Verification

```bash
just check-all        # validate-migrations + check-rust + check-user-web + check-admin-web
```

### Testing

```bash
just smoke                 # Health check all services + user-web smoke tests
just test-web-smoke        # User-web flow tests (scripts/flows/user-web-smoke.sh)
just test-app-native       # Android native app smoke (needs Android SDK + APK)
just test-app-ios-native   # Full iOS native smoke (macOS only)
```

Appium tests (Android web or native):
```bash
just test-web-appium       # Full Appium web login flow (headless emulator)
just test-web-appium-visible  # Same but with visible emulator
just test-web-appium-login # Login flow only (requires Appium + device)
```

### Observability Stack

```bash
just obs-up               # Start Grafana/Loki/Mimir/Prometheus/Tempo/Alloy/Fluent-bit
just obs-smoke            # Smoke check observability stack
just obs-down             # Stop observability stack
```

Local observability ports (started separately from the main stack):

| Service    | Port  | URL                        |
|------------|-------|----------------------------|
| Grafana    | 3002  | http://localhost:3002 (admin/admin) |
| Loki       | 3100  | http://localhost:3100      |
| Tempo      | 3200  | http://localhost:3200      |
| Mimir      | 9009  | http://localhost:9009      |
| Prometheus | 9090  | http://localhost:9090      |
| Alloy      | 12345 | http://localhost:12345     |

Grafana uses port 3002 because 3000/3001 are taken by user-web/admin-web.

**Loki label constraint**: Only use low-cardinality labels (`service`, `env`, `level`, `cluster`). Never promote request IDs, trace IDs, user IDs, or URL paths to Loki labels.

### Terraform / Infrastructure

```bash
just tf-localstack-up     # Start LocalStack + apply Terraform
just tf-localstack-test   # Run Terratest + Terraform test
just tf-localstack-down   # Tear down LocalStack
```

Local CI equivalents for Terraform:
```bash
cd infra/terraform
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
```

## Architecture

### Monorepo Layout

```
apps/user/app/       # Expo (React Native) — mobile (iOS + Android)
apps/user/web/       # Next.js 14 — user-facing web (port 3000)
apps/admin/web/      # Next.js 14 — CMS admin (port 3001)
packages/ui/         # Tamagui cross-platform UI components
packages/features/   # Shared business logic hooks (Solito pattern)
packages/api-client/ # axios + react-query API layer
packages/types/      # TypeScript types auto-generated from Rust via Specta
packages/config/     # Shared ESLint, TSConfig, Tailwind/Tamagui configs
rust/services/       # user-api (8080), cms-api (8081) — Axum + SeaORM
rust/workers/        # order, payment, notification background workers
rust/domain/core/    # Shared domain logic (no infra dependencies)
rust/infrastructure/ # db (SeaORM + migrations), redis, observability
seed/                # SQL seed files (01-init.sql auto-runs on first docker-up)
infra/terraform/     # AWS multi-env Terraform (dev/staging/prod workspaces)
infra/terraform-localstack/ # LocalStack-friendly subset for CI validation
infra/terratest/     # Go-based Terraform integration tests
ops/observability/   # Grafana, Loki, Mimir, Prometheus, Tempo, Alloy, Fluent-bit configs
```

### Frontend Package Imports

- Use `@repo/ui` for all UI components (Tamagui-based, cross-platform)
- Use `@repo/api-client` for API calls (axios + react-query)
- Use `@repo/features` for shared business logic hooks (Solito pattern — works on both Expo and Next.js)
- Use `@repo/types` for TypeScript types — **run `specta gen` after any Rust API type changes**

### Rust Backend

The Rust workspace follows a layered architecture:
- `domain/core` — pure business logic, no infra imports
- `infrastructure/db` — SeaORM entities, migrations, repository implementations
- `infrastructure/redis` — Redis client wrapper
- `infrastructure/observability` — OpenTelemetry + Prometheus metrics setup
- `services/user-api`, `services/cms-api` — Axum HTTP services, depend on domain + infra
- `workers/order`, `workers/payment`, `workers/notification` — async background workers

All services must expose a `/health` endpoint. Run `cargo fmt` before committing Rust code.

### Infrastructure (AWS)

`infra/terraform` manages: VPC, ALB, ECS/Fargate (user-api, cms-api, workers), ECR, RDS PostgreSQL, ElastiCache Redis, Cloud Map, CloudWatch, S3, Managed Grafana/AMP, GitHub Actions OIDC role.

Environments: `dev`, `staging`, `prod` (Terraform workspaces). First-time bootstrap requires `aws sso login` and local AWS credentials — see `docs/terraform.md` and `docs/ci.md`.

### CI

Three GitHub Actions workflows:
- **CI** (`.github/workflows/ci.yml`) — triggers on PR/push to `main`/`develop`: Node lint+test, Rust fmt+clippy+test
- **Terraform LocalStack** — manual only, validates infra with fake AWS credentials
- **Terraform AWS** — validates on PR, plans/applies on push to `main`/`develop` via GitHub OIDC (no long-lived AWS keys)

### Service Ports

| Service      | Port |
|-------------|------|
| user-api    | 8080 |
| cms-api     | 8081 |
| user-web    | 3000 |
| admin-web   | 3001 |
| Expo (web)  | 8082 |
| PostgreSQL  | 5432 |
| Redis       | 6379 |

### Required Environment Variables

```bash
DATABASE_URL=postgresql://gam_trade:gam_trade_secure_pass@localhost:5432/gam_trade_dev
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Copy `.env.example` to `.env` to get started.

### Git Conventions

- Branch prefixes: `feature/`, `fix/`, `refactor/`
- Commit messages: imperative mood (e.g., `add user login`, `fix order worker crash`)
