# Skill: ecs-service

## When to Use

Use when adding, renaming, configuring, or debugging an ECS/Fargate service, ECR repository, task definition, ALB attachment, Cloud Map registration, or FireLens/Loki log routing.

## Preconditions

- Service name is chosen and checked against existing naming in Docker Compose, Rust package names, Terraform keys, ECR repositories, ECS services, and log labels.
- Public/private exposure is known.
- Port and health check path are known for public HTTP services.
- Required runtime secrets and environment variables are known.
- Dockerfile or image build path exists.

## Steps

1. Inspect `docs/services/deployment-matrix.md` for existing service patterns.
2. Update `infra/terraform/main.tf` `local.services` for ECS service creation.
3. If public, update `local.public_services` with port, health check path, priority, and path patterns.
4. Ensure the service has a corresponding Dockerfile and ECR-compatible image name.
5. Confirm SSM secret needs through `modules/ecs-service`.
6. Confirm security group ingress: ALB for public services, collector access for scrapeable services.
7. Confirm Cloud Map registration behavior for services with ports.
8. Confirm logging: FireLens/Loki when enabled, CloudWatch fallback when configured.
9. Update service docs and deployment matrix.

## Validation

- Run Terraform format and validation for `infra/terraform`.
- Run LocalStack/Terratest if resource shape is covered.
- For local parity, run Docker Compose for the service when a Compose service exists.
- For HTTP services, verify `/health` and `/metrics` where applicable.
- Confirm ALB path rules do not conflict with existing priorities.

## Common Mistakes

- Using different names across Rust, Docker Compose, Terraform, ECR, ECS, and Loki labels without documenting it.
- Marking a service public without a health endpoint.
- Forgetting SSM secret access for runtime configuration.
- Forgetting service discovery for private service-to-service calls.
- Adding a worker to ALB accidentally.
- Assuming frontend Dockerfiles are deployed by Terraform when no ECS service exists for them.

## References

- `docs/services/application-services.md`
- `docs/services/deployment-matrix.md`
- `infra/terraform/main.tf`
- `infra/terraform/modules/ecs-service/`
- `infra/terraform/modules/alb/`
- `infra/terraform/README.md`
- `docker-compose.yml`
