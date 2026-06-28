# Claude Code Adapter

Claude Code should follow the repository-wide AI collaboration framework, not a separate Claude-only workflow.

## Required Reading Order

1. `docs/ai/README.md`
2. `docs/ai/collaboration-rules.md`
3. `docs/ai/context-map.md`
4. Relevant skill under `docs/ai/skills/`
5. Relevant workflow under `docs/workflow/`
6. Relevant architecture doc under `docs/architecture/`

## Claude-Specific Note

The files in `.claude/commands/` may be used as command shortcuts, but their behavior should stay consistent with `docs/ai/skills/`. If they drift, update the canonical skill first and then adjust the shortcut.

## Default Commands

Prefer `just` targets. Run `just` to list available commands.

Useful validation entrypoints:

```bash
.agent/hooks/validate-docs.sh
.agent/hooks/preflight.sh --docs-only
.agent/hooks/preflight.sh --full
```
