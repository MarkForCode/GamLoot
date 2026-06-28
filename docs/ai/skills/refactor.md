# Skill: Refactor

## Trigger

Use when the user asks to restructure, simplify, rename, extract, or improve code without intended behavior changes.

## Objective

Improve maintainability while preserving behavior.

## Workflow

1. Define the refactor boundary and behavior that must remain unchanged.
2. Inspect current tests and decide whether characterization coverage is needed.
3. Make small, reviewable edits.
4. Avoid mixing refactor with feature changes.
5. Update architecture docs only if boundaries or conventions changed.

## Validation

- Existing relevant tests pass.
- Type and lint checks pass for touched packages.
- Manual behavior checks are noted when automated coverage is missing.

## Output

State the refactor goal, changed structure, validation, and confirmation that behavior was intended to remain unchanged.
