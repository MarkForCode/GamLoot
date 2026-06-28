# AI Collaboration Framework

This is the shared operating manual for AI coding agents working in this repository.
Use it from Codex, Claude Code, OpenCode, Cursor, Gemini CLI, or any other tool.

## First Read

1. `docs/project/repository-structure.md`
2. `docs/ai/collaboration-rules.md`
3. `docs/ai/context-map.md`
4. The relevant skill in `docs/ai/skills/`
5. The relevant workflow in `docs/workflow/`

## Core Principle

Agents should behave like careful maintainers of the engineering platform:

- understand the current system before editing;
- keep changes scoped to the task;
- prefer existing patterns over new abstractions;
- validate the smallest meaningful surface;
- update docs when behavior, workflow, or architecture changes.

## Canonical Sources

Tool-specific files such as `AGENTS.md`, `CLAUDE.md`, and `.opencode/instructions.md` are adapters. They should stay small and point here.
