# Detected Services

## HTTP Services

| Service | Path | Port | Notes |
| --- | --- | --- | --- |
| `user-api` | `rust/services/user-api/` | `8080` | Axum API for user-facing flows. Must expose `/health`. |
| `cms-api` | `rust/services/cms-api/` | `8081` | Axum API for admin/CMS flows. Must expose `/health`. |
| `user-web` | `apps/user/web/` | `3000` | Next.js user web app. |
| `admin-web` | `apps/admin/web/` | `3001` | Next.js admin app. |
| `user-app` | `apps/user/app/` | `8082` for Expo web shell | Expo app for mobile development and smoke flows. |

## Background Workers

| Worker | Path | Notes |
| --- | --- | --- |
| `order-worker` | `rust/workers/order/` | Handles order-related background work. |
| `payment-worker` | `rust/workers/payment/` | Handles payment-related background work. |
| `notification-worker` | `rust/workers/notification/` | Handles notification-related background work. |

## Shared Runtime Dependencies

| Dependency | Local Port | Purpose |
| --- | --- | --- |
| PostgreSQL | `5432` | Primary relational data store. |
| Redis | `6379` | Cache and async coordination dependency. |

## Service Rules

- New services need a documented owner, port, health endpoint, local start command, and deployment path.
- API contract changes must update client/types docs and regenerate generated types when applicable.
- Workers need idempotency, retry, and observability notes before production deployment.
