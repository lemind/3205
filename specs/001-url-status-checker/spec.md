# Feature Specification: Async URL Status Checker

**Feature Branch**: `001-url-status-checker`

**Created**: 2026-07-21

**Status**: Draft

**Source**: [Фулстек 3205 ТЗ.md](../../Фулстек%203205%20ТЗ.md) (test task brief, not tracked in git — see `.gitignore`)

**Related ADRs**: [docs/adr/](../../docs/adr/README.md) — see especially
[0001](../../docs/adr/0001-repo-layout-and-docker-topology.md),
[0002](../../docs/adr/0002-backend-framework-nestjs.md),
[0003](../../docs/adr/0003-in-memory-job-storage.md),
[0004](../../docs/adr/0004-url-check-concurrency-and-cancellation.md),
[0005](../../docs/adr/0005-frontend-state-and-data-layer.md),
[0006](../../docs/adr/0006-frontend-architecture-fsd.md)

## User Scenarios & Testing

### User Story 1 - Submit a list of URLs for checking (Priority: P1)

As a user, I paste a list of URLs (one per line) into a form and start a check, so I can find out which of them are reachable without checking each one by hand.

**Why this priority**: This is the entry point of the whole feature — nothing else is reachable without it.

**Independent Test**: Submit a textarea with 2–3 URLs, confirm a `jobId` is returned and the job appears in the job list with status `pending`/`in_progress`.

**Acceptance Scenarios**:

1. **Given** the job form is empty, **When** the user enters one or more URLs (one per line) and clicks "Запустить проверку", **Then** a `POST /api/jobs` request is sent with `{ urls: [...] }`, a new job is created with a unique `jobId` and status `pending`, and that job becomes the active job in the UI.
2. **Given** a job was just created, **When** the backend starts processing, **Then** processing happens asynchronously in the background — the `POST /api/jobs` response returns immediately with `{ jobId }` and does not wait for URL checks to finish.

---

### User Story 2 - Browse past and current jobs (Priority: P2)

As a user, I see a list of jobs I've run, with enough summary info to pick one to inspect.

**Why this priority**: Without this, users can only ever see the job they just created — no continuity across a session.

**Independent Test**: Create two jobs, call `GET /api/jobs`, confirm both appear with `id`, `createdAt`, `status`, URL count, and success/error stats; selecting one makes it the active job.

**Acceptance Scenarios**:

1. **Given** at least one job exists, **When** the user views the job list, **Then** each entry shows `id`, `createdAt`, `status` (`pending`, `in_progress`, `completed`, `cancelled`, `failed`), URL count, and a success/error breakdown.
2. **Given** the job list is visible, **When** the user clicks a job, **Then** that job becomes the active job and its detail view loads.

---

### User Story 3 - Track progress and results of the active job (Priority: P1)

As a user, I watch the active job's progress and see, per URL, whether it succeeded, failed, or is still pending.

**Why this priority**: This is the actual payoff of the feature — the reason the job was created in the first place.

**Independent Test**: With an in-progress job active, confirm the UI shows "X of Y processed" and a per-URL table that updates as results arrive, without a manual page reload.

**Acceptance Scenarios**:

1. **Given** an active job, **When** its detail view is open, **Then** the UI shows overall status and progress ("X из Y обработано").
2. **Given** an active job with URLs in different states, **When** the detail view renders, **Then** each URL row shows its status (`pending`, `in_progress`, `success`, `error`, `cancelled`), HTTP status code (if any), and error message (if any).
3. **Given** an active job is not yet in a terminal state, **When** time passes, **Then** the frontend polls `GET /api/jobs/:id` periodically and the view updates until the job reaches a terminal status (`completed`, `cancelled`, `failed`).

---

### User Story 4 - Cancel a running job (Priority: P2)

As a user, I stop a job I no longer want to wait on, so URLs that haven't started yet aren't checked.

**Why this priority**: Valuable but not required for the MVP checking flow to demonstrate value; still explicitly required by the brief.

**Independent Test**: Cancel a job with several `pending` URLs; confirm those URLs end up `cancelled` and no new HEAD requests are issued for them; already-in-flight URLs still complete.

**Acceptance Scenarios**:

1. **Given** an active, non-terminal job, **When** the user clicks "Отменить задание", **Then** `DELETE /api/jobs/:id` is called, the job is marked `cancelled`, and URLs that had not yet started are marked `cancelled` and are not checked.
2. **Given** a job has URLs already `in_progress` at cancellation time, **When** cancellation is processed, **Then** those in-flight checks are allowed to finish (per spec: only *not-started* URLs are stopped).

---

### User Story 5 - Switch active job without stale updates (Priority: P1)

As a user, when I switch to a different job or start a new one, I don't want to see status updates from the job I just left.

**Why this priority**: Explicitly called out in the brief as a correctness requirement; a common source of real bugs (race conditions between overlapping poll requests).

**Independent Test**: Start job A, switch to job B before A reaches a terminal state, confirm polling for A stops and any in-flight response for A that arrives late does not change the UI (which must reflect only B).

**Acceptance Scenarios**:

1. **Given** job A is being polled, **When** the user selects job B as active (or creates a new job), **Then** polling for job A stops.
2. **Given** a poll request for job A was in flight when the user switched to job B, **When** that response for A arrives, **Then** it MUST NOT alter the displayed state (which reflects job B).

### Edge Cases

- Empty or whitespace-only textarea submitted → no job created, user sees a validation message (no such job form validation endpoint exists — client-side only).
- Duplicate URLs in the same submission → each is checked independently as its own entry (brief doesn't call for de-duplication).
- A URL that is unreachable/times out → recorded as `error` with an error message, not left `pending` forever.
- Cancelling a job that has already reached a terminal state → no-op or explicit error (see FR-011).
- More than 5 URLs in a job → only 5 checked concurrently at a time (see FR-008); the rest wait their turn.
- Two jobs running at once → each job's concurrency is capped independently at 5; jobs don't share or contend for that limit (see FR-009).
- Backend process restarts mid-job → all job/result data is lost (in-memory only, see [ADR-0003](../../docs/adr/0003-in-memory-job-storage.md)); out of scope to recover.

## Requirements

### Functional Requirements

- **FR-001**: System MUST accept `POST /api/jobs` with body `{ "urls": ["https://...", ...] }` and create a job with a unique `jobId` and initial status `pending`.
- **FR-002**: System MUST begin processing a job's URLs asynchronously in the background and return `{ "jobId": "..." }` immediately, without waiting for any URL check to complete.
- **FR-003**: System MUST expose `GET /api/jobs` returning, per job: `id`, `createdAt`, `status` (`pending` | `in_progress` | `completed` | `cancelled` | `failed`), URL count, and success/error counts.
- **FR-004**: System MUST expose `GET /api/jobs/:id` returning, per URL in the job: `url`, `status` (`pending` | `in_progress` | `success` | `error` | `cancelled`), HTTP status code (if available), error message (if any), start/end timestamps, and duration.
- **FR-005**: System MUST expose `DELETE /api/jobs/:id` that marks the job `cancelled` and prevents not-yet-started URLs in that job from being checked.
- **FR-006**: System MUST check each URL with an HTTP `HEAD` request.
- **FR-007**: System MUST apply an artificial random delay of 0–10 seconds before recording each URL's result.
- **FR-008**: System MUST NOT run more than 5 concurrent `HEAD` requests within a single job.
- **FR-009**: System MUST support multiple jobs being processed concurrently.
- **FR-010**: Frontend MUST accept a newline-separated list of URLs via a textarea and submit them via FR-001 on "Запустить проверку".
- **FR-011**: Frontend MUST display the job list (FR-003) and let the user select any job as the active job.
- **FR-012**: Frontend MUST display the active job's overall progress ("X из Y обработано") and per-URL detail (FR-004).
- **FR-013**: Frontend MUST poll `GET /api/jobs/:id` for the active job at a fixed interval while its status is non-terminal, and stop polling once a terminal status is reached.
- **FR-014**: Frontend MUST stop polling the previous active job immediately when the active job changes (new job created or different job selected), and MUST discard/ignore any late-arriving response for a job that is no longer active.
- **FR-015**: Frontend MUST provide a "Отменить задание" action on the active job that calls FR-005.
- **FR-016**: Both frontend and backend MUST be written in TypeScript.

### Key Entities

- **Job**: A single URL-check run. Attributes: `id` (unique), `createdAt`, `status` (`pending` | `in_progress` | `completed` | `cancelled` | `failed`), the list of URL results it owns, derived stats (total / success / error counts).
- **URL Check Result**: One URL within a job. Attributes: `url`, `status` (`pending` | `in_progress` | `success` | `error` | `cancelled`), `httpStatus` (nullable), `errorMessage` (nullable), `startedAt`, `finishedAt`, `durationMs`.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A job with N URLs (N ≤ 5) completes in roughly the time of the single slowest URL check (0–10s delay + request time) plus network latency — i.e., checks genuinely run in parallel, not sequentially.
- **SC-002**: A job with N URLs (N > 5) never has more than 5 `HEAD` requests in flight for that job at any instant.
- **SC-003**: Switching the active job while a previous job is still polling never causes the UI to display data belonging to the previous job (zero stale-state renders, verified by manual and/or automated test).
- **SC-004**: Cancelling a job with unstarted URLs results in zero new `HEAD` requests being issued for those URLs after the cancellation is processed.
- **SC-005**: The full stack (`backend` + `frontend`) starts from a clean checkout with `docker-compose up` and is usable end-to-end, per [ADR-0001](../../docs/adr/0001-repo-layout-and-docker-topology.md).

## Assumptions

- No authentication/authorization — this is a single-user local/demo tool per the brief (no mention of users/accounts).
- No persistence requirement beyond process lifetime — in-memory storage is explicitly sufficient per the brief (see [ADR-0003](../../docs/adr/0003-in-memory-job-storage.md)).
- "Not started" URLs for cancellation purposes (FR-005) means URLs whose `HEAD` request has not yet been dispatched; URLs already mid-request are allowed to finish (see [ADR-0004](../../docs/adr/0004-url-check-concurrency-and-cancellation.md)).
- Poll interval is an implementation detail left to the frontend (not specified in the brief); a short fixed interval (e.g. 1–2s) is assumed sufficient to satisfy SC-003 without excessive request volume.
- URL validation on submission is minimal (non-empty lines); malformed URLs are allowed through and simply surface as `error` results from the `HEAD` check.
