# Skill: Feature Development

## Trigger

Use when requirements are confirmed and the user asks to implement a feature.

## Objective

Implement the smallest coherent feature slice using existing architecture and validation gates.

## Workflow

1. Read requirements, architecture docs, and relevant code.
2. Decide implementation order. Prefer database/API/types/client/frontend when the feature changes server contracts.
3. Add or update tests near the changed behavior.
4. Keep generated artifacts and regeneration commands documented.
5. Update docs when commands, contracts, workflows, or architecture change.
6. Run targeted validation, then broader validation if the blast radius warrants it.

## Validation

- TypeScript: `just lint`, `just typecheck`, package-specific commands, or `pnpm` equivalents.
- Rust: `cd rust && cargo fmt --all --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test --all`.
- Smoke: `just smoke` when services are running or the change affects user-visible flows.

## Output

Summarize changed files, behavior, validation, and any skipped checks.
