# Service Documentation

This directory documents runtime services inferred from the repository. It does not invent ownership, production behavior, or business responsibilities when the code does not show them.

## Documents

| Document | Purpose |
| --- | --- |
| `application-services.md` | APIs, workers, and frontend runtime services. |
| `infrastructure-services.md` | Local and cloud infrastructure services. |
| `environment-variables.md` | Environment variables observed in source, Docker Compose, and Terraform. |
| `deployment-matrix.md` | Local and cloud deployment methods inferred from repository files. |

## Evidence Sources

- `docker-compose.yml`
- `rust/services/*`
- `rust/workers/*`
- `apps/*`
- `infra/terraform/*`
- `.github/workflows/*`
- `ops/observability/*`
- `scripts/*`

## TODO Policy

If a responsibility, dependency, variable, or deployment path cannot be inferred from repository files, it is marked with `TODO:` instead of being guessed.
