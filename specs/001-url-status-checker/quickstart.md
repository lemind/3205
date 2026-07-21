# Quickstart: Async URL Status Checker

**Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

This describes the target dev/run workflow and a manual walkthrough that exercises the primary user stories end-to-end. It's written ahead of implementation (Phase 1 of the plan) so `tasks.md` and the eventual `README.md` have a concrete target to build against — commands below match the structure decided in [plan.md](plan.md) and [ADR-0001](../../docs/adr/0001-repo-layout-and-docker-topology.md).

## Run everything (Docker)

```bash
docker-compose up --build
```

- Frontend: http://localhost:8080 (nginx, port 80 inside the container) — **not** `:5173`, that's only the Vite dev server port used in local dev below.
- Backend API: reachable through the frontend at `/api` (nginx-proxied per ADR-0001), and also directly at http://localhost:3000/api for debugging.

## Run for local development (no Docker)

```bash
# backend
cd backend && npm install && npm run start:dev

# frontend (separate terminal)
cd frontend && npm install && npm run dev
```

- Frontend: http://localhost:5173 (Vite's default dev port).
- Vite's dev server proxies `/api` to the backend per ADR-0001, so the frontend code is identical in both modes.

## Step 0: sanity check (after Setup, before any job logic exists)

Once Setup is scaffolded (backend `GET /api/health` + a frontend page that calls it — see [tasks.md](tasks.md) Phase 1), this is the first thing worth actually running:

```bash
curl http://localhost:3000/api/health   # expect { "status": "ok" }
```

...and opening the frontend in a browser should show a "Backend: ok" indicator. This proves the Nest app boots, the Vite/nginx `/api` proxy is wired correctly, and both containers start under Docker Compose — all before any job/URL logic exists to test.

## Manual walkthrough (maps to spec.md acceptance scenarios)

1. **Submit a job** (User Story 1). Open the app, paste 6+ URLs into the textarea (mix of valid ones like `https://example.com` and at least one that will fail, e.g. `https://this-domain-does-not-exist.invalid`), click "Запустить проверку".
   - Expect: a job appears immediately as the active job, status `pending`/`in_progress`. `POST /api/jobs` (see [contracts/openapi.yaml](contracts/openapi.yaml)) should respond in well under a second — it must not block on the URL checks (FR-002).

2. **Watch progress** (User Story 3). With 6 URLs submitted (more than the concurrency cap of 5):
   - Expect: progress reads "X из Y обработано" and increments over time; at most 5 rows show `in_progress` simultaneously (FR-008) — check the Network tab or backend logs to confirm no more than 5 outstanding `HEAD` requests for this job at once.
   - Expect: each row eventually shows `success` (2xx/3xx) or `error` (4xx/5xx/network failure) with an HTTP code and/or error message.

3. **Browse jobs** (User Story 2). Submit a second job with different URLs.
   - Expect: `GET /api/jobs` list shows both jobs with correct `id`/`createdAt`/`status`/counts; clicking the first job re-selects it as active and its detail view loads its own results (not the second job's).

4. **Switch without stale updates** (User Story 5 — the sharpest correctness requirement). While job A (from step 1) is still `in_progress`, immediately switch the active job to job B (from step 3).
   - Expect: the detail view starts showing job B's data right away. Any poll response for job A that was already in flight at the moment of switching must not alter what's displayed — watch for a flicker back to job A's data as a failure signal. This is what [ADR-0005](../../docs/adr/0005-frontend-state-and-data-layer.md)'s RTK Query per-arg cache is specifically meant to prevent.

5. **Cancel a job** (User Story 4). Submit a job with 10+ URLs, immediately click "Отменить задание" before it finishes.
   - Expect: `DELETE /api/jobs/:id` returns success, the job's status becomes `cancelled`, and URLs that hadn't started yet show `cancelled` — but any URL that was already `in_progress` at the moment of cancellation still finishes into `success`/`error` (FR-005, per [ADR-0004](../../docs/adr/0004-url-check-concurrency-and-cancellation.md)).

## Automated coverage

The above scenarios should eventually be backed by:
- Backend: `UrlCheckerService` unit tests asserting the concurrency cap and cancellation semantics directly (no real network calls — mock `fetch`).
- Frontend: an integration test around `entities/job/api.ts` / the job-detail widget asserting that switching `activeJobId` mid-poll never renders data from the previous job (this is the automatable form of SC-003).

See [tasks.md](tasks.md) for the concrete task breakdown (T049 is the backend e2e test, T032 is the frontend stale-switch test).
