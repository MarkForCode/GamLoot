# Skill: db-migration

## When to Use

Use when adding, changing, validating, or documenting database schema changes, seed data, or migration behavior.

## Preconditions

- Data model change is required and cannot be handled only in application code.
- Existing migrations and seed files have been inspected.
- Backward compatibility and rollback implications are understood or explicitly documented as unknown.
- Affected services, workers, and frontend consumers are identified.

## Steps

1. Inspect `rust/infrastructure/db/migrations/` for naming and SQL conventions.
2. Inspect `seed/` if local/dev/demo data must change.
3. Design the migration to be forward-compatible where possible.
4. Add the migration file with clear ordering.
5. Update seed data only when local or smoke flows require it.
6. Update backend query/handler code that depends on the schema.
7. Update service docs if dependencies, responsibilities, or env assumptions change.
8. Record an ADR if the schema change encodes a durable architectural decision.

## Validation

- Run `just validate-migrations` when available.
- Run `just db-apply-migrations` against a disposable/local database when appropriate.
- Run affected Rust tests or service checks.
- Run smoke flows if seed data or login/demo data changed.
- Confirm generated types or API clients are updated if API contracts changed because of the migration.

## Common Mistakes

- Editing old migrations after they may already have run.
- Adding non-null columns without defaults or a backfill plan.
- Changing seed data that smoke tests rely on without updating tests.
- Forgetting indexes for new lookup patterns.
- Mixing unrelated schema changes into one migration.
- Assuming production rollback is trivial after destructive migrations.

## References

- `rust/infrastructure/db/migrations/`
- `seed/`
- `docs/architecture/data-and-integration.md`
- `docs/services/application-services.md`
- `docs/workflow/testing.md`
- `justfile`
