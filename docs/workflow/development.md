# Development Workflow

## Default Flow

1. Read relevant docs and code.
2. Identify the smallest safe change.
3. Implement using existing patterns.
4. Add or update tests when behavior changes.
5. Run targeted validation.
6. Update docs or ADRs when the change affects architecture, commands, workflows, or operations.
7. Summarize changes and validation.

## Common Commands

```bash
just install
just dev
just dev-web
just dev-app
just dev-admin
just dev-db
just dev-user-api
just dev-cms-api
just dev-rust
```

## Package-Specific Work

Prefer scoped commands while iterating:

```bash
pnpm --filter @gam/user-web typecheck
pnpm --filter @gam/admin-web lint
pnpm --filter @repo/types test
```

## Engineering Rules

- Do not start implementation until requirements are clear enough to validate.
- Keep frontend, backend, database, infrastructure, and docs changes logically grouped.
- Avoid unrelated formatting churn.
- If a change requires new long-lived policy, add an ADR.
