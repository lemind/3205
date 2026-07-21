# Phase 1 Data Model: Async URL Status Checker

**Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md) (Key Entities) | **Contract**: [contracts/openapi.yaml](contracts/openapi.yaml)

## Job

Represents one submitted batch of URLs to check.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` (UUID) | Generated with `crypto.randomUUID()`, per [ADR-0003](../../docs/adr/0003-in-memory-job-storage.md) |
| `createdAt` | `string` (ISO 8601) | Set once, at creation |
| `status` | `JobStatus` | See state machine below |
| `results` | `UrlCheckResult[]` | One per URL submitted, order preserved from input |
| `cancelledAt` | `string` (ISO 8601) \| `null` | Set only if the job was cancelled |

**`JobStatus`** enum: `pending` | `in_progress` | `completed` | `cancelled` | `failed`

Derived (not stored, computed on read for `GET /api/jobs` and `GET /api/jobs/:id`):
- `urlCount` = `results.length`
- `successCount` = count of `results` with `status === 'success'`
- `errorCount` = count of `results` with `status === 'error'`

**Validation rules** (`POST /api/jobs` input, `CreateJobDto`):
- `urls` MUST be a non-empty array.
- Each entry MUST be a non-empty string (spec.md Assumptions: minimal validation — malformed URLs are allowed through and simply surface as `error` results from the failed `HEAD` check, not rejected at submission).

**State transitions**:

| From | To | Trigger |
|---|---|---|
| `pending` | `in_progress` | `UrlCheckerService` dispatches the first URL to the concurrency limiter |
| `in_progress` | `completed` | every `UrlCheckResult` reached a terminal status and the job was never cancelled |
| `pending` | `cancelled` | `DELETE /api/jobs/:id` before any URL started |
| `in_progress` | `cancelled` | `DELETE /api/jobs/:id` while URLs are still running |
| `completed` / `cancelled` / `failed` | *(none)* | terminal — a further `DELETE` is a no-op |

- `pending → in_progress`: as soon as `UrlCheckerService` dispatches the first URL to the concurrency limiter.
- `in_progress → completed`: once every `UrlCheckResult` in the job has reached a terminal per-URL status (`success`, `error`, or `cancelled`) and the job itself was never cancelled.
- `pending | in_progress → cancelled`: on `DELETE /api/jobs/:id` (FR-005). A job in `pending` (no URL started yet) or `in_progress` can be cancelled; a job already `completed`/`cancelled`/`failed` cancelling again is a no-op (see spec.md Edge Cases).
- `failed`: reserved for a whole-job-level failure (e.g. an unexpected exception in the worker itself), not for individual URL errors, which are expected and captured per-URL instead ([ADR-0004](../../docs/adr/0004-url-check-concurrency-and-cancellation.md)).

## UrlCheckResult

Represents the check of one URL within a job.

| Field | Type | Notes |
|---|---|---|
| `url` | `string` | As submitted, unmodified |
| `status` | `UrlCheckStatus` | See state machine below |
| `httpStatus` | `number` \| `null` | HTTP status code from the `HEAD` response, if one was received |
| `errorMessage` | `string` \| `null` | Set only on `status === 'error'` (network error, timeout, or 4xx/5xx response — classification rule below) |
| `startedAt` | `string` (ISO 8601) \| `null` | Set when the `HEAD` request is dispatched |
| `finishedAt` | `string` (ISO 8601) \| `null` | Set when the result (including the artificial delay) is recorded |
| `durationMs` | `number` \| `null` | `finishedAt - startedAt`, includes both the real request time and the 0–10s artificial delay ([ADR-0004](../../docs/adr/0004-url-check-concurrency-and-cancellation.md)) |

**`UrlCheckStatus`** enum: `pending` | `in_progress` | `success` | `error` | `cancelled`

**Validation rules**: none beyond the parent job's `urls` validation — a `UrlCheckResult` is created 1:1 from each submitted URL string at job-creation time, in `pending` status.

**State transitions**:

```text
pending ──(limiter slot acquired, HEAD dispatched)──▶ in_progress ──(HEAD settles + delay)──▶ success | error
   │
   └──(job cancelled before this URL was dispatched)──▶ cancelled
```

- `pending → in_progress`: when `UrlCheckerService`'s per-job `p-limit(5)` grants this URL a slot and the `HEAD` request is sent.
- `in_progress → success`: `HEAD` responded with a 2xx or 3xx status (classification rule: [ADR-0004](../../docs/adr/0004-url-check-concurrency-and-cancellation.md)).
- `in_progress → error`: `HEAD` failed (network error, timeout) or returned a 4xx/5xx status.
- `pending → cancelled`: job was cancelled before this URL acquired a limiter slot (FR-005) — an in-flight (`in_progress`) URL is **not** moved to `cancelled`; it's left to finish naturally into `success`/`error`.
