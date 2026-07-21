# Implementation Plan: Async URL Status Checker

**Branch**: `001-url-status-checker` | **Date**: 2026-07-21 | **Spec**: [spec.md](spec.md) | **Tasks**: [tasks.md](tasks.md)

**Input**: Feature specification from `specs/001-url-status-checker/spec.md`

## Summary

A REST API (NestJS) accepts a list of URLs, checks each with an HTTP `HEAD` request in the background (max 5 concurrent per job, 0–10s artificial delay per result), and exposes job/URL status for polling. A React SPA submits URL lists, lists past jobs, and polls the active job's detail until it reaches a terminal state — with a hard requirement that switching jobs never lets a stale poll response leak into the UI. All technology and architecture decisions are pre-recorded as ADRs (see [docs/adr/](../../docs/adr/README.md)); this plan wires them into a concrete build.

## Technical Context

**Language/Version**: Node.js 22 LTS + TypeScript 5.x, both backend and frontend (spec FR-016). (Node 20 LTS reached end-of-life in April 2026 — no longer a valid pin.)

**Primary Dependencies**:
- Backend: NestJS, `class-validator`/`class-transformer` (DTO validation), `p-limit` (per-job concurrency cap) — [ADR-0002](../../docs/adr/0002-backend-framework-nestjs.md), [ADR-0004](../../docs/adr/0004-url-check-concurrency-and-cancellation.md).
- Frontend: React, Redux Toolkit + RTK Query, Vite, Tailwind CSS + daisyUI — [ADR-0005](../../docs/adr/0005-frontend-state-and-data-layer.md), [ADR-0006](../../docs/adr/0006-frontend-architecture-fsd.md), [ADR-0007](../../docs/adr/0007-frontend-styling-tailwind-daisyui.md).

**Storage**: In-memory only (`Map` inside a Nest singleton provider) — no database — [ADR-0003](../../docs/adr/0003-in-memory-job-storage.md).

**Testing**: Backend — Jest (Nest's default) for `UrlCheckerService` (concurrency cap, cancellation, delay/status recording) and `JobsService`/controller unit + e2e tests (Nest's `supertest`-based e2e harness). Frontend — Vitest + React Testing Library for components/slices, with RTK Query's mock service worker (or `fetchBaseQuery` mocking) for the polling/stale-response guarantee (SC-003) specifically, since that's the requirement most likely to regress silently.

**Target Platform**: Linux containers (Docker Compose, see [ADR-0001](../../docs/adr/0001-repo-layout-and-docker-topology.md)) for delivery; any evergreen browser for the frontend.

**Project Type**: Web application — two projects, `backend/` (NestJS API) + `frontend/` (React SPA), per [ADR-0001](../../docs/adr/0001-repo-layout-and-docker-topology.md).

**Performance Goals**: None specified by the brief beyond the concurrency cap itself; this is a demo-scale tool, not a high-throughput service. The cap (FR-008) is treated as a correctness constraint, not a performance target.

**Constraints**:
- Max 5 concurrent `HEAD` requests per job (FR-008), independent per job (FR-009).
- 0–10s random artificial delay applied before each URL result is recorded (FR-007).
- Cancellation must not touch already-in-flight URLs, only unstarted ones (FR-005).
- Frontend polling must never apply a stale response to the active job's displayed state (FR-014, SC-003).

**Scale/Scope**: Single-user, no auth, demo/test-task scope. Small number of jobs and URLs per job expected (not load-tested).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled spec-kit template (`[PROJECT_NAME] Constitution` with bracketed placeholders) — no project constitution has been ratified for this repo. There are therefore no constitution-derived gates to check against. Falling back to [AGENTS.md](../../AGENTS.md)'s neutral engineering rules (KISS over DRY, no premature abstraction, thin controllers/business logic in services, validate at boundaries) as the operative constraints instead, which the design below (Project Structure, ADR-0002–0006) already follows. If a real constitution is ratified later, re-run this gate against it.

**Result**: No violations to record (no gates defined). Re-checked after Phase 1 design below — unchanged, still no constitution to gate against.

## Project Structure

### Documentation (this feature)

```text
specs/001-url-status-checker/
├── spec.md                    # Feature spec — user stories, FRs, success criteria
├── plan.md                    # This file
├── research.md                # Phase 0 — technology decisions (points to docs/adr/)
├── data-model.md               # Phase 1 — Job / URL Check Result entities, state machine
├── quickstart.md               # Phase 1 — how to run and manually verify the feature
├── contracts/
│   └── openapi.yaml            # Phase 1 — REST API contract for /api/jobs*
├── checklists/
│   └── requirements.md         # Spec quality checklist (already validated)
└── tasks.md                    # Phase 2 output — NOT created by this plan
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── main.ts
│   ├── app.controller.ts           # GET /api/health — no JobsModule dependency, first runnable milestone
│   └── jobs/
│       ├── jobs.module.ts
│       ├── jobs.controller.ts        # thin — parses request, calls JobsService, shapes response
│       ├── jobs.service.ts           # owns the in-memory Map<jobId, Job>, state transitions
│       ├── url-checker.service.ts    # HEAD checks, per-job p-limit(5), artificial delay, cancellation check
│       ├── dto/
│       │   └── create-job.dto.ts     # class-validator DTO for POST /api/jobs
│       └── models/
│           ├── job.ts                 # Job entity/type + status enum
│           └── url-check-result.ts    # URL result entity/type + status enum
└── test/
    ├── jobs.service.spec.ts
    ├── url-checker.service.spec.ts
    └── jobs.e2e-spec.ts

frontend/
└── src/
    ├── app/                     # store setup, providers
    ├── pages/
    │   └── jobs/
    │       └── model.ts          # activeJobId (page-level UI state — NOT in entities/, see ADR-0006)
    ├── widgets/
    │   ├── job-list/
    │   └── job-detail/
    ├── features/
    │   ├── create-job/          # textarea form + submit
    │   └── cancel-job/          # cancel button
    ├── entities/
    │   └── job/
    │       ├── model.ts          # Job / UrlCheckResult types, status enums
    │       └── api.ts            # jobsApi (RTK Query): listJobs, getJob (polling), createJob, cancelJob
    └── shared/
        ├── ui/                   # generic components (status badge, spinner, etc.)
        └── lib/
```

**Structure Decision**: Web application split (backend/frontend), per [ADR-0001](../../docs/adr/0001-repo-layout-and-docker-topology.md). Backend follows Nest's controller/service/DTO convention per [ADR-0002](../../docs/adr/0002-backend-framework-nestjs.md), with concurrency/cancellation isolated in `UrlCheckerService` per [ADR-0004](../../docs/adr/0004-url-check-concurrency-and-cancellation.md). Frontend follows Feature-Sliced Design per [ADR-0006](../../docs/adr/0006-frontend-architecture-fsd.md), with all data-fetching/polling centralized in `entities/job/api.ts` per [ADR-0005](../../docs/adr/0005-frontend-state-and-data-layer.md).

## Complexity Tracking

*No constitution gates are defined (see Constitution Check above), so there are no violations to justify here.*
