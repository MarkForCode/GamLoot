# OpenCode Completion Instructions

## Before Finishing Task

1. **Run lint** - `pnpm lint` or `just lint`
2. **Run typecheck** - `pnpm typecheck` or check for TS errors
3. **Build verification** - `pnpm build` passes
4. **Smoke test** - `just smoke` (if applicable)

## Code Quality

- No hardcoded secrets/keys
- No console.log in production code
- Add comments only for complex logic
- Follow existing code style

## Git

- Run `git status` before commit
- Commit message: short summary + body if needed
- Don't commit build artifacts

## Docker

- Test with `docker-compose up --build` before marking complete
- Verify database seed runs correctly
