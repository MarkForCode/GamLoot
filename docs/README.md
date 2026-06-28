# Documentation

This directory is the canonical knowledge base for the Game Trade Platform.
AI agents and humans should prefer these docs over tool-specific instructions.

## Structure

| Area | Purpose |
| --- | --- |
| `project/` | Stable repository facts: structure, services, infrastructure, and known documentation gaps. |
| `services/` | Detailed service catalog covering responsibilities, dependencies, infrastructure, environment variables, and deployment methods. |
| `ai/` | Shared AI collaboration rules, context map, skills, hooks, and maintenance workflow. |
| `architecture/` | System design, frontend/backend boundaries, data flow, and observability. |
| `workflow/` | Development, testing, deployment, and documentation workflows. |
| `adr/` | Architecture Decision Records for durable engineering decisions. |

## Maintenance Rules

- Keep canonical facts in one place and link to them from adapter files.
- Update docs in the same change as architecture, workflow, command, or deployment changes.
- Prefer short, focused documents over large catch-all files.
- Record significant design decisions as ADRs.
- When a tool-specific AI file needs guidance, make it point back to `docs/ai/`.
