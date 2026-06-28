# Skill: add-api

## When to Use

Use when adding or changing an HTTP API endpoint in `user-api` or `cms-api`, including request/response types, routing, database reads/writes, frontend proxy/client changes, or generated/shared type updates.

## Preconditions

- Requirements are confirmed or documented in a requirements brief.
- Target service is known: `user-api` or `cms-api`.
- Related routes, database tables, and frontend consumers have been inspected.
- Authentication/authorization expectations are explicit; if not inferable, document the unknown instead of guessing.
- API contract compatibility is understood for existing clients.

## Steps

1. Read `docs/services/application-services.md` for the target service.
2. Inspect the service entrypoint in `rust/services/<service>/src/main.rs`.
3. Locate related schema in `rust/infrastructure/db/migrations/` and seed data in `seed/`.
4. Add or update the route, request type, response type, validation, and handler logic.
5. Keep database access consistent with the existing SeaORM/raw SQL style in the service.
6. If the endpoint is consumed by web apps, update `packages/api-client` and relevant app or feature code.
7. If Rust API type generation is involved, update `packages/types` using the documented generation path.
8. Update API/service documentation when routes, env vars, or dependencies change.

## Validation

- Run targeted Rust checks for the changed service.
- Run `cd rust && cargo fmt --all --check`.
- Run `cd rust && cargo clippy --all-targets -- -D warnings` when behavior changed.
- Run `cd rust && cargo test --all` when shared backend behavior changed.
- Run relevant frontend typecheck/build if frontend clients changed.
- Run smoke checks when the endpoint participates in user-visible flows.

## Common Mistakes

- Adding a route but not wiring it into the Axum router.
- Changing response shape without updating clients or shared types.
- Assuming Redis usage because `REDIS_URL` exists; confirm source usage.
- Logging request payloads, credentials, tokens, or PII.
- Skipping docs when adding externally visible API behavior.
- Creating endpoint-specific logic that belongs in shared domain code.

## References

- `docs/services/application-services.md`
- `docs/services/environment-variables.md`
- `docs/architecture/backend.md`
- `docs/architecture/data-and-integration.md`
- `docs/workflow/testing.md`
- `rust/services/user-api/src/main.rs`
- `rust/services/cms-api/src/main.rs`
