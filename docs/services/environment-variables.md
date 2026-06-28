# Service Environment Variables

This document lists environment variables observed in source code, Dockerfiles, Docker Compose, Terraform, and workflow scripts.

## Application Runtime Variables

| Variable | Services | Required By Source | Provided By | Notes |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | `user-api`, `cms-api`, workers | `user-api`, `cms-api` | Dockerfiles, Docker Compose, Terraform SSM | Source defaults to local PostgreSQL for APIs. Workers receive it but current source does not read it. |
| `REDIS_URL` | `user-api`, `cms-api`, workers | TODO: no direct source read found in inspected API/worker entrypoints | Dockerfiles, Docker Compose, Terraform SSM | Provided consistently by runtime config. |
| `APP_ENV` | `user-api`, `cms-api`, ECS services | Observability library fallback | Docker Compose, Terraform | Used as deployment environment metadata. |
| `DEPLOYMENT_ENVIRONMENT` | ECS services | Observability library | Terraform | Preferred deployment environment metadata. |
| `OTEL_SERVICE_NAME` | `user-api`, `cms-api`, ECS services | Observability library | Docker Compose, Terraform | Service name for telemetry. |
| `SERVICE_NAME` | Rust observability | Observability library | TODO: no provider found | Fallback service name. |
| `SERVICE_VERSION` | Rust observability | Observability library | TODO: no provider found | Optional service version override. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `user-api`, `cms-api`, ECS services | Observability library | Docker Compose, Terraform | Local points at Alloy; Terraform points at collector endpoint when enabled. |
| `OTEL_TRACES_SAMPLER` | `user-api`, `cms-api`, ECS services | OpenTelemetry runtime config | Docker Compose, Terraform | Set to `parentbased_traceidratio`. |
| `OTEL_TRACES_SAMPLER_ARG` | `user-api`, `cms-api`, ECS services | Observability library | Docker Compose, Terraform | Trace sample ratio. |
| `RUST_LOG` | `user-api`, `cms-api`, ECS services | Rust logging stack | Docker Compose, Terraform | Set to `info` in Compose/Terraform. |
| `LOG_FILE_PATH` | Rust observability | Observability library | TODO: no provider found | Optional file logging path. |
| `USER_API_URL` | `user-web`, `user-app` container | `user-web` API route | Docker Compose | `user-web` uses it as server-side proxy target. `user-app` source does not read it directly. |
| `NEXT_PUBLIC_API_URL` | `user-web`, `admin-web config` | `user-web` config/API route; `admin-web` next config | Docker Compose for `user-web`; `next.config.js` defaults | `admin-web` also has this config key but CMS proxy uses CMS-specific variables. |
| `CMS_API_URL` | `admin-web` | `admin-web` API route | Docker Compose | Server-side CMS proxy target. |
| `NEXT_PUBLIC_CMS_API_URL` | `admin-web` | `admin-web` API route | Docker Compose | Public/client CMS API URL and proxy fallback. |
| `EXPO_PUBLIC_USER_API_URL` | `user-app` | `apps/user/app/App.tsx` | TODO: no provider found in Docker Compose | Overrides native platform defaults. |
| `EXPO_NO_TELEMETRY` | `user-app` | Expo tooling | Docker Compose | Set to `1`. |
| `CI` | `user-app` | Expo/tooling behavior | Docker Compose | Set to `1`. |

## Local Infrastructure Variables

| Variable | Service | Source | Notes |
| --- | --- | --- | --- |
| `POSTGRES_USER` | `postgres` | Docker Compose | Local database username. |
| `POSTGRES_PASSWORD` | `postgres` | Docker Compose | Local database password. |
| `POSTGRES_DB` | `postgres` | Docker Compose | Local database name. |
| `GF_SECURITY_ADMIN_USER` | `grafana` | Docker Compose | Local Grafana admin user. |
| `GF_SECURITY_ADMIN_PASSWORD` | `grafana` | Docker Compose | Local Grafana admin password. |

## Terraform / CI Variables and Secrets

| Variable | Used By | Notes |
| --- | --- | --- |
| `AWS_TERRAFORM_ROLE_ARN` | `.github/workflows/terraform-aws.yml` | Role assumed through GitHub OIDC for Terraform plan/apply. |
| `DB_PASSWORD` | `.github/workflows/terraform-aws.yml` | Passed as `TF_VAR_db_password`. |
| `CERTIFICATE_ARN` | `.github/workflows/terraform-aws.yml` | Passed as `TF_VAR_certificate_arn`. |
| `AWS_REGION` | Terraform workflow | Defaults to `us-east-1`. |
| `TF_IN_AUTOMATION` | Terraform workflow | Enables Terraform automation mode. |
| `OPENAI_API_KEY` | AI code review workflow | Required for advisory AI review. |
| `OPENAI_MODEL` | AI code review workflow | Optional model override. |
| `GITHUB_TOKEN` | AI code review workflow | Used to write PR comments. |

## Test and Script Variables

These variables are used by local smoke, Appium, and k6 scripts rather than production services.

| Prefix / Variable | Purpose |
| --- | --- |
| `APP_URL` | Target URL for web/app smoke scripts. |
| `CHROME_BIN` | Browser executable for smoke scripts. |
| `WEB_SMOKE_*` | User web smoke script timing/debug settings. |
| `APP_SMOKE_*` | Expo web smoke script timing/debug settings. |
| `APPIUM_*`, `ANDROID_*`, `IOS_*` | Appium native/web smoke configuration. |
| `APP_LOGIN_USERNAME`, `APP_LOGIN_PASSWORD` | Optional smoke test credentials. |
| `USER_API_BASE_URL`, `CMS_API_BASE_URL`, `K6_*` | k6 load testing target and profile configuration. |
