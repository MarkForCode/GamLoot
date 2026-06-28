# Skill: debugging

## When to Use

Use when diagnosing failing tests, broken local services, API errors, frontend failures, infrastructure issues, observability gaps, or CI failures.

## Preconditions

- Symptom, environment, and expected behavior are known.
- Relevant service or workflow is identified.
- Logs, command output, or reproduction steps are available, or the first step is to collect them.
- Avoid changing code until the likely failure boundary is understood.

## Steps

1. Identify the failing boundary: frontend, API, database, worker, infrastructure, observability, or CI.
2. Read the relevant service doc in `docs/services/`.
3. Reproduce locally with the smallest command or request.
4. Check health endpoints, logs, metrics, and recent code changes.
5. Trace dependencies outward: caller, service, database/cache, external runtime, deployment config.
6. Form a root-cause hypothesis and test it.
7. Fix the root cause or document the unresolved blocker with evidence.
8. Add regression coverage when the failure could recur.

## Validation

- Re-run the failing command or reproduction.
- Run targeted tests around the changed component.
- Run broader checks when shared code or infrastructure changed.
- For service issues, verify health and relevant smoke flow.
- For observability issues, verify logs/metrics/traces reach the expected backend.

## Common Mistakes

- Fixing the first visible error without finding the root cause.
- Ignoring service dependencies like Postgres, Redis, proxies, or ALB paths.
- Debugging frontend API failures without checking proxy environment variables.
- Treating worker names as interchangeable across Docker Compose and Terraform.
- Dropping logs or screenshots without summarizing the important evidence.
- Leaving temporary diagnostic logging enabled.

## References

- `docs/ai/skills/bugfix.md`
- `docs/services/application-services.md`
- `docs/services/environment-variables.md`
- `docs/services/deployment-matrix.md`
- `docs/architecture/observability.md`
- `ops/observability/README.md`
- `scripts/observability/`
- `.github/workflows/`
