# OpenCode Adapter

OpenCode should follow the repository-wide AI collaboration framework, not a separate OpenCode-only workflow.

## Required Reading Order

1. `docs/ai/README.md`
2. `docs/ai/collaboration-rules.md`
3. `docs/ai/context-map.md`
4. Relevant skill under `docs/ai/skills/`
5. Relevant workflow under `docs/workflow/`
6. Relevant architecture doc under `docs/architecture/`

## OpenCode-Specific Note

The files in `.opencode/skills/` may be used as local shortcuts, but their behavior should stay consistent with `docs/ai/skills/`. If they drift, update the canonical skill first and then adjust the shortcut.

## Validation

```bash
.agent/hooks/validate-docs.sh
.agent/hooks/preflight.sh --docs-only
.agent/hooks/preflight.sh --full
```
