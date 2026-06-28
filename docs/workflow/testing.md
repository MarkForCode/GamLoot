# Testing Workflow

## Test Selection

| Change Type | Minimum Useful Validation |
| --- | --- |
| Shared TypeScript package | Package lint/typecheck/test. |
| Next.js app | App lint/typecheck/build plus relevant smoke flow. |
| Expo app | App lint/typecheck and relevant web/native smoke flow. |
| Rust service | Rust fmt/clippy/test and service health check. |
| Database migration | Disposable migration validation and seed compatibility. |
| Terraform | `terraform fmt`, `init -backend=false`, `validate`, plus LocalStack/Terratest when shape changes. |
| Observability | Local stack smoke and relevant query/dashboard check. |

## Common Gates

```bash
just lint
just typecheck
just test
just check-rust
just check-all
just smoke
```

## Performance Testing

k6 scenarios live in `tests/k6/` and write reports to `reports/k6/`.

```bash
just k6-smoke
just k6-baseline
just k6-stress
```

## Reporting

Always report:

- commands run;
- pass/fail/skipped status;
- artifacts or logs produced;
- risks not covered by validation.
