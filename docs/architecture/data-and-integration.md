# Data and Integration Architecture

## Data Stores

| Store | Purpose |
| --- | --- |
| PostgreSQL | Primary relational data store. |
| Redis | Cache and coordination dependency. |

## Migrations and Seed Data

- Migrations live in `rust/infrastructure/db/migrations/`.
- Seed files live in `seed/`.
- Local seed data supports development, smoke tests, and k6 flows.
- Migration validation should use a disposable database when possible.

## API Contract Flow

```text
Rust API contracts
        |
        v
generated/shared TypeScript types
        |
        v
packages/api-client
        |
        v
apps and feature packages
```

## Rules

- API contract changes must update tests and generated/shared types.
- Frontend code should consume API behavior through `packages/api-client`.
- Shared types should not become a dumping ground for unrelated app-local shapes.
- Breaking contract changes need documentation and migration notes.
