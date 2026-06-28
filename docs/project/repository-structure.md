# Repository Structure

The repository is a Turborepo and pnpm monorepo with Rust services, shared TypeScript packages, infrastructure code, local operations scripts, and design artifacts.

## Top-Level Areas

| Path | Purpose |
| --- | --- |
| `apps/user/web/` | User-facing Next.js web app. |
| `apps/user/app/` | Expo / React Native app. |
| `apps/admin/web/` | CMS/admin Next.js app. |
| `packages/ui/` | Shared Tamagui UI primitives and providers. |
| `packages/features/` | Shared frontend feature hooks and cross-app product logic. |
| `packages/api-client/` | API client layer for frontend apps. |
| `packages/types/` | Shared TypeScript types, including generated API types. |
| `packages/config/` | Shared frontend configuration, routing, and i18n helpers. |
| `rust/services/` | Rust HTTP APIs. |
| `rust/workers/` | Rust background workers. |
| `rust/domain/core/` | Shared Rust domain logic. |
| `rust/infrastructure/` | Database, Redis, and observability infrastructure crates. |
| `infra/terraform/` | AWS Terraform. |
| `infra/terraform-localstack/` | LocalStack-compatible Terraform validation. |
| `infra/terratest/` | Go Terratest coverage for infrastructure. |
| `ops/observability/` | Local Grafana, Loki, Mimir, Prometheus, Tempo, Alloy, and Fluent Bit configs. |
| `scripts/` | Local workflow helpers. |
| `tests/k6/` | k6 API load testing scenarios. |
| `design/` | Product and UI design artifacts. |
| `docs/` | Canonical project documentation. |
| `.agent/` | Tool-neutral AI automation and adapter guidance. |

## Dependency Direction

- Frontend apps depend on shared packages.
- Shared packages should avoid importing app code.
- `packages/api-client` depends on `packages/types`.
- Rust services depend on domain and infrastructure crates.
- Rust domain code should not depend on infrastructure crates.
- Generated or derived artifacts should be documented by their source and regeneration command.
