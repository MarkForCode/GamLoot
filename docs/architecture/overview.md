# Architecture Overview

The Game Trade Platform is a multi-app trading platform built as a pnpm/Turborepo monorepo with Rust backend services and workers.

## Runtime Shape

```text
User Web / Expo App / Admin Web
        |
        v
API client + shared types
        |
        v
user-api / cms-api
        |
        v
PostgreSQL + Redis + background workers
        |
        v
Observability stack and Terraform-managed infrastructure
```

## Primary Boundaries

- Apps own routing, screens, and environment-specific composition.
- Shared frontend packages own reusable UI, API access, feature hooks, types, and configuration.
- Rust services own HTTP contracts and request orchestration.
- Rust domain crates own business rules that should not require infrastructure.
- Rust infrastructure crates own database, Redis, and observability integrations.
- Terraform owns cloud infrastructure shape.
- Docs and ADRs own long-lived engineering intent.

## Architectural Guardrails

- Keep domain logic independent from transport and infrastructure concerns.
- Keep shared packages reusable across web and mobile where possible.
- Keep generated types synchronized with Rust API contract changes.
- Keep service observability consistent before expanding production workflows.
