# Backend Architecture

The backend is a Rust workspace using Axum services, SeaORM database infrastructure, Redis integration, and background workers.

## Crate Responsibilities

| Area | Responsibility |
| --- | --- |
| `rust/domain/core/` | Shared domain logic with no infrastructure dependency. |
| `rust/infrastructure/db/` | SeaORM entities, migrations, database access, and repository infrastructure. |
| `rust/infrastructure/redis/` | Redis client and cache/queue integration. |
| `rust/infrastructure/observability/` | Logging, metrics, tracing, and runtime instrumentation. |
| `rust/services/user-api/` | User-facing HTTP API. |
| `rust/services/cms-api/` | Admin/CMS HTTP API. |
| `rust/workers/*/` | Background processing. |

## Rules

- Services expose `/health`.
- Services orchestrate transport, validation, domain calls, and infrastructure calls.
- Domain code should stay deterministic and testable.
- Database schema changes belong in `rust/infrastructure/db/migrations/`.
- Worker behavior should be idempotent where retries are possible.

## Validation

```bash
cd rust && cargo fmt --all --check
cd rust && cargo clippy --all-targets -- -D warnings
cd rust && cargo test --all
```
