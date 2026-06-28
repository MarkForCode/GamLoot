# Skill: Requirements Analysis

## Trigger

Use when the user asks for a new capability, product change, or technical initiative and the scope is not yet implementation-ready.

## Objective

Create a clear, testable scope without starting business logic implementation.

## Workflow

1. Identify the target user, business goal, and non-goals.
2. Search existing code and docs for related behavior.
3. Split requirements into must-have, should-have, nice-to-have, and out-of-scope.
4. Identify affected domains: frontend, API, database, workers, infrastructure, docs.
5. Note open questions and assumptions.
6. Recommend the next workflow or ADR if needed.

## Validation

- Requirements are traceable to user value.
- Scope excludes unrelated implementation.
- Open questions are explicit.
- Existing related functionality is referenced.

## Output

Return a concise requirements brief and wait for confirmation before feature implementation.
