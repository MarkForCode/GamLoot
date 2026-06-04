# K6 Load Testing

API load tests for the Rust services live here. The default scenario covers:

- `user-api /health`
- `user-api /metrics`
- `user-api /auth/login` success
- `user-api /auth/login` expected failure
- `cms-api /health`
- `cms-api /metrics`
- `cms-api /auth/login` success

Run a quick smoke test:

```bash
pnpm run load:k6:smoke
```

Run the default baseline profile:

```bash
pnpm run load:k6
# or
just k6-baseline
```

Run with Docker when k6 is not installed locally:

```bash
pnpm run load:k6:docker
```

Useful overrides:

```bash
USER_API_BASE_URL=http://localhost:8080 \
CMS_API_BASE_URL=http://localhost:8081 \
K6_PROFILE=baseline \
K6_BASELINE_TARGET_VUS=10 \
K6_HOLD=3m \
pnpm run load:k6
```

Reports are written to `reports/k6/`.

See `.opencode/skills/k6-load-testing.md` for the project workflow, thresholds, and observability checklist.
