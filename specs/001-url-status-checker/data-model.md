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
- `cancelledCount` = count of `results` with `status === 'cancelled'` — without this, a consumer can't distinguish "still in flight" from "cancelled" using the other three counts alone (both can leave `successCount + errorCount < urlCount`); `JobList`'s poll-until-settled logic depends on it.

**Validation rules** (`POST /api/jobs` input, `CreateJobDto`):
- `urls` MUST be a non-empty array.
- Each entry MUST be a non-empty string, AND a well-formed URL after normalization (see `url` field note below) — malformed entries (bad TLD/host, e.g. `https://dfgdfg;`) reject the *whole* request with 400 at submission, rather than being accepted and surfacing as an `error` result later (spec.md Assumptions).

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
| `url` | `string` | As submitted, except a `https://` scheme is prepended if the entry had none (e.g. `google.com` → `https://google.com`) — `fetch()` requires an absolute URL and can't check a bare domain |
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
