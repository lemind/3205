# 0006. Frontend architecture: Feature-Sliced Design (FSD)

**Status**: Accepted

**Related**: [spec.md](../../specs/001-url-status-checker/spec.md) ("Frontend MUST be split into components / API layer / global state"), [0005](0005-frontend-state-and-data-layer.md)

## Context

The brief requires the frontend be split into components, an API layer, and global state. That's a minimum; left unstructured, a Redux Toolkit + RTK Query app tends to sprawl into an unclear mix of "where does this component/slice/query go." We want a folder structure that makes that split explicit and enforces one-directional dependencies as the app grows past this one feature.

## Decision

Use **Feature-Sliced Design (FSD)** for `frontend/src`:

```text
src/
├── app/            # app bootstrap: store setup, providers, router (if any), global styles
├── pages/          # route-level compositions (JobsPage) — thin, assembles widgets/features
├── widgets/         # composite UI blocks (JobList, JobDetail) built from features/entities
├── features/        # user actions (CreateJobForm, CancelJobButton) — one folder per interaction
├── entities/         # domain data + its RTK Query API slice (job/ — model, jobsApi, JobStatusBadge)
└── shared/          # generic reusable code with no domain knowledge (ui kit, lib/hooks, api base config)
```

Layer rules (standard FSD, enforced by convention + import-boundary lint rule where practical):
- Each layer may import only from layers **below** it (`app` → `pages` → `widgets` → `features` → `entities` → `shared`), never sideways within the same slice's siblings, never upward.
- `entities/job/` owns the `jobsApi` (RTK Query, see [ADR-0005](0005-frontend-state-and-data-layer.md)) and the `Job`/`JobStatus` types — this **is** the "API layer" the brief asks for, and it's the single place job data-fetching logic lives.
- `features/create-job/`, `features/cancel-job/` own the form and cancel-button interaction logic, each importing `entities/job` for the mutations they need.
- `widgets/job-list/`, `widgets/job-detail/` compose `entities`/`features` into the two main UI panels described in the brief.
- `pages/jobs/` is the single page for this app (list + detail side by side, per the brief's UI) — composes the widgets.

## Consequences

- Directly satisfies the brief's "components / API layer / global state" split, with the API layer and domain model co-located per entity instead of a generic bucket of hooks.
- Import-direction discipline prevents e.g. `entities/job` reaching into a `feature`'s component — keeps the domain layer stable as more features are added.
- For an app this size (one entity, two features, two widgets, one page) FSD is a bit more ceremony than a flat `components/` + `api/` + `store/` split — accepted because it directly maps to the brief's explicit structural requirement and documents *why* each file lives where it does, which a flat structure wouldn't.

## Alternatives Considered

- **Flat `components/` + `api/` + `store/`**: satisfies the brief's literal wording too, but doesn't scale past one feature and gives no import-direction guarantees. Rejected in favor of a structure that documents itself.
- **Atomic Design (atoms/molecules/organisms)**: organizes by UI complexity, not by domain/feature — doesn't map cleanly to "API layer" as a concept the brief calls out explicitly. Rejected.
