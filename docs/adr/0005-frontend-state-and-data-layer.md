# 0005. Frontend state & data layer: Redux Toolkit + RTK Query

**Status**: Accepted

**Related**: [spec.md](../../specs/001-url-status-checker/spec.md) (FR-011–FR-014, SC-003), [0006](0006-frontend-architecture-fsd.md)

## Context

State manager was picked (Redux Toolkit, per brief's allowed options). What remains is *how* the app fetches data, polls the active job, and — the brief's sharpest correctness requirement — guarantees that switching the active job cleanly stops the old poll and never lets a stale response for the old job overwrite the UI (FR-014, SC-003).

## Decision

Use **RTK Query**, not just plain RTK slices + hand-rolled `fetch`/`setInterval`, as the API layer:

- `jobsApi` (`createApi`) with endpoints:
  - `listJobs: build.query<JobSummary[], void>`
  - `getJob: build.query<JobDetail, string>` (keyed by `jobId`) with `pollingInterval` set while the query is subscribed and the job is non-terminal (interval driven off the returned `status`, cleared once terminal).
  - `createJob: build.mutation<{ jobId: string }, { urls: string[] }>`
  - `cancelJob: build.mutation<void, string>`
- The **active job** is plain RTK state (`activeJobId` in a slice) driving which `getJob(jobId)` query is subscribed via the `useGetJobQuery(activeJobId, { skip: !activeJobId })` hook in the detail component.
- Loading/error states come from the RTK Query hooks' own `isLoading`/`isFetching`/`error` fields — not duplicated into custom slice state (see [AGENTS.md](../../AGENTS.md), avoid premature abstraction / duplication).

Why this solves FR-014/SC-003 structurally rather than by hand-written guarding:
- RTK Query caches per argument (`jobId`). Switching `activeJobId` unsubscribes the old `getJob(oldId)` query (component stops rendering it) and subscribes a new one — the old poll's `setInterval`-equivalent is torn down by RTK Query itself, not by app code remembering to clear a timer.
- Each query's requests are correlated to their own cache entry; a late response for `oldId` updates `oldId`'s cache entry, not `activeJobId`'s — it can never leak into the currently-displayed job because the UI only ever reads the entry for the *current* `activeJobId`.

## Consequences

- Removes an entire class of manual bugs (forgetting to clear an interval, not guarding against out-of-order responses) that the brief specifically flags as a requirement — the library's cache-per-arg model makes the "stale update" bug structurally hard to write, not just guarded against.
- Adds `@reduxjs/toolkit`'s RTK Query surface (already part of the same package — no extra dependency beyond RTK itself, which was already required by the brief).
- Slightly more setup (endpoint definitions) than raw `fetch` for a 4-endpoint API; accepted given the correctness payoff above.

## Alternatives Considered

- **Plain RTK slices + `useEffect` + `setInterval` + manual "is this still the active job" guard on each response**: rejected — this is exactly the failure mode FR-014 warns about; correct but relies on every call site remembering to guard, easy to regress.
- **Zustand / MobX**: not chosen — user directed Redux Toolkit.
- **SWR/React Query instead of RTK Query**: would solve the same polling/staleness problem, but introduces a second state paradigm alongside Redux Toolkit for no benefit, when RTK Query already covers it natively.
