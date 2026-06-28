# Potential Missing Documentation

This list tracks documentation that would reduce onboarding and AI-agent ambiguity. It is not a request to implement business logic.

## High Value

- API contract reference for `user-api` and `cms-api`.
- Database schema guide covering migrations, seed data, and ownership of generated entities.
- Environment variable reference with required, optional, local-only, and CI-only variables.
- Release and rollback runbooks for web apps, APIs, workers, and infrastructure.
- Security model covering authentication, authorization, secret handling, and PII logging.
- Worker reliability guide covering retries, idempotency, dead-letter handling, and recovery.

## Medium Value

- Package ownership matrix for `packages/*`.
- Design artifact index mapping `design/*` to implemented screens.
- Mobile build and release guide beyond local smoke testing.
- Incident response and observability query cookbook.

## Maintenance Rule

When a gap becomes relevant to a task, either create the missing doc or add a focused TODO with an owner and reason. Do not let undocumented behavior become implicit agent knowledge.
