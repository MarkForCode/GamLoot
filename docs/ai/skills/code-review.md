# Skill: Code Review

## Trigger

Use when asked to review local changes, a diff, a branch, or a pull request.

## Objective

Find correctness, security, reliability, performance, maintainability, and test coverage issues before merge.

## Workflow

1. Identify the diff range and changed files.
2. Read surrounding code for behavior and contracts.
3. Prioritize findings by impact and likelihood.
4. Include file and line references where possible.
5. Avoid style-only comments unless they affect maintainability or project conventions.
6. Note missing tests or validation gaps.

## Output

Lead with findings ordered by severity. If no issues are found, say so and mention residual risk or test gaps.
