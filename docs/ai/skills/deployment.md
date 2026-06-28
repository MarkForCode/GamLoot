# Skill: Deployment

## Trigger

Use when preparing release, deployment, infrastructure apply, rollback, or production-impacting changes.

## Objective

Deploy intentionally with clear validation, rollback, and observability.

## Workflow

1. Identify target environment and changed components.
2. Confirm required secrets, variables, migrations, and infrastructure prerequisites.
3. Run local or CI validation appropriate to the component.
4. For Terraform, prefer validate and plan before apply.
5. Define rollback or mitigation before production changes.
6. Monitor health, logs, metrics, and traces after deployment.

## Validation

- Application changes pass CI gates.
- Infrastructure changes pass `terraform fmt`, `init -backend=false`, and `validate`.
- LocalStack/Terratest runs when Terraform shape changes warrant it.
- Smoke tests or health checks are run after deployment.

## Output

Report environment, components, validation, deployment action, monitoring signals, and rollback path.
