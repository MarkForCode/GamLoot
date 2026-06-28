# AI Context Map

Use this map to find the right context quickly.

| Question | Start Here |
| --- | --- |
| What is in this repo? | `docs/project/repository-structure.md` |
| What services exist? | `docs/project/services.md` |
| What infrastructure exists? | `docs/project/infrastructure.md` |
| What docs are missing? | `docs/project/documentation-gaps.md` |
| What are the architecture boundaries? | `docs/architecture/` |
| How should I develop a change? | `docs/workflow/development.md` |
| How should I test a change? | `docs/workflow/testing.md` |
| How is deployment handled? | `docs/workflow/deployment.md` |
| How should docs be maintained? | `docs/workflow/documentation.md` |
| Which SOP applies to this task? | `docs/ai/skills/` |
| What automation can I run? | `.agent/hooks/README.md` |
| What durable decisions exist? | `docs/adr/` |

## Code Search Hints

- Use `rg --files` to inspect available files.
- Use `rg "term"` for symbol and text search.
- For frontend commands, inspect the nearest `package.json`.
- For Rust commands, inspect `rust/Cargo.toml` and crate-level `Cargo.toml` files.
- For deployment and infrastructure, inspect `infra/terraform/`, `.github/workflows/`, and `docs/workflow/deployment.md`.
