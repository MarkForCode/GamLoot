# Architecture Documentation

Architecture docs describe system boundaries and design intent. They should explain how the platform is shaped without duplicating command references from workflow docs.

## Documents

| Document | Purpose |
| --- | --- |
| `overview.md` | End-to-end system map and major boundaries. |
| `frontend.md` | Frontend apps and shared package responsibilities. |
| `backend.md` | Rust services, workers, and crate boundaries. |
| `data-and-integration.md` | Database, cache, API contracts, and generated type flow. |
| `observability.md` | Logs, metrics, traces, and diagnostics model. |

## Change Rule

If a code change alters a boundary, dependency direction, data ownership, or runtime topology, update the relevant architecture doc and consider an ADR.
