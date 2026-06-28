# Skill: terraform

## When to Use

Use when changing AWS infrastructure under `infra/terraform/`, LocalStack validation under `infra/terraform-localstack/`, Terraform workflows, variables, modules, or environment configuration.

## Preconditions

- Target root module is known: `infra/terraform` or `infra/terraform-localstack`.
- Target environment is known for real AWS plans: `dev`, `staging`, or `prod`.
- Required secrets/variables are identified, especially `DB_PASSWORD`, `CERTIFICATE_ARN`, and `AWS_TERRAFORM_ROLE_ARN`.
- The change has a clear owner and rollback/mitigation path if it affects production.

## Steps

1. Read `infra/terraform/README.md` and `docs/workflow/deployment.md`.
2. Inspect the root module and the specific child module being changed.
3. Keep reusable logic inside modules; keep environment-specific values in `environments/<env>/terraform.tfvars`.
4. Update variables, outputs, README docs, and deployment docs together when interfaces change.
5. For app runtime changes, verify ECS task definitions, SSM parameters, IAM permissions, and security groups.
6. For observability changes, reconcile local Compose behavior with Terraform behavior.
7. Add or update LocalStack/Terratest coverage when resource shape changes and the resource is testable locally.

## Validation

- Run `terraform fmt -check -recursive` in the touched Terraform root.
- Run `terraform init -backend=false` for validation-only checks.
- Run `terraform validate`.
- Run `just tf-localstack-test` when LocalStack coverage applies.
- Review `.github/workflows/terraform-aws.yml` impact for CI/CD changes.

## Common Mistakes

- Mixing environment-specific values into modules.
- Forgetting to update IAM permissions for new SSM parameters or AWS APIs.
- Assuming LocalStack validates every AWS behavior.
- Changing ALB paths without updating service docs.
- Forgetting Terraform outputs needed by CI/CD or operators.
- Letting `docs/terraform.md` drift from `infra/terraform/README.md`.

## References

- `infra/terraform/README.md`
- `infra/terraform/main.tf`
- `infra/terraform/modules/`
- `infra/terraform-localstack/`
- `infra/terratest/`
- `docs/services/deployment-matrix.md`
- `docs/workflow/deployment.md`
- `.github/workflows/terraform-aws.yml`
- `.github/workflows/terraform-localstack.yml`
