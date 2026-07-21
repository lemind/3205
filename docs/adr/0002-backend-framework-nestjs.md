# 0002. Backend framework: NestJS

**Status**: Accepted

**Related**: [spec.md](../../specs/001-url-status-checker/spec.md) (FR-001–FR-009), [0004](0004-url-check-concurrency-and-cancellation.md)

## Context

The brief allows NestJS or Express. The API surface is small (4 routes), but the domain has real internal structure: a job store, a per-job concurrency-limited worker, and a controller layer — exactly the kind of thing [AGENTS.md](../../AGENTS.md)'s "API routes thin, business logic in `services/`" rule is aimed at.

## Decision

Use **NestJS**, with its standard decorator-based style — `@Controller()` / `@Get()` / `@Post()` / `@Delete()` for routes, `@Injectable()` services registered through `@Module()`, DI via constructor injection. No functional/manual-wiring style, no bypassing Nest's module system.

Module shape:
- `JobsModule`
  - `JobsController` — thin: parses the request, calls `JobsService`, shapes the response. No business logic.
  - `JobsService` — owns the in-memory job store (see [ADR-0003](0003-in-memory-job-storage.md)), exposes `createJob`, `listJobs`, `getJob`, `cancelJob`.
  - `UrlCheckerService` — owns the actual `HEAD`-check + concurrency-limiting + delay logic (see [ADR-0004](0004-url-check-concurrency-and-cancellation.md)), invoked by `JobsService` when a job is created, decoupled so it's independently testable/mockable.
- DTOs (`CreateJobDto`, etc.) validated with `class-validator` + Nest's `ValidationPipe`, matching [AGENTS.md](../../AGENTS.md)'s "validate at boundaries" rule.

## Consequences

- DI makes `UrlCheckerService` trivially mockable in `JobsService` unit tests (no real HTTP calls needed).
- Nest's module boundaries enforce the controller/service split structurally, not just by convention.
- Slightly more boilerplate than Express for 4 routes; accepted as worth it for the internal structure this feature actually needs (background worker + shared mutable state + cancellation).

## Alternatives Considered

- **Express**: rejected — would need the same controller/service/worker separation built by hand with no framework support, more code for the same result.
- **Fastify (standalone)**: not offered by the brief; out of scope.
