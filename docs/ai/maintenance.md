# AI Documentation Maintenance

## When to Update AI Docs

Update `docs/ai/` when:

- agent workflow changes;
- a new recurring task needs an SOP;
- validation gates or local commands change;
- a tool-specific adapter drifts from canonical guidance;
- a human has to repeat the same instruction to multiple agents.

## Review Checklist

- Is the canonical guidance in `docs/ai/` rather than duplicated in agent-specific files?
- Does the skill describe inputs, steps, validation, and output?
- Does the hook documentation match scripts in `.agent/hooks/`?
- Do architecture or workflow changes have links to the right docs?
- Does a durable decision need an ADR?

## Ownership

Every contributor can improve these docs. Prefer small, accurate updates over waiting for perfect coverage.
