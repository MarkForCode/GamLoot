# Skill: Bugfix

## Trigger

Use when the user reports broken behavior, failed tests, logs, crashes, incorrect output, or regressions.

## Objective

Reproduce the issue, identify root cause, fix it, and prove the fix.

## Workflow

1. Capture the symptom, environment, reproduction steps, and expected behavior.
2. Search logs, tests, and relevant code.
3. Reproduce locally or create a failing test when practical.
4. Fix the root cause, not only the visible symptom.
5. Add regression coverage if the bug could recur.
6. Run the narrowest meaningful validation, then expand as needed.

## Validation

- The original failure mode no longer reproduces.
- Regression test passes when one was added.
- Related lint/type/build checks pass or are explicitly skipped with reason.

## Output

Report symptom, root cause, fix, validation, and residual risk.
