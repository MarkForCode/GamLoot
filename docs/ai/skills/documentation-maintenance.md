# Skill: Documentation Maintenance

## Trigger

Use when docs are stale, missing, duplicated, or when a code change modifies architecture, commands, workflows, or operations.

## Objective

Keep documentation accurate, modular, and easy for humans and AI agents to consume.

## Workflow

1. Identify the canonical location for the information.
2. Update one source of truth and link to it from adapters.
3. Remove or reduce duplicated facts when possible.
4. Add an ADR for durable architectural decisions.
5. Run `.agent/hooks/validate-docs.sh`.

## Validation

- Links and paths are accurate.
- Tool-specific agent files do not conflict with canonical docs.
- Documentation explains why the information exists, not just what files exist.

## Output

Summarize docs changed and the maintenance problem they solve.
