# ADR 0001: Adopt AI-First Collaboration Framework

## Status

Accepted

## Context

Multiple AI coding agents can work in this repository, including Codex, Claude Code, OpenCode, Cursor, and Gemini CLI. Existing guidance was split across tool-specific files, which increases drift and makes agents follow different workflows.

## Decision

The repository will use a tool-neutral AI collaboration framework:

- canonical AI guidance lives in `docs/ai/`;
- task-specific SOPs live in `docs/ai/skills/`;
- architecture, workflow, and project facts live in dedicated `docs/` subdirectories;
- durable decisions live in `docs/adr/`;
- runnable neutral hooks live in `.agent/hooks/`;
- tool-specific files are adapters that point to canonical docs.

## Consequences

- AI agents and humans share one source of truth.
- Tool-specific files become smaller and less likely to drift.
- Documentation maintenance becomes part of engineering workflow.
- Contributors must update canonical docs when commands, architecture, or workflows change.

## Alternatives Considered

- Keep separate agent-specific instructions: rejected because repeated facts drift quickly.
- Put all guidance in `README.md`: rejected because the README would become too large and unfocused.
- Use only vendor-specific automation: rejected because the project needs compatibility across multiple AI tools.
