# 3205

Async URL status checker — submit a list of URLs, the backend checks each with an HTTP `HEAD` request in the background (bounded concurrency, artificial delay), and the frontend tracks progress and results per URL. See [spec.md](specs/001-url-status-checker/spec.md) for the full functional spec.

## Tech Stack

**Backend** — NestJS 11, TypeScript (`strict: true`), `class-validator`/`class-transformer` for DTO validation, `p-limit` for per-job concurrency capping, Node's built-in `fetch` for the HTTP `HEAD` checks. In-memory storage only, no database ([ADR-0003](docs/adr/0003-in-memory-job-storage.md)).

**Frontend** — React 19 + TypeScript, Redux Toolkit + RTK Query, Vite, Tailwind CSS + daisyUI. Feature-Sliced Design layout ([ADR-0006](docs/adr/0006-frontend-architecture-fsd.md)).

Full rationale for every major choice is in [docs/adr/](docs/adr/README.md).

## Test Coverage

- **Backend**: Jest — unit tests for `JobsService`/`UrlCheckerService`/DTO validation (concurrency cap, status transitions, success/error classification) plus an e2e suite (`backend/test/jobs.e2e-spec.ts`) that boots the real Nest app in-process and drives it over real HTTP via `supertest`, covering create → poll → cancel against a local test HTTP server (no external network dependency). Run with `npm test` / `npm run test:e2e` in `backend/`.
- **Frontend**: Vitest + React Testing Library — an integration test asserting switching the active job mid-poll never renders stale data (SC-003).
- **CI**: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs lint + build + test for both apps on every push and PR into `main`.

Coverage numbers (`npm run test:cov` in either app), from the unit suites only:

| | Statements | Branch | Functions | Lines |
|---|---|---|---|---|
| Backend | 77.1% | 72.1% | 82.1% | 78.2% |
| Frontend | 55.3% | 38.6% | 52.9% | 58.1% |

Not 100% by design, not oversight — per [AGENTS.md](AGENTS.md)'s testing philosophy (meaningful confidence over exhaustive QA):
- Backend's `jobs.controller.ts`/`app.module.ts`/`jobs.module.ts`/`main.ts` show 0% here because Jest's unit config (`backend/package.json`) and its e2e config (`backend/test/jest-e2e.json`) run and report separately — the controller's actual routes are exercised by the e2e suite, not double-counted here.
- Frontend intentionally has one targeted integration test (the stale-switch regression for SC-003, the spec's sharpest correctness requirement) rather than unit tests for every component — most of the untested code is presentational JSX with no branching logic worth a dedicated test.

## Conventions / Practices

- **Spec-driven**: every feature has a spec, plan, and task breakdown under `specs/` (via [spec-kit](.specify/)) before code is written.
- **Decisions recorded, not just made**: architecturally significant choices are ADRs in `docs/adr/`, not tribal knowledge.
- **Reproducible installs**: `package-lock.json` is committed and CI/Docker use `npm ci`, so installs are byte-identical everywhere — see the versions note below.
- **Lint + format enforced**: ESLint + Prettier on both sides, run in CI.
- **TypeScript strict mode** on the backend; DTOs validated at the API boundary, never trusted un-validated.
- See [AGENTS.md](AGENTS.md) for the full set of engineering conventions this repo follows.

## Versions

`package.json` uses semver ranges, but `package-lock.json` pins exact versions, and both Dockerfiles and CI install via `npm ci` — so every environment (local, CI, Docker) resolves to the identical dependency tree. Docker base images (`node:22-alpine`, `nginx:1.27-alpine`) are pinned to major.minor, not exact patch, so rebuilds still pick up OS-level security patches.

## Setup

Prerequisites: Node.js 22 LTS + npm (for local dev), or Docker + Docker Compose.

```bash
git clone git@github.com:lemind/3205.git
cd 3205
cd backend && npm install
cd ../frontend && npm install
```

(Docker path doesn't need this — `docker compose up --build` installs deps inside the containers.)

## Run

### Local dev (no Docker)

```bash
# backend (after Setup)
cd backend && npm run start:dev   # http://localhost:3000/api/health

# frontend (separate terminal, after Setup)
cd frontend && npm run dev        # http://localhost:5173
```

### Docker

```bash
docker compose up --build
# frontend: http://localhost:8080
# backend:  http://localhost:3000/api/health
```

See [quickstart.md](specs/001-url-status-checker/quickstart.md) for a full manual walkthrough.

## Docs

- [specs/001-url-status-checker/spec.md](specs/001-url-status-checker/spec.md) — feature spec (user stories, requirements)
- [specs/001-url-status-checker/plan.md](specs/001-url-status-checker/plan.md) — implementation plan
- [specs/001-url-status-checker/tasks.md](specs/001-url-status-checker/tasks.md) — task breakdown
- [docs/adr/](docs/adr/README.md) — architecture decision records
- [AGENTS.md](AGENTS.md) — engineering conventions
