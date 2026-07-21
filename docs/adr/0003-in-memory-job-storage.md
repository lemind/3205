# 0003. Job & result storage: in-memory only

**Status**: Accepted

**Related**: [spec.md](../../specs/001-url-status-checker/spec.md) (Key Entities, Assumptions)

## Context

The brief explicitly states a database is not needed and in-memory storage is sufficient. This is a real architectural decision, not just an omission — it constrains scaling, restart behavior, and how concurrent mutation must be handled.

## Decision

`JobsService` holds a single `Map<string, Job>` (Job including its embedded URL results) as the sole source of truth, scoped to the Nest process (singleton provider, default scope). `jobId` generated with `crypto.randomUUID()`. No repository/ORM abstraction layer — direct `Map` access from the one service that owns it.

Mutations to a job's or a URL result's status happen through methods on `JobsService`/`UrlCheckerService` only; nothing outside those services touches the map directly, keeping all state transitions in one place.

## Consequences

- Zero persistence: a process restart loses all jobs. Acceptable — explicitly out of scope per the brief (see spec.md Assumptions).
- Zero horizontal scaling: this only works as a single instance. Acceptable for a demo/test-task deployment (`docker-compose`, one `backend` replica).
- Node's single-threaded event loop means no true data races on the `Map` itself, but interleaved `async` operations can still race on read-modify-write sequences (e.g., two status updates for the same job overlapping). All state transitions go through synchronous, single-step updates (e.g., reassigning one field at a time) to avoid needing explicit locking.
- No migration path drawn to a real DB now; if ever needed, `JobsService`'s method boundary is the seam where a repository could be swapped in.

## Alternatives Considered

- **SQLite/lowdb file-backed store**: rejected — brief says a DB isn't needed; would add complexity (schema, migrations) with no requirement driving it.
- **Repository interface now, in-memory implementation behind it**: rejected — premature abstraction for a single implementation with no second one in sight (KISS, see [AGENTS.md](../../AGENTS.md)).
