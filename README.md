# 3205
test task

## Setup

Prerequisites: Node.js 22 LTS + npm (for local dev), or Docker + Docker Compose.

```bash
git clone git@github.com:lemind/3205.git
cd 3205
cd backend && npm install
cd ../frontend && npm install
```

(Docker path doesn't need this — `docker-compose up --build` installs deps inside the containers.)

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
docker-compose up --build
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
