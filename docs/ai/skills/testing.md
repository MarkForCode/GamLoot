# Skill: testing

## When to Use

Use when designing, adding, fixing, or running validation for TypeScript, Rust, database, infrastructure, mobile, smoke, or load testing work.

## Preconditions

- Changed files and behavioral risk are identified.
- The affected service, package, or infrastructure module is known.
- Required local dependencies are available or explicitly unavailable.
- Test data requirements are known, especially seed/demo users for smoke and k6 flows.

## Steps

1. Identify the failure modes the change could introduce.
2. Choose the narrowest fast check that proves the changed behavior.
3. Add regression tests for bugs and contract tests for API/type boundaries.
4. Use package-level checks while iterating.
5. Use service smoke tests for integrated user-visible workflows.
6. Use k6 only when validating API latency, error rate, or capacity.
7. Record skipped checks with the reason and next best validation.

## Validation

Use the validation level that matches the change:

| Change Type | Validation |
| --- | --- |
| Docs only | `.agent/hooks/validate-docs.sh`, `git diff --check` |
| TypeScript package/app | Relevant `pnpm --filter ... lint/typecheck/test`, or `just lint`, `just typecheck`, `just test` |
| Rust service/worker | `cd rust && cargo fmt --all --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test --all` as risk warrants |
| Database migration | `just validate-migrations` and local migration apply when appropriate |
| Terraform | `terraform fmt -check -recursive`, `terraform init -backend=false`, `terraform validate` |
| User-visible flow | Relevant smoke flow or `just smoke` when services are available |
| Load/performance | `just k6-smoke`, `just k6-baseline`, or `just k6-stress` |

## Common Mistakes

- Running only broad slow checks and skipping the targeted reproduction.
- Adding tests that depend on unstated local data.
- Forgetting to update generated/shared types after API contract changes.
- Treating smoke tests as a substitute for unit/regression coverage.
- Running destructive database commands against a non-disposable database.
- Reporting that tests pass without naming the commands.

## References

- `docs/workflow/testing.md`
- `docs/services/deployment-matrix.md`
- `tests/k6/README.md`
- `docs/appium-ios-testing.md`
- `justfile`
- `.github/workflows/ci.yml`
