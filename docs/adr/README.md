# Architecture Decision Records

One decision per file, [Nygard style](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions): context, decision, consequences. User stories and functional requirements live in [spec.md](../../specs/001-url-status-checker/spec.md), not here — see [AGENTS.md](../../AGENTS.md#documentation--adrs) for the rule.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-repo-layout-and-docker-topology.md) | Repository layout & Docker Compose topology | Accepted |
| [0002](0002-backend-framework-nestjs.md) | Backend framework: NestJS | Accepted |
| [0003](0003-in-memory-job-storage.md) | Job & result storage: in-memory only | Accepted |
| [0004](0004-url-check-concurrency-and-cancellation.md) | URL-check concurrency control & job cancellation | Accepted |
| [0005](0005-frontend-state-and-data-layer.md) | Frontend state & data layer: Redux Toolkit + RTK Query | Accepted |
| [0006](0006-frontend-architecture-fsd.md) | Frontend architecture: Feature-Sliced Design (FSD) | Accepted |
| [0007](0007-frontend-styling-tailwind-daisyui.md) | Frontend styling: Tailwind CSS + daisyUI | Accepted |

Related: [spec.md](../../specs/001-url-status-checker/spec.md) (user stories & functional requirements), [plan.md](../../specs/001-url-status-checker/plan.md) (technical plan that wires these decisions together).
