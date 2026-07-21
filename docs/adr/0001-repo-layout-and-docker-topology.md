# 0001. Repository layout & Docker Compose topology

**Status**: Accepted

**Related**: [spec.md](../../specs/001-url-status-checker/spec.md) (SC-005)

## Context

The brief requires a single public GitHub repo link, with TypeScript backend and frontend, and Docker/`docker-compose` as a "желательно" (nice-to-have but expected for a senior-level submission). We need to decide how the two apps live together and how they talk to each other in both local dev and Docker.

## Decision

- **Monorepo**, single git repo (this one), two top-level app folders:
  - `backend/` — NestJS API
  - `frontend/` — React app
- Root `docker-compose.yml` runs both services:
  - `backend` container: NestJS built to `dist/`, exposes the API port (e.g. `3000`).
  - `frontend` container: multi-stage Dockerfile — build with Vite, serve the static bundle with nginx; nginx `proxy_pass`es `/api/*` to the `backend` service on the compose network.
- In local (non-Docker) dev, the frontend dev server (Vite) proxies `/api` to the backend directly (`vite.config.ts` `server.proxy`), mirroring the nginx behavior so the frontend code never needs environment-specific base URLs.
- No shared `packages/` or npm workspace for now — `backend` and `frontend` have zero shared runtime code (no shared types package), so the extra tooling isn't justified yet (KISS, see [AGENTS.md](../../AGENTS.md)). If a shared-types need emerges, revisit.

## Consequences

- One `git clone` + `docker-compose up` gets a reviewer a working stack end-to-end — satisfies SC-005 and the "инструкция в README" delivery requirement.
- Same-origin `/api` path in both dev and Docker means no CORS configuration is needed anywhere.
- Two independent `package.json`s means duplicated tooling config (TS, lint) across folders; acceptable at this scale.

## Alternatives Considered

- **Two separate repos**: rejected — brief asks for one repo link, and it would prevent atomic cross-cutting commits.
- **npm/pnpm workspace monorepo**: rejected for now — no shared code to justify it; would add setup overhead for a 3-day task.
- **Backend serves the frontend build directly** (single container): rejected — conflates two different runtimes/lifecycles (static asset serving vs API) and makes independent scaling/rebuilds harder for no benefit here.
