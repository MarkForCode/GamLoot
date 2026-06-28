# AGENTS.md

Root instructions for all AI coding agents working in this repository. This file is intentionally short; canonical details live under `docs/`.

## Canonical Docs

- AI operating manual: `docs/ai/README.md`
- Collaboration rules: `docs/ai/collaboration-rules.md`
- Context map: `docs/ai/context-map.md`
- Task SOPs: `docs/ai/skills/`
- Architecture: `docs/architecture/`
- Workflows: `docs/workflow/`
- Services: `docs/services/`
- Decisions: `docs/adr/`
- Neutral hooks: `.agent/hooks/`

## Universal Rules

- Inspect relevant docs and code before editing.
- Do not implement business logic unless the user explicitly asks for implementation.
- Keep changes scoped to the request.
- Preserve user work; never revert unrelated changes.
- Prefer existing project patterns over new abstractions.
- Prefer `just` targets for local workflows.
- Use `rg` for search.
- Do not commit or print secrets, credentials, tokens, private keys, production data, or sensitive logs.
- If facts cannot be inferred from the repo, write `TODO:` instead of guessing.
- If a change affects architecture, workflow, commands, deployment, or service behavior, update docs in the same change.

## Documentation-First Workflow

1. Read `docs/ai/context-map.md` to find the relevant docs.
2. Read the applicable skill in `docs/ai/skills/`.
3. Inspect the relevant implementation files.
4. For unclear requirements, produce analysis or a doc change before code.
5. For implementation work, update docs/ADRs when behavior or long-term decisions change.
6. Run the smallest meaningful validation before handing work back.

Do not duplicate long command lists, architecture descriptions, or service inventories in agent-specific files. Link to the canonical doc instead.

## Testing Requirements

- Match validation scope to risk and changed files.
- For docs-only changes, run:

```bash
.agent/hooks/validate-docs.sh
git diff --check
```

- For TypeScript changes, run the relevant package lint/typecheck/test or the broader `just` gate.
- For Rust changes, run the relevant `cargo` check/test plus formatting/clippy when appropriate.
- For infrastructure changes, run Terraform format and validation for the touched root module.
- For user-visible or service integration changes, run the relevant smoke flow when services are available.
- If a required check cannot run, report the reason and the next best validation.

See `docs/workflow/testing.md` for the full testing workflow.

## Coding Standards

- Keep code idiomatic for the surrounding package or crate.
- Avoid unrelated refactors and formatting churn.
- Use named types/interfaces over `any`; use `unknown` plus narrowing for flexible data.
- Keep Rust domain logic separate from infrastructure concerns.
- Keep shared frontend packages reusable across apps.
- Treat generated artifacts as derived; document or run the regeneration command when changing their source.
- Add comments only where they clarify non-obvious logic.

See `docs/architecture/` and `docs/workflow/development.md` for boundaries and workflow details.

## Review Process

- Review diffs for correctness, regressions, security, reliability, performance, and missing tests.
- Lead with findings, ordered by severity, with file/line references where possible.
- Do not spend review attention on style-only issues unless they affect maintainability or established conventions.
- Call out documentation or ADR gaps when the change affects long-term behavior.
- If no issues are found, say so and note any residual risk or unrun checks.

See `docs/ai/skills/code-review.md` for the detailed review SOP.
