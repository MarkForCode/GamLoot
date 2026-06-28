# AI Skills

Skills are task-specific SOPs written in plain Markdown so any coding agent can follow them.

| Skill | Use When |
| --- | --- |
| `add-api.md` | Adding or changing `user-api` / `cms-api` endpoints and clients. |
| `db-migration.md` | Adding, changing, or validating database migrations and seed data. |
| `terraform.md` | Changing Terraform root modules, modules, workflows, or environments. |
| `ecs-service.md` | Adding or changing ECS/Fargate services, ALB wiring, ECR, Cloud Map, or FireLens. |
| `testing.md` | Designing, adding, fixing, or running validation. |
| `debugging.md` | Diagnosing failing services, tests, CI, infrastructure, or observability. |
| `requirements-analysis.md` | Turning a user request into scoped requirements before implementation. |
| `feature-development.md` | Implementing a confirmed feature. |
| `bugfix.md` | Reproducing, diagnosing, fixing, and validating a bug. |
| `refactor.md` | Improving structure without changing behavior. |
| `code-review.md` | Reviewing a diff or PR. |
| `deployment.md` | Preparing, checking, or executing deployment work. |
| `documentation-maintenance.md` | Updating docs as part of engineering work. |

## Skill Format

Each skill should define:

- when to use;
- preconditions;
- steps;
- validation;
- common mistakes;
- references.
