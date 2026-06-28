# Frontend Architecture

## Apps

| App | Responsibility |
| --- | --- |
| `apps/user/web/` | User-facing Next.js web experience. |
| `apps/user/app/` | Expo / React Native mobile app. |
| `apps/admin/web/` | CMS/admin Next.js experience. |

## Shared Packages

| Package | Responsibility |
| --- | --- |
| `packages/ui/` | Cross-platform UI primitives and providers. |
| `packages/features/` | Reusable feature hooks and user flows. |
| `packages/api-client/` | API calls and client-side integration with backend services. |
| `packages/types/` | Shared TypeScript types and generated API contract types. |
| `packages/config/` | Shared i18n, routing, ESLint, TypeScript, and styling config. |

## Rules

- Use shared packages for behavior or UI needed by multiple apps.
- Keep app-only routing and page composition inside the app.
- Do not import app code from packages.
- Prefer named types over `any`; use `unknown` plus narrowing for flexible data.
- When Rust API types change, regenerate and validate `packages/types`.

## Validation

Use targeted package commands while developing, then broader gates before handoff:

```bash
just lint
just typecheck
just build
```
