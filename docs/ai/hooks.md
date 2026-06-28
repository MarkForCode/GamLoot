# Hooks and Automation

Hooks are lightweight, tool-neutral automation entrypoints. They should be usable by humans, local scripts, CI, and AI agents.

## Hook Locations

| Path | Purpose |
| --- | --- |
| `.agent/hooks/verify-format.sh` | Checks whitespace and Rust formatting without rewriting files. |
| `.agent/hooks/verify-lint.sh` | Runs project lint and Rust clippy. |
| `.agent/hooks/verify-tests.sh` | Runs Node and Rust tests. |
| `.agent/hooks/verify-docs.sh` | Validates documentation structure. |
| `.agent/hooks/verify-migrations.sh` | Applies SQL migrations to disposable Postgres. |
| `.agent/hooks/verify-terraform.sh` | Runs Terraform format/init/validate. |
| `.agent/hooks/pre-commit.sh` | Fast bundle for local pre-commit use. |
| `.agent/hooks/pre-push.sh` | Broader bundle for local pre-push use. |
| `.agent/hooks/ci.sh` | Full verification bundle for CI-style runs. |
| `.agent/hooks/preflight.sh` | Dispatcher for docs-only, pre-commit, pre-push, CI, and full runs. |

## Design Rules

- Hooks should be deterministic and safe to run repeatedly.
- Hooks should avoid network access unless the purpose requires it.
- Hooks should fail loudly with actionable messages.
- Hooks should not mutate source code unless their name clearly says they do.
- Long-running checks should be opt-in flags, not the default.

## Where Hooks Run

| Stage | Recommended Hook | Reason |
| --- | --- | --- |
| Local during development | Individual `verify-*` scripts | Run only the checks relevant to the files being changed. |
| Pre-commit | `.agent/hooks/pre-commit.sh` | Fast non-invasive checks: formatting and docs. |
| Pre-push | `.agent/hooks/pre-push.sh` | Broader checks before sharing: pre-commit, lint, tests, migrations. |
| CI | `.agent/hooks/ci.sh` | Full repository verification, including Terraform validation. |

## Dispatcher Usage

```bash
.agent/hooks/preflight.sh --docs-only
.agent/hooks/preflight.sh --pre-commit
.agent/hooks/preflight.sh --pre-push
.agent/hooks/preflight.sh --ci
```

Do not install these as Git hooks automatically. If a developer wants local Git hooks, they can wire `.git/hooks/pre-commit` or `.git/hooks/pre-push` to these scripts explicitly.
