# Tasks: Async URL Status Checker

**Input**: Design documents from `specs/001-url-status-checker/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/openapi.yaml](contracts/openapi.yaml), [quickstart.md](quickstart.md)

**Tests**: Included. AGENTS.md requires matching test type to the change, and SC-003 (no stale poll data on job switch) is exactly the kind of requirement that regresses silently without a test — see [quickstart.md](quickstart.md) "Automated coverage".

**Organization**: Tasks are grouped by user story from [spec.md](spec.md), in priority order (P1 stories first: US1, US3, US5; then P2: US2, US4), so the P1 slice is a demoable, correct MVP before P2 stories are added. Setup ends with a deliberately runnable health-check milestone (T008/T009) so there's something to look at in a browser before any job logic exists.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps the task to a user story from spec.md (US1–US5)
- File paths follow the structure fixed in [plan.md](plan.md#project-structure)

---

## Phase 1: Setup

**Purpose**: Project scaffolding for both apps, matching [ADR-0001](../../docs/adr/0001-repo-layout-and-docker-topology.md) — ending with a minimal, runnable health check so the wiring is provably correct before any domain logic exists.

- [x] T001 Scaffold NestJS project at `backend/` (Nest CLI or manual), TypeScript strict mode — `nest new --strict --skip-git`; note the CLI's `--skip-git` also suppressed `.gitignore` generation, added manually (see T003 note)
- [x] T002 [P] Scaffold Vite + React + TypeScript project at `frontend/`, with the FSD folders from [ADR-0006](../../docs/adr/0006-frontend-architecture-fsd.md): `src/app`, `src/pages`, `src/widgets`, `src/features`, `src/entities`, `src/shared`
- [x] T003 [P] Add `backend/Dockerfile` and `frontend/Dockerfile` (multi-stage: Vite build → nginx) and root `docker-compose.yml` per [ADR-0001](../../docs/adr/0001-repo-layout-and-docker-topology.md) — backend:3000, frontend nginx:80 mapped to host 8080; also added `backend/.gitignore` (missing after `--skip-git`, would have staged `node_modules`)
- [x] T004 [P] Add `frontend/nginx.conf` proxying `/api/*` to the `backend` service on the compose network — verified path is preserved (no double-prefixing) since Nest's global prefix is also `api`
- [x] T005 [P] Configure ESLint + Prettier in `backend/` — already provided by the Nest CLI scaffold; verified `npm run lint` is clean
- [x] T006 [P] Configure ESLint + Prettier in `frontend/` — replaced the Vite template's default `oxlint` with ESLint (flat config) + Prettier, matching backend's `.prettierrc`; verified `npm run lint` is clean
- [x] T007 [P] Configure Vite dev server proxy (`server.proxy['/api']` → backend) in `frontend/vite.config.ts` per [ADR-0001](../../docs/adr/0001-repo-layout-and-docker-topology.md)
- [x] T008 [P] Implement `GET /api/health` returning `{ status: 'ok' }` via a minimal `AppController` (no dependency on `JobsModule`) in `backend/src/app.controller.ts` (depends: T001) — added `app.setGlobalPrefix('api')` in `main.ts`; updated the generated unit + e2e tests to match; all pass
- [x] T009 [P] Implement a minimal status page that `fetch`es `/api/health` on load and renders "Backend: ok" / "Backend: unreachable" — no Redux dependency yet, just proves the proxy/nginx wiring — in `frontend/src/App.tsx` (depends: T002, T007) — verified live via `npm run dev` + `curl localhost:5173/api/health` through the proxy (200, `{"status":"ok"}`). Addendum: styled with Tailwind CSS + daisyUI ([ADR-0007](../../docs/adr/0007-frontend-styling-tailwind-daisyui.md)), added after Phase 1 was first completed; verified the compiled `dist/*.css` actually contains the daisyUI classes used.

**Checkpoint**: `docker-compose up --build` (or the two `npm run dev`s) boots both apps and the frontend visibly confirms it can reach the backend via `/api/health` — see [quickstart.md](quickstart.md) "Step 0". This is the first "run it and see it" milestone, before any job logic exists.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, module skeletons, and store setup that every user story builds on. **No user story work starts before this phase is done.**

- [x] T010 [P] Define `Job`, `JobStatus` types in `backend/src/jobs/models/job.ts` per [data-model.md](data-model.md#job)
- [x] T011 [P] Define `UrlCheckResult`, `UrlCheckStatus` types in `backend/src/jobs/models/url-check-result.ts` per [data-model.md](data-model.md#urlcheckresult)
- [x] T012 Create `JobsModule` with empty `JobsController`/`JobsService`/`UrlCheckerService` in `backend/src/jobs/jobs.module.ts` per [ADR-0002](../../docs/adr/0002-backend-framework-nestjs.md) (depends: T010, T011) — also registered `JobsModule` in `AppModule` (otherwise it's never instantiated); `JobsController` kept truly empty, no constructor yet — that wiring lands in T020 when the first route needs it
- [x] T013 Implement the in-memory `Map<string, Job>` store as a field on `JobsService` (singleton provider) in `backend/src/jobs/jobs.service.ts` per [ADR-0003](../../docs/adr/0003-in-memory-job-storage.md) (depends: T012)
- [x] T014 [P] Define `Job`/`UrlCheckResult`/status-enum types matching [contracts/openapi.yaml](contracts/openapi.yaml) in `frontend/src/entities/job/model.ts`
- [x] T015 Set up the Redux store and an empty `jobsApi` (`createApi`, `reducerPath: 'jobsApi'`) in `frontend/src/app/store.ts` and `frontend/src/entities/job/api.ts` per [ADR-0005](../../docs/adr/0005-frontend-state-and-data-layer.md) — also wrapped `<App />` in `<Provider store={store}>` in `main.tsx`; verified live (screenshot + zero browser console errors) that the Provider didn't break the running app
- [x] T016 [P] Build `StatusBadge` and `Spinner` primitives in `frontend/src/shared/ui/` — deliberately generic (`tone` prop, no import of job-domain types), per ADR-0006's layering rule that `shared/` has zero domain knowledge

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Submit a list of URLs for checking (Priority: P1) 🎯 MVP

**Goal**: `POST /api/jobs` creates a job and starts background processing; the frontend form submits and makes the new job active.

**Independent Test**: Submit 2–3 URLs via the form (or `curl -X POST /api/jobs`); confirm a `jobId` comes back immediately and the job exists with status `pending`/`in_progress`.

### Tests

- [x] T017 [P] [US1] Unit test: `JobsService.createJob` assigns a unique `jobId`, sets status `pending`, and returns without waiting for URL checks, in `backend/src/jobs/jobs.service.spec.ts` — 3 tests (unique id, status pending at creation, non-blocking return via a deliberately-never-resolving mock)
- [x] T018 [P] [US1] Unit test: `UrlCheckerService` never runs more than 5 concurrent `HEAD` checks for one job (mocked `fetch`), in `backend/src/jobs/url-checker.service.spec.ts` — 4 tests (concurrency cap with 12 URLs, pending-until-first-dispatch timing, 2xx/4xx classification, network-error classification); `Math.random()` pinned to 0 in tests so the 0–10s artificial delay doesn't slow the suite

### Implementation

- [x] T019 [US1] Implement `CreateJobDto` (`urls: string[]`, non-empty entries) with `class-validator` in `backend/src/jobs/dto/create-job.dto.ts` — `strict: true` required a definite-assignment assertion (`urls!: string[]`) since DTOs are populated by Nest's pipeline, not a constructor. Post-review addendum: added a custom `@IsValidCheckableUrl` validator (`backend/src/jobs/dto/is-valid-checkable-url.validator.ts`, using `validator`'s `isURL` on the normalized form) so a malformed entry (e.g. `https://dfgdfg;`, no TLD) rejects the whole request with 400 at creation time instead of wasting a check slot only to fail as a DNS error later — bare domains still pass since normalization runs before the check. Extracted `normalizeUrl` out of `jobs.service.ts` into `backend/src/jobs/util/normalize-url.ts`, shared by both. 4 new unit tests in `create-job.dto.spec.ts`; verified live via curl (typo → 400, bare domain → 201, mixed valid+typo → 400).
- [x] T020 [US1] Implement `JobsController.createJob` (`POST /api/jobs`, `ValidationPipe`) in `backend/src/jobs/jobs.controller.ts` (depends: T019) — global `ValidationPipe` added in `main.ts`; verified live with curl that every invalid shape (missing/empty `urls`, non-string/empty entries) returns 400 and a valid one returns 201
- [x] T021 [US1] Implement `JobsService.createJob` — build the `Job` + `UrlCheckResult[]`, store it, fire-and-forget `UrlCheckerService.processJob` — in `backend/src/jobs/jobs.service.ts` (depends: T013) — added a `Logger` call (job created) for the phase checkpoint's "verify via backend logs"
- [x] T022 [US1] Implement `UrlCheckerService.processJob` — per-job `p-limit(5)`, `fetch` HEAD, 0–10s delay, success/error classification per [ADR-0004](../../docs/adr/0004-url-check-concurrency-and-cancellation.md) — in `backend/src/jobs/url-checker.service.ts` — found and fixed a real bug: `job.status` was flipping to `in_progress` synchronously before `createJob()` even returned (fire-and-forget async functions run synchronously up to their first `await`); moved the flip inside the `p-limit` callback, which `p-limit`'s source confirms always dispatches via a microtask. Also downgraded `p-limit` 7→3.1.0 (7 is ESM-only, broke Jest module loading). HEAD timeout pinned at 5000ms (not specified by ADR-0004, a judgment call). Added `Logger` calls per the checkpoint. Post-review addendum: wrapped the whole method body in try/catch so an unexpected failure (not a per-URL fetch error, which `checkUrl` already handles) sets `job.status = 'failed'` instead of leaving an unhandled rejection on a fire-and-forget call — `failed` was already reserved for exactly this in ADR-0004 but nothing set it before now.
- [x] T023 [US1] Implement `jobsApi.createJob` mutation in `frontend/src/entities/job/api.ts` (depends: T015)
- [x] T024 [US1] Implement the URL-list textarea form (`CreateJobForm`) in `frontend/src/features/create-job/` — client-side trims/filters blank lines before enabling submit
- [x] T025 [US1] Wire `CreateJobForm` into `frontend/src/pages/jobs/`, setting the returned `jobId` as the active job on submit — added `JobsPage`, made `App.tsx` render it; the Phase 1 health-check card is retired from the UI (its job was proving the wiring, which it did — `/api/health` itself and the Docker healthcheck are unaffected). `activeJobId` is local `useState` for now, formalized into a slice in T033 (Phase 5) as originally planned.

**Checkpoint**: Submitting a job works end-to-end and starts real background processing (verify via backend logs until US3 gives visibility).

---

## Phase 4: User Story 3 - Track progress and results of the active job (Priority: P1)

**Goal**: `GET /api/jobs/:id` exposes per-URL detail; the frontend polls and renders it.

**Independent Test**: With a job from US1 in flight, confirm `GET /api/jobs/:id` shows progress and per-URL status, and the UI updates without a manual reload.

### Tests

- [x] T026 [P] [US3] Unit test: `JobsService.getJob` returns per-URL detail and throws `NotFoundException` for an unknown id, in `backend/src/jobs/jobs.service.spec.ts`

### Implementation

- [x] T027 [US3] Implement `JobsController.getJob` (`GET /api/jobs/:id`, 404 on missing) in `backend/src/jobs/jobs.controller.ts` — `import type` needed for the `JobDetailResponse` return-type import (`isolatedModules` + `emitDecoratorMetadata` requirement on decorated methods)
- [x] T028 [US3] Implement `JobsService.getJob` in `backend/src/jobs/jobs.service.ts` (depends: T021) — throws Nest's built-in `NotFoundException`, no custom controller handling needed
- [x] T029 [US3] Implement `jobsApi.getJob` query (keyed by `jobId`) in `frontend/src/entities/job/api.ts` per [ADR-0005](../../docs/adr/0005-frontend-state-and-data-layer.md) (depends: T023) — note: `pollingInterval` is a hook-call option, not an endpoint-definition option; it's set where the query is used (T031), not here. Also fixed a real bug this task exposed: `baseUrl: '/api'` (relative) crashes `fetchBaseQuery` under Node's native `fetch`/`Request` (used by Vitest and technically also SSR-style contexts) since undici has no browser "page origin" to resolve a relative URL against — changed to `${window.location.origin}/api`, same resolved origin in the browser (no behavior change there), fixes Node-based test/tooling contexts.
- [x] T030 [US3] Implement `JobDetail` widget — "X of Y processed" progress + per-URL table (status/httpStatus/errorMessage) — in `frontend/src/widgets/job-detail/`
- [x] T031 [US3] Wire `JobDetail` into `frontend/src/pages/jobs/` via `useGetJobQuery(activeJobId, { skip: !activeJobId, pollingInterval })`, computing `pollingInterval` from the job's current status (non-zero while non-terminal, `0` once terminal) at the call site (depends: T025, T029) — the naive state+effect approach for computing `pollingInterval` from the query's own prior result violates `eslint-plugin-react-hooks`'s `set-state-in-effect` and `refs` rules (both state-in-effect and ref-in-render were rejected); used RTK Query's `useQueryState` instead — a pure cache selector safe to read during render, with zero extra fetches (empirically verified: exactly 1 `fetch` call, not 2). Parent renders `<JobDetail key={activeJobId} .../>` so a job switch fully remounts and resets naturally. Verified live end-to-end (real HEAD checks, real polling, screenshots) — progress went from 0/2 in_progress to 2/2 completed with correct classification, zero console errors.

**Checkpoint**: US1 + US3 together are a demoable, correct single-job submit-and-watch flow.

---

## Phase 5: User Story 5 - Switch active job without stale updates (Priority: P1)

**Goal**: Switching the active job never lets a late response for the old job reach the screen (FR-014, SC-003).

**Independent Test**: Create job A, then immediately create job B (which becomes active per US1); confirm the UI reflects only B and never flickers back to A's data.

### Tests

- [x] T032 [P] [US5] Integration test: switching the active job mid-poll never renders the previous job's data (mock two jobs, delay one response, assert final UI matches only the current active job — the automatable form of SC-003), in `frontend/src/widgets/job-detail/JobDetail.stale-switch.test.tsx` — colocated with the component instead of a top-level `frontend/test/` dir (Vitest has no `rootDir` restriction unlike the backend's Jest config, so colocating is consistent with the backend precedent and standard frontend practice); required installing Vitest + React Testing Library + jsdom from scratch (nothing existed before this task) — see `vite.config.ts`'s `test` block and `src/test/setup.ts`. Test genuinely holds job A's response open, switches to job B, then resolves A late — passes: A's data never appears.
- [x] T033 [US5] Formalize the active-job selection into an `activeJobId` slice (`setActiveJob` action) in `frontend/src/pages/jobs/model.ts` — page-level UI state, deliberately **not** in `entities/job/` per FSD layering (domain data vs. UI selection state) in [ADR-0006](../../docs/adr/0006-frontend-architecture-fsd.md). Added typed `useAppDispatch`/`useAppSelector` in `frontend/src/app/hooks.ts` alongside it.
- [x] T034 [US5] Ensure `CreateJobForm` (T025) dispatches `setActiveJob` on a new job, and confirm via T032 that the previous job's `useGetJobQuery` subscription is torn down when the active job changes (depends: T031, T033) — dispatch happens in `JobsPage`'s `onCreated` callback passed to `CreateJobForm`, keeping the feature component itself Redux-agnostic
- [x] T035 [US5] Manual verification: run [quickstart.md](quickstart.md) step 4 and confirm no stale-data flicker — done live in a real browser (not just the jsdom test): submitted a slow 3-URL job A, switched to a fast 1-URL job B mid-flight, polled the displayed job id for 8s while A kept resolving in the background — A's id never reappeared, zero console errors

**Checkpoint**: The P1 slice (US1, US3, US5) is complete — this is the brief's sharpest correctness requirement, verified before any P2 work starts.

---

## Phase 6: User Story 2 - Browse past and current jobs (Priority: P2)

**Goal**: `GET /api/jobs` lists jobs; the frontend shows the list and lets the user pick one as active.

**Independent Test**: Create two jobs, confirm both appear in the list with correct summary info, and clicking either makes it active.

### Tests

- [x] T036 [P] [US2] Unit test: `JobsService.listJobs` returns correct `urlCount`/`successCount`/`errorCount` per job, in `backend/src/jobs/jobs.service.spec.ts`

### Implementation

- [x] T037 [US2] Implement `JobsController.listJobs` (`GET /api/jobs`) in `backend/src/jobs/jobs.controller.ts`
- [x] T038 [US2] Implement `JobsService.listJobs` (map the store to `JobSummary[]`) in `backend/src/jobs/jobs.service.ts` (depends: T013) — extracted a shared `toSummary`/`getJobOrThrow` helper reused by `getJob` too, to avoid duplicating the derived-count logic
- [x] T039 [US2] Implement `jobsApi.listJobs` query in `frontend/src/entities/job/api.ts` (depends: T015) — added RTK Query tags (`Job`/`LIST`) so the list auto-refreshes when a job is created, rather than requiring a manual reload
- [x] T040 [US2] Implement `JobList` widget (id/date/status/stats, click-to-select) in `frontend/src/widgets/job-list/`
- [x] T041 [US2] Wire `JobList` into `frontend/src/pages/jobs/`; selecting an entry dispatches `setActiveJob` (depends: T033, T040) — verified live: creating jobs auto-populates the list (tag invalidation), clicking an older row correctly switches the active job

**Checkpoint**: Full job history browsing works alongside US1/US3/US5.

---

## Phase 7: User Story 4 - Cancel a running job (Priority: P2)

**Goal**: `DELETE /api/jobs/:id` stops not-yet-started URLs without touching in-flight ones.

**Independent Test**: Cancel a job with several `pending` URLs; confirm those become `cancelled` and no new `HEAD` requests are issued for them, while any `in_progress` URL still finishes.

### Tests

- [x] T042 [P] [US4] Unit test: cancelling marks unstarted URLs `cancelled`, leaves in-flight URLs to finish, and is a no-op on an already-terminal job, in `backend/src/jobs/jobs.service.spec.ts` and `backend/src/jobs/url-checker.service.spec.ts` — the `url-checker.service.spec.ts` test holds 5 (the concurrency cap) requests open, confirms the other 2 never dispatch, then releases the 5 and confirms they finish `success` while the 2 come back `cancelled` and the job stays `cancelled` (not overwritten to `completed`)

### Implementation

- [x] T043 [US4] Implement `JobsController.cancelJob` (`DELETE /api/jobs/:id`, `@HttpCode(204)` — Nest's `@Delete()` defaults to 200, but the contract promises 204 No Content — 404 on missing) in `backend/src/jobs/jobs.controller.ts` — verified live: 204 + empty body on both first-cancel and no-op-on-terminal, 404 on unknown id
- [x] T044 [US4] Implement `JobsService.cancelJob` (set `status: cancelled` + `cancelledAt`; no-op if already terminal) in `backend/src/jobs/jobs.service.ts` (depends: T028)
- [x] T045 [US4] Add the pre-dispatch cancellation check in `UrlCheckerService` per [ADR-0004](../../docs/adr/0004-url-check-concurrency-and-cancellation.md) in `backend/src/jobs/url-checker.service.ts` (depends: T022, T044) — this also reinstated the cancelled-aware terminal-status guard (`job.status !== 'cancelled'` before setting `completed`) that Phase 3 deliberately left out because nothing could set `cancelled` yet; TypeScript no longer flags it as dead code now that `cancelJob` is a real, separate code path it can't statically rule out. Verified live with a real 10-URL job cancelled immediately: the 5 in-flight URLs ran to completion, the 5 unstarted ones came back `cancelled`, job stayed `cancelled` throughout.
- [x] T046 [US4] Implement `jobsApi.cancelJob` mutation in `frontend/src/entities/job/api.ts` (depends: T015) — invalidates both the specific job's tag and the list tag, so cancelling reflects immediately in both `JobDetail` and `JobList` rather than waiting for the next poll
- [x] T047 [US4] Implement `CancelJobButton` feature, wired into `JobDetail` (depends: T030), in `frontend/src/features/cancel-job/` — `JobDetail` hides the button once the job reaches a terminal status

**Checkpoint**: All 5 user stories are independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T048 [P] Write root `README.md` run instructions (Docker + local dev), matching [quickstart.md](quickstart.md) — already done in an earlier ad-hoc pass (Setup/Run sections match quickstart.md exactly); this pass corrected a stale Test Coverage claim ("e2e hitting a real running instance") to accurately describe the in-process `supertest` approach T049 actually uses, and updated the frontend testing line (Vitest existed since Phase 5 but the README hadn't been updated to say so)
- [x] T049 [P] Add a backend e2e test (`backend/test/jobs.e2e-spec.ts`, Nest + `supertest`) covering create → poll → cancel via real HTTP calls against the app — 5 tests: full create-to-completion with a real per-URL success/error split, malformed-URL rejection (400, no job created), cancellation (concurrency-cap-aware: waits for exactly 5 in-flight before cancelling, confirms the other 2 stay unstarted), idempotent cancel-on-terminal, 404 on unknown id. Uses a local `http` test server (no external network dependency) with a `/hold` route tests can park responses on to deterministically control in-flight-vs-queued state, instead of timing guesses. Found and worked around a real gotcha: mocking `Math.random` *before* `Test.createTestingModule(...).compile()` silently breaks Nest's route registration (its own module-token generation uses `Math.random()` internally) — the mock must be applied after `app.init()`.
- [ ] T050 Run the full [quickstart.md](quickstart.md) manual walkthrough end-to-end; fix any discrepancies found
- [ ] T051 [P] Add a global exception filter in `backend/src/main.ts` and surface RTK Query `error`/`isLoading` states in the frontend widgets
- [ ] T052 Final `docker-compose up --build` smoke test from a clean checkout (verifies SC-005)
- [ ] T053 [P] Add `README.ru.md` — Russian translation of the finished root `README.md` (do this last, once T048's content is final, so it's translating the finished doc rather than something that'll drift), with a language-switch link at the top of both files
- [ ] T054 [P] Add EN/RU UI language support to the frontend, RU default, with a switcher — library choice is an architectural decision per AGENTS.md, needs a new ADR before implementation; extract existing UI strings into translation files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup — blocks all user stories.
- **User Stories (Phases 3–7)**: All depend on Foundational. Ordered P1 → P1 → P1 → P2 → P2 (US1, US3, US5, US2, US4) so the MVP (the P1 slice) is complete and correct before P2 work starts. US5 depends on US1 (job creation) and US3 (polling) existing; US2 and US4 are otherwise independent of each other and of US5.
- **Polish (Phase 8)**: Depends on all desired user stories being complete.

### Parallel Opportunities

- All `[P]`-marked Setup tasks (T002–T009) run in parallel, modulo T008 needing T001 done and T009 needing T002/T007 done.
- Foundational `[P]` tasks (T010, T011, T014, T016) run in parallel; T012/T013/T015 have internal ordering (module before store, store before service logic).
- Within each user story, test tasks marked `[P]` can run in parallel with each other (but should be written and seen failing before their paired implementation tasks).
- Once Foundational is done, US1/US3/US5 must land in order (each depends on the previous story's endpoints/wiring) — this feature does not have the "fully parallel stories" shape the template assumes, because US3 needs US1's create endpoint and US5 needs both. US2 and US4 can be built in parallel with each other after the P1 slice is done, by different people, since neither depends on the other.

---

## Implementation Strategy

### MVP First (P1 slice)

1. Phase 1: Setup — ends with a runnable health check (T008/T009), the first thing to actually look at.
2. Phase 2: Foundational
3. Phase 3: US1 (Submit)
4. Phase 4: US3 (Track progress)
5. Phase 5: US5 (Switch without stale updates)
6. **STOP and VALIDATE**: run [quickstart.md](quickstart.md) steps 1, 2, and 4 — this is the brief's core loop plus its sharpest correctness requirement.

### Incremental Delivery

1. Setup + Foundational → foundation ready, health check visible.
2. US1 → US3 → US5 → MVP demoable and correct (quickstart steps 1, 2, 4 pass).
3. US2 → job history browsing (quickstart step 3).
4. US4 → cancellation (quickstart step 5).
5. Polish → README, e2e coverage, final Docker smoke test.

---

## Notes

- `[P]` tasks touch different files and have no incomplete dependency.
- `[Story]` labels trace every task back to [spec.md](spec.md)'s user stories.
- Commit after each task or logical group, per [AGENTS.md](../../AGENTS.md) (atomic commits, one-line messages, no AI co-authorship trailer).
- Stop at each phase checkpoint and validate against the relevant [quickstart.md](quickstart.md) step before moving on.
