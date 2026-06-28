# Application Services

## Summary

| Service | Path | Runtime | Port | Responsibility |
| --- | --- | --- | --- | --- |
| `user-api` | `rust/services/user-api/` | Rust / Axum | `8080` | User-facing HTTP API for auth, trial requests, listings, guild invitations, bids, deposits, warehouse, treasury, procurement, lotteries, disputes, and reports. |
| `cms-api` | `rust/services/cms-api/` | Rust / Axum | `8081` | Admin/CMS HTTP API for admin auth/users/roles, diagnostic log rules, trial approvals, tenant operations, audit logs, disputes, reports, and moderation actions. |
| `order-worker` | `rust/workers/order/` | Rust / Tokio | none | TODO: Source currently only prints `order-worker ready`; business processing responsibility is not implemented in source. |
| `payment-worker` | `rust/workers/payment/` | Rust / Tokio | none | TODO: Source currently only prints `payment-worker ready`; business processing responsibility is not implemented in source. |
| `notification-worker` | `rust/workers/notification/` | Rust / Tokio | none | TODO: Source currently only prints `notification-worker ready`; business processing responsibility is not implemented in source. |
| `user-web` | `apps/user/web/` | Next.js | `3000` | User-facing web app with pages for login, market/listings, profile, subscription, disputes, guild dashboard, members, revenue, supply, bulletin, and trade creation. Proxies `/api/user/*` to `user-api`. |
| `admin-web` | `apps/admin/web/` | Next.js | `3001` | Admin web app with pages for platform management, analytics, billing, audit, disputes, and health. Proxies `/api/cms/*` to `cms-api`. |
| `user-app` | `apps/user/app/` | Expo / React Native | Compose maps `8082 -> 8081` plus Expo ports | Mobile app shell for user login against `user-api`; Dockerfile runs Expo dev server. |

## `user-api`

### Responsibilities

Inferred from `rust/services/user-api/src/main.rs` routes:

- Health and metrics: `/health`, `/metrics`.
- User auth: `/auth/login`.
- Trial requests: `/trial-requests`.
- Listings and listing detail.
- Guild invitations.
- Listing approval, bidding, settlement, and trade deposits.
- Warehouse listing flows.
- Guild warehouse and treasury reads.
- Procurement order lifecycle.
- Lottery lifecycle.
- Listing disputes and dispute messages.
- Reports.
- Syncs enabled diagnostic log rules for `user-api` from the database about every five seconds.

### Dependencies

- Rust crates: `axum`, `gam-observability`, `tokio`, `sea-orm`, `serde`, `serde_json`, `tracing`, `tracing-subscriber`, `uuid`.
- Runtime database: PostgreSQL through `DATABASE_URL`.
- Runtime cache/coordination: Docker and Terraform provide `REDIS_URL`, but the current `user-api` source shown only reads `DATABASE_URL`; TODO: confirm whether Redis is used indirectly or reserved for future code.
- Observability: `gam-observability`, `/metrics`, OTLP environment variables, Docker Fluent Bit/Loki logging.

### Infrastructure

- Local Docker Compose service: `user-api`.
- Local dependencies: `postgres`, `redis`; logs are sent through Docker fluentd driver to `fluent-bit` and `loki`.
- Prometheus scrapes `user-api:8080/metrics`.
- AWS Terraform service: `user-api` in ECS/Fargate.
- AWS public exposure: ALB target on port `8080`; path patterns `/api/user/*`, `/user/*`, and `/health`.
- AWS service discovery: `user-api.<project>-<env>.local` when ECS services are enabled.

### Environment Variables

| Variable | Source | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Source, Dockerfile, Docker Compose, Terraform SSM secret | Required for database connection; source has a local default. |
| `REDIS_URL` | Dockerfile, Docker Compose, Terraform SSM secret | Provided by runtime config; TODO: confirm direct usage. |
| `APP_ENV` | Docker Compose, Terraform | Observability environment. |
| `DEPLOYMENT_ENVIRONMENT` | Terraform | Observability environment fallback. |
| `OTEL_SERVICE_NAME` | Docker Compose, Terraform | Service name for telemetry. |
| `SERVICE_NAME` | Observability library | Fallback service name. |
| `SERVICE_VERSION` | Observability library | Optional version override. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Docker Compose, Terraform | OTLP traces endpoint. |
| `OTEL_TRACES_SAMPLER` | Docker Compose, Terraform | Trace sampling mode. |
| `OTEL_TRACES_SAMPLER_ARG` | Docker Compose, Terraform, observability library | Trace sample ratio. |
| `RUST_LOG` | Docker Compose, Terraform | Rust logging level. |
| `LOG_FILE_PATH` | Observability library | Optional file logging path. |

### Deployment Method

- Local: built from `rust/services/user-api/Dockerfile` by Docker Compose.
- Local direct command: `just dev-user-api`.
- AWS: Terraform creates ECR repository, ECS task definition, ECS service, security group, ALB target group attachment, Cloud Map registration, and SSM-backed runtime secrets.
- CI: Rust format, clippy, and tests run in `.github/workflows/ci.yml`; Terraform deployment is managed by `.github/workflows/terraform-aws.yml`.

## `cms-api`

### Responsibilities

Inferred from `rust/services/cms-api/src/main.rs` routes:

- Health and metrics: `/health`, `/metrics`.
- Admin auth: `/auth/login`, `/auth/logout`, `/auth/me`.
- Admin user and role management.
- Diagnostic log rule management.
- Trial request listing and approval.
- Tenant-scoped guild, listing, procurement, lottery, treasury, warehouse, trade deposit, audit log, dispute, and report reads.
- Admin action confirmations.
- Dispute/report resolution.
- User, guild, and listing freeze actions.

### Dependencies

- Rust crates: `axum`, `gam-observability`, `tokio`, `sea-orm`, `serde`, `serde_json`, `tracing`, `tracing-subscriber`, `uuid`.
- Runtime database: PostgreSQL through `DATABASE_URL`.
- Runtime cache/coordination: Docker and Terraform provide `REDIS_URL`, but the current `cms-api` source shown only reads `DATABASE_URL`; TODO: confirm whether Redis is used indirectly or reserved for future code.
- Observability: `gam-observability`, `/metrics`, OTLP environment variables, Docker Fluent Bit/Loki logging.

### Infrastructure

- Local Docker Compose service: `cms-api`.
- Local dependencies: `postgres`, `redis`; logs are sent through Docker fluentd driver to `fluent-bit` and `loki`.
- Prometheus scrapes `cms-api:8081/metrics`.
- AWS Terraform service: `cms-api` in ECS/Fargate.
- AWS public exposure: ALB target on port `8081`; path patterns `/api/cms/*` and `/cms/*`.
- AWS service discovery: `cms-api.<project>-<env>.local` when ECS services are enabled.

### Environment Variables

| Variable | Source | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Source, Dockerfile, Docker Compose, Terraform SSM secret | Required for database connection; source has a local default. |
| `REDIS_URL` | Dockerfile, Docker Compose, Terraform SSM secret | Provided by runtime config; TODO: confirm direct usage. |
| `APP_ENV` | Docker Compose, Terraform | Observability environment. |
| `DEPLOYMENT_ENVIRONMENT` | Terraform | Observability environment fallback. |
| `OTEL_SERVICE_NAME` | Docker Compose, Terraform | Service name for telemetry. |
| `SERVICE_NAME` | Observability library | Fallback service name. |
| `SERVICE_VERSION` | Observability library | Optional version override. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Docker Compose, Terraform | OTLP traces endpoint. |
| `OTEL_TRACES_SAMPLER` | Docker Compose, Terraform | Trace sampling mode. |
| `OTEL_TRACES_SAMPLER_ARG` | Docker Compose, Terraform, observability library | Trace sample ratio. |
| `RUST_LOG` | Docker Compose, Terraform | Rust logging level. |
| `LOG_FILE_PATH` | Observability library | Optional file logging path. |

### Deployment Method

- Local: built from `rust/services/cms-api/Dockerfile` by Docker Compose.
- Local direct command: `just dev-cms-api`.
- AWS: Terraform creates ECR repository, ECS task definition, ECS service, security group, ALB target group attachment, Cloud Map registration, and SSM-backed runtime secrets.
- CI: Rust format, clippy, and tests run in `.github/workflows/ci.yml`; Terraform deployment is managed by `.github/workflows/terraform-aws.yml`.

## Workers

### Naming Note

Docker Compose and Rust package names use:

- `order-worker`
- `payment-worker`
- `notification-worker`

Terraform service keys use:

- `worker-order`
- `worker-payment`
- `worker-notification`

TODO: Decide whether service names should be normalized across Docker Compose, Rust package names, ECR repositories, ECS service names, and log labels.

### Shared Worker Dependencies

- Rust crates: `tokio`, `sea-orm`, `serde`, `serde_json`, `tracing`.
- Dockerfiles provide `DATABASE_URL` and `REDIS_URL`.
- Docker Compose declares dependencies on `postgres` and `redis`.
- Terraform injects `DATABASE_URL` and `REDIS_URL` from SSM parameters for all ECS service keys, including worker services.

### Shared Worker Infrastructure

- Local Docker Compose services: `order-worker`, `payment-worker`, `notification-worker`.
- Local logs route to Loki through `fluent-bit` using service-specific tags.
- AWS Terraform: private ECS/Fargate services without ALB attachment.
- AWS ECR repositories: named from Terraform service keys (`worker-order`, `worker-payment`, `worker-notification`).

### Shared Worker Environment Variables

| Variable | Source | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Dockerfile, Docker Compose, Terraform SSM secret | Provided, but current worker source does not read it. |
| `REDIS_URL` | Dockerfile, Docker Compose, Terraform SSM secret | Provided, but current worker source does not read it. |
| `APP_ENV` | Terraform | Injected into ECS task definitions. |
| `DEPLOYMENT_ENVIRONMENT` | Terraform | Injected into ECS task definitions. |
| `OTEL_SERVICE_NAME` | Terraform | Injected into ECS task definitions. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Terraform | Injected into ECS task definitions. |
| `OTEL_TRACES_SAMPLER` | Terraform | Injected into ECS task definitions. |
| `OTEL_TRACES_SAMPLER_ARG` | Terraform | Injected into ECS task definitions. |
| `RUST_LOG` | Terraform | Injected into ECS task definitions. |

### `order-worker`

- Responsibility: TODO: Current source only prints `order-worker ready`.
- Local deployment: `rust/workers/order/Dockerfile` and Docker Compose service `order-worker`.
- AWS deployment: Terraform service key `worker-order`.

### `payment-worker`

- Responsibility: TODO: Current source only prints `payment-worker ready`.
- Local deployment: `rust/workers/payment/Dockerfile` and Docker Compose service `payment-worker`.
- AWS deployment: Terraform service key `worker-payment`.

### `notification-worker`

- Responsibility: TODO: Current source only prints `notification-worker ready`.
- Local deployment: `rust/workers/notification/Dockerfile` and Docker Compose service `notification-worker`.
- AWS deployment: Terraform service key `worker-notification`.

## `user-web`

### Responsibilities

- User-facing Next.js web runtime.
- Provides user pages for market/listing/login/profile/subscription/disputes and guild workflows.
- Provides `/health`.
- Proxies API requests from `/api/user/[...path]` to `USER_API_URL`, falling back to `NEXT_PUBLIC_API_URL`, then `http://localhost:8080`.

### Dependencies

- Workspace packages from `package.json`: `@repo/api-client`, `@repo/config`, `@repo/ui`.
- Runtime service dependency: `user-api`.
- Next.js i18n plugin configured through `next-intl`.

### Infrastructure

- Local Docker Compose service: `user-web`.
- Local dependency: `user-api`.
- Local logs route to Loki through `fluent-bit`.
- Healthcheck: `http://127.0.0.1:3000/health`.

### Environment Variables

| Variable | Source | Notes |
| --- | --- | --- |
| `USER_API_URL` | Docker Compose, API route | Server-side proxy target. |
| `NEXT_PUBLIC_API_URL` | Docker Compose, `next.config.js`, API route | Public/client API URL and fallback proxy target. |

### Deployment Method

- Local: built from `apps/user/web/Dockerfile` by Docker Compose.
- Local direct command: `just dev-web`.
- CI: Node lint/typecheck/test run in `.github/workflows/ci.yml`.
- Production/cloud: TODO: No Terraform ECS service or GitHub deployment workflow for `user-web` was found.

## `admin-web`

### Responsibilities

- Admin/CMS Next.js runtime.
- Provides admin pages for platform management, analytics, billing, audit, disputes, and health.
- Provides `/health`.
- Proxies API requests from `/api/cms/[...path]` to `CMS_API_URL`, falling back to `NEXT_PUBLIC_CMS_API_URL`, then `http://localhost:8081`.

### Dependencies

- Workspace packages from `package.json`: `@repo/api-client`, `@repo/ui`.
- Runtime service dependency: `cms-api`.

### Infrastructure

- Local Docker Compose service: `admin-web`.
- Local dependency: `cms-api`.
- Local logs route to Loki through `fluent-bit`.
- Healthcheck: `http://127.0.0.1:3001/health`.

### Environment Variables

| Variable | Source | Notes |
| --- | --- | --- |
| `CMS_API_URL` | Docker Compose, API route | Server-side proxy target. |
| `NEXT_PUBLIC_CMS_API_URL` | Docker Compose, API route | Public/client CMS API URL and fallback proxy target. |
| `NEXT_PUBLIC_API_URL` | `next.config.js` | Configured as a public API URL defaulting to `http://localhost:8080`; TODO: confirm whether admin app uses this or should use CMS-specific config. |

### Deployment Method

- Local: built from `apps/admin/web/Dockerfile` by Docker Compose.
- Local direct command: `just dev-admin`.
- CI: Node lint/typecheck/test run in `.github/workflows/ci.yml`.
- Production/cloud: TODO: No Terraform ECS service or GitHub deployment workflow for `admin-web` was found.

## `user-app`

### Responsibilities

- Expo / React Native user app.
- Current source implements a login UI for demo owner/buyer users and calls `user-api` `/auth/login`.
- Dockerfile runs Expo dev server.

### Dependencies

- Workspace packages from `package.json`: `@repo/api-client`, `@repo/ui`.
- Runtime service dependency: `user-api`.
- Expo / React Native runtime.

### Infrastructure

- Local Docker Compose service: `user-app`.
- Local dependency: `user-api`.
- Docker Compose maps host `8082` to container `8081`, plus Expo ports `19000`, `19001`, `19002`, and `19006`.
- Healthcheck: `http://127.0.0.1:8081` inside the container.
- Local logs route to Loki through `fluent-bit`.

### Environment Variables

| Variable | Source | Notes |
| --- | --- | --- |
| `EXPO_PUBLIC_USER_API_URL` | App source | Overrides platform-specific default API URL. |
| `USER_API_URL` | Docker Compose | Provided to the container, but current app source reads `EXPO_PUBLIC_USER_API_URL`; TODO: confirm whether this variable is used by Expo tooling or should be renamed. |
| `EXPO_NO_TELEMETRY` | Docker Compose | Disables Expo telemetry. |
| `CI` | Docker Compose | Runs Expo in CI-like mode. |

### Deployment Method

- Local: built from `apps/user/app/Dockerfile` by Docker Compose.
- Local direct command: `just dev-app`.
- Native build helpers: `just build-user-app-android`, `just build-user-app-ios`.
- CI: Node lint/typecheck/test run in `.github/workflows/ci.yml`; Appium CI job exists but is disabled with `if: false`.
- Production/mobile release: TODO: No app store, EAS, TestFlight, Play Store, or production mobile deployment workflow was found.
