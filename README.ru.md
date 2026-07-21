# 3205

[English](README.md)

Асинхронная проверка URL — отправьте список URL, бэкенд проверяет каждый HTTP-запросом `HEAD` в фоне (ограниченная конкурентность, искусственная задержка), а фронтенд отслеживает прогресс и результаты по каждому URL. Полная функциональная спецификация — в [spec.md](specs/001-url-status-checker/spec.md).

## Стек технологий

**Бэкенд** — NestJS 11, TypeScript (`strict: true`), `class-validator`/`class-transformer` для валидации DTO, `p-limit` для ограничения конкурентности на уровне задачи, встроенный `fetch` Node.js для HTTP-проверок `HEAD`. Хранение только в памяти, без базы данных ([ADR-0003](docs/adr/0003-in-memory-job-storage.md)).

**Фронтенд** — React 19 + TypeScript, Redux Toolkit + RTK Query, Vite, Tailwind CSS + daisyUI. Структура по Feature-Sliced Design ([ADR-0006](docs/adr/0006-frontend-architecture-fsd.md)).

Полное обоснование каждого значимого решения — в [docs/adr/](docs/adr/README.md).

## Покрытие тестами

- **Бэкенд**: Jest — модульные тесты для `JobsService`/`UrlCheckerService`/валидации DTO (ограничение конкурентности, переходы статусов, классификация success/error), плюс e2e-набор (`backend/test/jobs.e2e-spec.ts`), который поднимает реальное Nest-приложение в процессе и обращается к нему по настоящему HTTP через `supertest`, покрывая цепочку создание → опрос → отмена на локальном тестовом HTTP-сервере (без обращения к внешней сети). Запуск: `npm test` / `npm run test:e2e` в `backend/`.
- **Фронтенд**: Vitest + React Testing Library — интеграционный тест, проверяющий, что переключение активной задачи во время опроса никогда не показывает устаревшие данные (SC-003).
- **CI**: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) запускает lint + build + test для обоих приложений при каждом push и PR в `main`.

Цифры покрытия (`npm run test:cov` в любом из приложений), только по модульным наборам:

| | Statements | Branch | Functions | Lines |
|---|---|---|---|---|
| Бэкенд | 77.1% | 72.1% | 82.1% | 78.2% |
| Фронтенд | 55.3% | 38.6% | 52.9% | 58.1% |

Не 100% — это осознанный выбор, а не недосмотр, согласно философии тестирования из [AGENTS.md](AGENTS.md) (значимая уверенность важнее исчерпывающего QA):
- `jobs.controller.ts`/`app.module.ts`/`jobs.module.ts`/`main.ts` бэкенда показывают здесь 0%, потому что модульный конфиг Jest (`backend/package.json`) и его e2e-конфиг (`backend/test/jest-e2e.json`) запускаются и отчитываются раздельно — реальные маршруты контроллера покрыты e2e-набором, и здесь не задваиваются.
- Во фронтенде намеренно есть один целевой интеграционный тест (регрессия stale-switch для SC-003 — самое строгое требование корректности из спецификации), а не модульные тесты на каждый компонент — большая часть непокрытого кода это презентационный JSX без логики ветвления, которая заслуживала бы отдельного теста.

## Соглашения / практики

- **Спецификация прежде кода**: у каждой фичи есть spec, plan и разбивка на задачи в `specs/` (через [spec-kit](.specify/)) до написания кода.
- **Решения фиксируются, а не просто принимаются**: архитектурно значимые решения — это ADR в `docs/adr/`, а не устные договорённости.
- **Воспроизводимые установки**: `package-lock.json` закоммичен, CI/Docker используют `npm ci`, поэтому установка идентична побайтово везде — подробнее в разделе про версии ниже.
- **Lint + форматирование обязательны**: ESLint + Prettier с обеих сторон, проверяются в CI.
- **Строгий режим TypeScript** на бэкенде; DTO валидируются на границе API, невалидированные данные никогда не доверяются.
- Полный список инженерных соглашений этого репозитория — в [AGENTS.md](AGENTS.md).

## Версии

`package.json` использует диапазоны semver, но `package-lock.json` фиксирует точные версии, а оба Dockerfile и CI устанавливают зависимости через `npm ci` — поэтому в любом окружении (локально, CI, Docker) получается одно и то же дерево зависимостей. Базовые образы Docker (`node:22-alpine`, `nginx:1.27-alpine`) закреплены по major.minor, но не по точному patch-номеру, чтобы пересборки всё ещё подхватывали патчи безопасности уровня ОС.

## Установка

Предварительные требования: Node.js 22 LTS + npm (для локальной разработки) или Docker + Docker Compose.

```bash
git clone git@github.com:lemind/3205.git
cd 3205
cd backend && npm install
cd ../frontend && npm install
```

(Для Docker-варианта это не требуется — `docker compose up --build` устанавливает зависимости внутри контейнеров.)

## Запуск

### Локальная разработка (без Docker)

```bash
# бэкенд (после Установки)
cd backend && npm run start:dev   # http://localhost:3000/api/health

# фронтенд (отдельный терминал, после Установки)
cd frontend && npm run dev        # http://localhost:5173
```

### Docker

```bash
docker compose up --build
# фронтенд: http://localhost:8080
# бэкенд:   http://localhost:3000/api/health
```

Полный пошаговый сценарий — в [quickstart.md](specs/001-url-status-checker/quickstart.md).

## Документация

- [specs/001-url-status-checker/spec.md](specs/001-url-status-checker/spec.md) — спецификация фичи (пользовательские сценарии, требования)
- [specs/001-url-status-checker/plan.md](specs/001-url-status-checker/plan.md) — план реализации
- [specs/001-url-status-checker/tasks.md](specs/001-url-status-checker/tasks.md) — разбивка на задачи
- [docs/adr/](docs/adr/README.md) — architecture decision records
- [AGENTS.md](AGENTS.md) — инженерные соглашения
