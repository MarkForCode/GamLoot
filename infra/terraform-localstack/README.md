# Terraform LocalStack Tests

This root module validates a LocalStack-friendly subset of the AWS Terraform stack. It intentionally uses a local backend and fake AWS credentials so it cannot touch the real AWS state bucket.

## What it covers

- Runtime S3 bucket module
- SSM parameter naming
- CloudWatch Logs group naming
- ECR repository naming
- IAM task execution role shape

It does not create Managed Grafana, AMP, X-Ray, ECS services, RDS, ElastiCache, or ALB resources.

## Usage

```bash
just tf-localstack-test
```

Or run the pieces directly:

```bash
docker compose -f docker-compose.localstack.yml up -d localstack

cd infra/terraform-localstack
terraform init
terraform test
tflocal init
tflocal plan

cd ../terratest
go test ./... -v
```
