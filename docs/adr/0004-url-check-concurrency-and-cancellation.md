# 0004. URL-check concurrency control & job cancellation

**Status**: Accepted

**Related**: [spec.md](../../specs/001-url-status-checker/spec.md) (FR-006–FR-009, FR-005, SC-001, SC-002, SC-004), [0002](0002-backend-framework-nestjs.md), [0003](0003-in-memory-job-storage.md)

## Context

Per job: each URL gets an HTTP `HEAD` request, a random 0–10s delay before the result is recorded, at most 5 concurrent `HEAD` requests, and multiple jobs run concurrently. Cancellation must stop not-yet-started URLs but let in-flight ones finish. This is the most behaviorally subtle part of the backend and needs an explicit concurrency model.

## Decision

- **HTTP client**: Node's built-in global `fetch` (Node 18+ / undici) with `method: 'HEAD'` and an explicit timeout via `AbortController`. No extra HTTP library — platform capability already covers it (see [AGENTS.md](../../AGENTS.md), "prefer existing platform capabilities before adding libraries").
- **Per-job concurrency limit**: `p-limit(5)` (or an equivalent minimal semaphore) instantiated once per job in `UrlCheckerService`. Each job gets its **own** limiter instance — jobs never share or contend for each other's concurrency budget (FR-009, SC-002).
- **Processing model**: `JobsService.createJob` kicks off `UrlCheckerService.processJob(job)` **without awaiting it** (fire-and-forget from the controller's perspective) so `POST /api/jobs` returns immediately (FR-002). `processJob` schedules all URLs through the job's limiter; the limiter enforces the cap of 5 in flight (SC-001, SC-002).
- **Per-URL flow**: mark `in_progress` + `startedAt` → `fetch` HEAD → on settle, apply the random 0–10s delay (`setTimeout` via `await sleep(random(0,10000))`) → record `success`/`error` + `httpStatus`/`errorMessage` + `finishedAt`/`durationMs`.
- **Success/error classification**: a `HEAD` response with status 2xx or 3xx records `success` (with `httpStatus` set, `errorMessage` null); a response with 4xx/5xx, a network error, or a timeout records `error` (network error/timeout leave `httpStatus` null and set `errorMessage`; a 4xx/5xx sets both `httpStatus` and `errorMessage`). The brief doesn't define this boundary explicitly — 2xx/3xx-is-reachable is the standard convention for HEAD-based reachability checks (matches how uptime/health-check tools classify results), and it's what "успешно / с ошибкой" in the brief's job-stats requirement (FR-003) needs to mean something concrete.
- **Cancellation**: `JobsService.cancelJob(id)` sets `job.status = 'cancelled'` and a `job.cancelledAt` marker. Before each URL enters processing (i.e., right before it's dispatched to the limiter / right as its limiter slot is acquired), `UrlCheckerService` checks `job.status === 'cancelled'`; if so, it marks that URL `cancelled` and skips the `HEAD` request instead of dispatching it. URLs that already acquired a limiter slot and started their `HEAD` request are **not** aborted — they run to completion (matches the brief: only *not-started* URLs stop).
- **Job terminal status**: once all URLs reach a terminal per-URL status, the job becomes `completed` (or stays `cancelled` if it was cancelled, or `failed` — reserved for a whole-job-level failure, not individual URL errors, which are expected and non-fatal).

## Consequences

- The cancellation check is a simple status read before dispatch, not an `AbortController` cascade — matches the brief's "don't abort in-flight" semantics exactly and avoids the complexity of aborting requests mid-flight.
- Because each job owns its own limiter, one job can't starve another's concurrency budget — satisfies "допускается одновременная обработка нескольких заданий" without a global lock.
- The random delay is applied *after* the real HEAD response is known but *before* it's recorded — so `durationMs` in the API reflects the real request time plus the artificial delay, as the brief implies ("перед сохранением результата — искусственная задержка").

## Alternatives Considered

- **Global concurrency limiter (shared across all jobs)**: rejected — brief specifies the 5-cap per job, not system-wide; would let concurrent jobs throttle each other, contradicting "допускается одновременная обработка".
- **`AbortController` per URL, cancel in-flight requests on job cancellation**: rejected — brief only requires stopping *unstarted* URLs; aborting in-flight ones is out of scope and adds complexity (partial-response handling, abort-vs-timeout error disambiguation) with no requirement driving it.
- **A queue/worker library (e.g. BullMQ)**: rejected — implies Redis or another backing store, contradicting [ADR-0003](0003-in-memory-job-storage.md) and the brief's "no DB needed."
