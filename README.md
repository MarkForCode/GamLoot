# Game Trade Platform

多遊戲 / 多公會交易平台 monorepo。前端包含使用者 Web、Expo App、CMS；後端使用 Rust + Axum + SeaORM，搭配 PostgreSQL、Redis、workers、Grafana observability stack 與 k6 壓力測試流程。

## Tech Stack

| Layer | Technology |
| --- | --- |
| User Web | Next.js 14 |
| User App | Expo / React Native |
| Admin CMS | Next.js 14 |
| UI | Tamagui |
| Backend | Rust, Axum, SeaORM |
| Database / Cache | PostgreSQL, Redis |
| Workers | Rust order / payment / notification workers |
| Observability | Grafana, Loki, Fluent Bit, Tempo, Mimir, Prometheus, Alloy |
| Load Testing | k6 |
| Monorepo | Turborepo, pnpm, just |
| Infrastructure | Docker Compose, Terraform, LocalStack |

## Quick Start

```bash
just install
just docker-up
just smoke
```

Local service URLs:

| Service | URL |
| --- | --- |
| user-api | `http://localhost:8080` |
| cms-api | `http://localhost:8081` |
| user-web | `http://localhost:3000` |
| admin-web | `http://localhost:3001` |
| user-app / Expo web shell | `http://localhost:8082` |
| Grafana | `http://localhost:3002` |

Grafana local login:

```text
admin / admin
```

## Common Commands

### Development

```bash
just dev              # all frontend apps through turbo
just dev-web          # user Next.js web
just dev-app          # Expo app
just dev-admin        # CMS web
just dev-db           # postgres + redis only
just dev-user-api     # user-api on 8080
just dev-cms-api      # cms-api on 8081
just dev-rust         # cargo watch
```

### Docker

```bash
just docker-up          # full stack
just docker-up-backend  # postgres, redis, APIs, workers
just docker-up-web      # web/app frontends
just docker-logs
just docker-down
```

### Database

```bash
just db-apply-migrations
just db-seed
just db-seed-demo-users
just validate-migrations
just db-reset
```

Demo login data used by smoke/k6 flows:

| Flow | Identifier | Password hash |
| --- | --- | --- |
| user login | `demo-buyer@gamloot.local` | `buyer-password-hash` |
| CMS login | `admin@example.com` | `admin-password-hash` |

## Project Structure

```text
apps/
  user/app/            Expo app
  user/web/            user-facing Next.js web
  admin/web/           CMS Next.js web
packages/
  ui/                  Tamagui shared UI
  features/            shared product flows and hooks
  api-client/          axios / react-query API client
  types/               shared generated and hand-written types
  config/              shared eslint / tsconfig / styling config
rust/
  services/user-api/   Axum API on 8080
  services/cms-api/    Axum CMS API on 8081
  domain/core/         shared domain logic
  infrastructure/db/   SeaORM migrations and DB infrastructure
  infrastructure/redis/
  workers/             order, payment, notification workers
ops/observability/     local Grafana/Loki/Tempo/Mimir/Prometheus stack
infra/terraform/       AWS Terraform
infra/terraform-localstack/
scripts/               local workflow helpers
tests/k6/              API load testing scenarios
docs/                  product, CI, and infrastructure docs
```

## Testing

```bash
just test
just check-rust
just check-user-web
just check-admin-web
just check-all
just smoke
```

Web/App smoke flows:

```bash
just test-web
just test-app-web-visible
just test-web-appium-login
just test-app-native
just test-app-ios-native
```

Android/iOS helper commands are available through:

```bash
just android-env-check
just android-emulator-start-visible
just ios-env-check
just ios-simulator-start
```

## Load Testing

k6 scenarios live in `tests/k6/`. Reports are written to `reports/k6/`.

```bash
pnpm run load:k6:smoke   # short verification run
pnpm run load:k6         # baseline profile
pnpm run load:k6:stress  # higher VU stress profile
pnpm run load:k6:docker  # use grafana/k6 Docker image
```

Equivalent `just` targets:

```bash
just k6-smoke
just k6-baseline
just k6-stress
just k6-docker
```

Useful overrides:

```bash
USER_API_BASE_URL=http://localhost:8080 \
CMS_API_BASE_URL=http://localhost:8081 \
K6_PROFILE=baseline \
K6_BASELINE_TARGET_VUS=10 \
K6_HOLD=3m \
pnpm run load:k6
```

See `tests/k6/README.md` and `.opencode/skills/k6-load-testing.md` for the full workflow.

## Observability

Local observability is Grafana-based:

```text
App stdout/stderr -> Docker fluentd driver -> Fluent Bit -> Loki -> Grafana
Rust OTLP traces  -> Alloy -> Tempo -> Grafana
Rust /metrics     -> Prometheus -> Mimir -> Grafana
```

Commands:

```bash
just obs-up
just obs-smoke
just obs-status
just obs-logs
just obs-down
```

Important URLs:

| Component | URL |
| --- | --- |
| Grafana | `http://localhost:3002` |
| Loki | `http://localhost:3100` |
| Tempo | `http://localhost:3200` |
| Mimir | `http://localhost:9009` |
| Prometheus | `http://localhost:9090` |

Production logs are Loki-first. AWS ECS app containers use FireLens / Fluent Bit instead of CloudWatch app log groups. See `ops/observability/README.md` and `infra/terraform/README.md` for the exact local and Terraform mapping.

### Loki-only API Diagnostics

CMS admins can temporarily enable extra structured Loki logs for selected `user-api` routes. This is intentionally not OpenTelemetry tracing: it writes diagnostic `start` / `finish` log events to Loki and uses `request_id` to correlate one request.

```logql
{service="user-api"} | json | event_type="api.diagnostic.finish"
```

Diagnostic rules are managed in the CMS Observability panel, sync to `user-api` within about 5 seconds, default to a 15 minute TTL, and cap at 60 minutes. They never log request bodies, passwords, tokens, raw email, or usernames.

## Rust Observability Baseline

`gam-observability` provides shared logging, metrics, traces, runtime/process metrics, auth login monitoring, and DB query observation helpers.

Key metrics:

| Type | Metrics |
| --- | --- |
| Runtime | `process_cpu_seconds_total`, `process_resident_memory_bytes`, `process_memory_bytes`, `tokio_runtime_tick_lag_seconds` |
| API | `http_server_requests_total`, `http_server_request_duration_seconds`, `http_server_active_requests` |
| Auth | `auth_login_attempts_total{service,actor_type,result,reason}` |
| DB | `db_queries_total`, `db_query_duration_seconds` |
| Error | `app_errors_total`, `app_timeouts_total` |

Login logs hash principals with SHA-256 and do not log raw email, username, password, tokens, or request bodies.

## Infrastructure

Terraform docs:

- `docs/terraform.md`
- `infra/terraform/README.md`
- `infra/terraform-localstack/README.md`

LocalStack workflow:

```bash
just tf-localstack-up
just tf-localstack-test
just tf-localstack-down
```

AWS Terraform currently focuses on ECS app services, Loki/Grafana production log path, networking, IAM, SSM-backed secrets, alarms/dashboards, and related infrastructure. Check the Terraform README before applying changes.

## Product Docs

- `docs/guild-trade-platform-mvp.md` - 多遊戲 / 多公會交易平台 MVP 規格與第一階段計畫
- `docs/ci.md` - GitHub Actions CI, Terraform LocalStack, AWS OIDC workflow
- `docs/terraform.md` - Terraform AWS / LocalStack architecture and operations

## Agent / OpenCode

- `AGENTS.md` - Codex agent project instructions
- `.opencode/instructions.md` - OpenCode development guidelines
- `.opencode/skills/` - project SOPs, including k6 load testing

## License

Private - All rights reserved
