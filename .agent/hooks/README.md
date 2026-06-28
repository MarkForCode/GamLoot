# Agent Hooks

Hooks are safe shell entrypoints for repeatable validation.

## Available Verification Hooks

```bash
.agent/hooks/verify-format.sh
.agent/hooks/verify-lint.sh
.agent/hooks/verify-tests.sh
.agent/hooks/verify-docs.sh
.agent/hooks/verify-migrations.sh
.agent/hooks/verify-terraform.sh
```

## Bundles

```bash
.agent/hooks/pre-commit.sh
.agent/hooks/pre-push.sh
.agent/hooks/ci.sh
.agent/hooks/preflight.sh --docs-only
.agent/hooks/preflight.sh --pre-commit
.agent/hooks/preflight.sh --pre-push
.agent/hooks/preflight.sh --ci
.agent/hooks/preflight.sh --full
```

## Behavior

- `verify-format.sh` checks whitespace and Rust formatting; it does not rewrite files.
- `verify-lint.sh` runs project lint and Rust clippy where tools are available.
- `verify-tests.sh` runs Node and Rust tests.
- `verify-docs.sh` validates the AI documentation framework.
- `verify-migrations.sh` applies SQL migrations to a disposable Postgres container.
- `verify-terraform.sh` runs Terraform format, init without backend, and validate.
- `pre-commit.sh` runs fast local checks: formatting and docs.
- `pre-push.sh` runs pre-commit plus lint, tests, and migrations.
- `ci.sh` runs pre-push plus Terraform validation.

These scripts do not commit changes, rewrite source files, install tools, or apply migrations to persistent databases.
