# AI Collaboration Rules

## Operating Rules

- Inspect before editing. Read the nearest docs and relevant code first.
- Do not implement business logic unless the user asked for implementation.
- Keep changes modular and reversible.
- Preserve user changes. Never revert unrelated edits.
- Prefer `just` commands where available.
- Prefer `rg` for search.
- Use structured APIs and parsers instead of ad hoc string manipulation when practical.
- Do not commit secrets, credentials, tokens, private keys, production data, or sensitive logs.
- Treat generated files as derived artifacts and document the regeneration command.

## Change Discipline

- Start with the smallest coherent change.
- Avoid broad refactors during feature or bug work unless necessary.
- If a decision changes architecture or long-term workflow, create or update an ADR.
- If a command, port, environment variable, deployment path, or validation gate changes, update docs in the same change.

## Communication

- State assumptions explicitly when they affect implementation.
- Report what was changed and how it was validated.
- If validation cannot run locally, say why and name the next best check.
- For risky changes, explain the plan before editing.

## Multi-Agent Compatibility

- Keep canonical instructions in `docs/ai/`.
- Tool-specific agent files may add syntax or invocation details, but not conflicting policy.
- Skills should be plain Markdown SOPs so they can be read by any agent.
- Hooks should be shell scripts or documented commands, not vendor-specific magic.
