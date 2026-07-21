# Phase 0 Research: Async URL Status Checker

**Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

## Approach

Normally this phase would dispatch a research task per `NEEDS CLARIFICATION` marker in the Technical Context. There are none here: every technology and architecture decision was made and recorded as an ADR *before* this plan was written (see [AGENTS.md](../../AGENTS.md#documentation--adrs) — decisions get an ADR first, specs/plans reference them rather than re-deriving them). This file is therefore an index into that decision record, not a duplicate of it, per the no-siloed-docs / no-duplication rule in AGENTS.md.

## Decisions

| Technical Context item | Decision | Rationale (full detail in ADR) | Alternatives considered |
|---|---|---|---|
| Repo/deploy topology | Monorepo, `backend/` + `frontend/`, Docker Compose with nginx-proxied frontend | Single-repo delivery requirement, same-origin `/api` avoids CORS | Two repos; npm workspace; backend serving frontend build — see [ADR-0001](../../docs/adr/0001-repo-layout-and-docker-topology.md) |
| Backend framework | NestJS, decorator-based (`@Controller`/`@Injectable`/`@Module`) | Structural controller/service separation for a domain with real internal shape (job store + background worker) | Express — see [ADR-0002](../../docs/adr/0002-backend-framework-nestjs.md) |
| Job/result storage | In-memory `Map` in a singleton service | Brief states no DB needed; avoids unjustified persistence complexity | SQLite/lowdb; repository abstraction over a single impl — see [ADR-0003](../../docs/adr/0003-in-memory-job-storage.md) |
| Concurrency control | Per-job `p-limit(5)`, cancellation via pre-dispatch status check (no abort of in-flight requests) | Brief's exact cap/cancellation semantics; jobs must not share a concurrency budget | Global limiter; `AbortController` cascade on cancel; queue library (BullMQ) — see [ADR-0004](../../docs/adr/0004-url-check-concurrency-and-cancellation.md) |
| HTTP client for HEAD checks | Node's built-in global `fetch` (undici) | Platform capability already sufficient, no extra dependency | axios/got — implicitly rejected in ADR-0004 on the "prefer existing platform capabilities" rule from AGENTS.md |
| Frontend state/data layer | Redux Toolkit + RTK Query | Per-arg cache structurally solves the "no stale poll response on job switch" requirement (FR-014/SC-003) | Manual `fetch`+`setInterval`+guard; SWR/React Query alongside Redux — see [ADR-0005](../../docs/adr/0005-frontend-state-and-data-layer.md) |
| Frontend architecture | Feature-Sliced Design (`app/pages/widgets/features/entities/shared`) | Matches brief's explicit components/API-layer/state split; enforces one-directional imports | Flat `components/`+`api/`+`store/`; Atomic Design — see [ADR-0006](../../docs/adr/0006-frontend-architecture-fsd.md) |
| Backend test framework | Jest (Nest's default, zero extra setup) | Ships with Nest's CLI scaffolding, `supertest` integration for e2e | Vitest for backend — rejected only for consistency with Nest's own tooling, not a strong preference |
| Frontend test framework | Vitest + React Testing Library | Vite-native, fast, standard RTL patterns for hook/component testing | Jest for frontend — works too, but Vitest avoids a second bundler config since the app already runs on Vite |

## Output

No unresolved `NEEDS CLARIFICATION` items remain in [plan.md](plan.md)'s Technical Context. Proceeding to Phase 1.
