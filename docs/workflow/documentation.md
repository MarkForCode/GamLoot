# Documentation Workflow

## When Docs Must Change

Update docs when a change affects:

- architecture boundaries;
- service ownership, ports, or runtime topology;
- commands or validation gates;
- environment variables or secrets;
- deployment, rollback, or infrastructure behavior;
- AI agent workflow or task SOPs.

## How to Update

1. Find the canonical doc using `docs/ai/context-map.md`.
2. Update the smallest relevant document.
3. Link instead of duplicating facts.
4. Update tool-specific adapters only when their entrypoint behavior changes.
5. Add or update an ADR for durable decisions.
6. Run `.agent/hooks/validate-docs.sh`.

## Anti-Patterns

- Copying the same command list into every agent file.
- Writing broad placeholder docs that do not guide decisions.
- Leaving architecture decisions only in chat history.
- Adding stale TODOs without reason or owner.
