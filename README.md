# Orbit — personal productivity workspace

A working, local-first command center for tasks, projects, scheduling, research, finances, and fitness. Dark by default, with a light theme and responsive layouts. Your data stays in a SQLite file on your own machine. No accounts or external services are needed.

## Run locally

Requires **Node.js 24.15 or newer** (native TypeScript execution and `node:sqlite`). Run these commands from this directory. On Windows PowerShell use `npm.cmd` if execution policy blocks `npm.ps1`.

Clone the repository first:

```sh
git clone https://github.com/kekn521/Orbit.git
cd Orbit
```

The examples below use Windows PowerShell. On Linux/macOS, use `npm` in place of `npm.cmd`. Desktop installers and an iOS app are planned; this version runs as a local web application and has been verified on Windows.

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd start
```

Open **http://localhost:3000**. The database and migration are created automatically on first start. If port 3000 is already occupied by Orbit, open the existing instance instead of starting a second server. Source control excludes databases, installed dependencies, builds, environment files, and the local npm cache.

For a new checkout, the workspace starts empty. To explore realistic, explicitly labeled demo data:

```powershell
npm.cmd run seed
```

Alternatively choose **Settings → Load demo**. Seeding is idempotent and refuses to add samples to a workspace containing records. It never imports email, bank, calendar, or Git activity. Deleting a demo record does not cause it to be regenerated at startup.

### Development

```powershell
npm.cmd run dev
```

The default development command builds with Vite in watch mode and serves the same local API. Refresh the browser after frontend changes; restart for backend changes. This works in the restricted Windows environment used to build the project. Standard Vite middleware/HMR is also available with `npm.cmd run dev:hmr` in environments where esbuild can scan parent directories; that mode is restricted in this workspace.

### Offline installation in the original development workspace

During initial development, dependencies were installed from existing npm cache entries. If you have that original workspace's `.npm-cache` directory, you can reinstall offline:

```powershell
npm.cmd ci --offline --ignore-scripts --no-audit --no-fund --cache=.npm-cache --logs-dir=.npm-logs
```

Fresh clones should use `npm ci` with network access: the local cache is not included in the repository. The checked-in lockfile and explicit tarball pins make installs reproducible. The local cache is ignored by Git and Docker. `scripts/prepare-offline-cache.cjs` is an optional bootstrap utility, not an application runtime dependency.

## What works

- **Overview:** saved-data daily briefing, three highest-priority tasks, a due-today task view, pending follow-ups, completion statistics, project progress, spending, habits, calendar agenda, deadlines, and quick capture.
- **Tasks and projects:** create/edit/delete, completion/reopening, list and Kanban views, searching, project/status filters, priorities, due dates, tags, subtasks, dependency validation, project milestones, and progress calculated from actual tasks. Edit a card to move it between Kanban columns. Deleting a project preserves its tasks and notes.
- **Calendar:** local event CRUD, day/week/month views, task links, task deadlines, overlap highlighting, and a manually reviewed focus-block form. Times are entered and displayed in browser local time; stored event timestamps are UTC.
- **Research:** project descriptions, blockers, next steps, repository links, milestone tasks, paper references, notes, experiment status, and progress reports. No inferred repository activity or verified test results are displayed.
- **Finance:** editable expense records, integer amount storage, TWD default with separate USD/EUR/JPY ledgers, category budgets, monthly/weekly totals, six-month trend, category breakdown, recurrence labels, CSV export, and database audit history. Currency totals never mix and no conversion is implied.
- **Fitness:** editable workout history, exercise sets/repetitions/weights, configurable routines, Push/Pull/Legs demo routines, highest recorded weights, weekly training statistics, daily habit check-ins, weekly completion, and streaks.
- **Inbox:** honest unconnected Gmail state and persistent follow-up tasks tagged `follow-up`.
- **Local assistant:** deterministic, read-only summaries of daily commitments, weekly progress, expenses, and projects. Explicitly identified as local rules, not generative AI. Chat is in-memory only.
- **Settings:** persisted name/theme/currency, integration status, opt-in demo seed, JSON export, and privacy information.
- **Interaction:** responsive sidebar, keyboard-accessible native dialogs, confirmation before record deletion, status/error notifications, command palette (`Ctrl/⌘ K`), new-task shortcut (`N`), and a 25-minute focus timer. Running focus timers survive browser refresh.

## Architecture

The initial directory was empty. The requested Next.js/Prisma packages were unavailable offline. **The user approved React/Vite + native SQLite** as the implementation stack so the application could be installed, run, and tested here.

| Area           | Implementation                                                          |
| -------------- | ----------------------------------------------------------------------- |
| UI             | React 19, strict TypeScript, Lucide icons, reusable CSS components      |
| Build          | Vite 6, native config loading                                           |
| API            | Node HTTP server, explicit resource routes, Zod validation              |
| Persistence    | Node `DatabaseSync`, SQLite WAL, transactional mutations, SQL migration |
| Tests          | Node test runner + real Chromium/Edge browser smoke script              |
| Styling/charts | Responsive CSS, semantic tables, CSS charts; no remote fonts/assets     |

```text
src/
  App.tsx                 navigation, dialogs, state, focus timer, command palette
  api.ts                  typed fetch client and error handling
  components/             shared UI, task rows, validated record editor
  pages/                  focused feature screens
shared/
  domain.ts               models, Zod schemas, resource types
  analytics.ts            money/date calculations, streaks, briefings, CSV escaping
server/
  index.ts                server, production assets, optional Vite middleware
  http.ts                 local access boundary and JSON/CSV endpoints
  database.ts             Store API, transactions, validation, audit history
  migrations/             initial schema and indexes
  providers.ts            future provider contracts; explicit unavailable states
  seed.ts                 opt-in sample records
tests/                    domain, persistence, HTTP integration tests
scripts/                  dev watcher, optional cache bootstrap, browser smoke
```

`Store` owns persistence and relationship validation. The MVP uses a Zod-typed JSON document table with resource indexes, uniqueness indexes for check-ins/budgets, and an audit log. References are checked and unlinked transactionally by the service, not by SQL foreign keys. Do not write directly into the database. A future Prisma/PostgreSQL adapter can replace `Store` behind the HTTP boundary; it needs explicit normalized models, foreign keys, and a data migration. This is a migration path, not a claim that the current SQLite-specific queries already run on PostgreSQL.

### API

`GET /api/dashboard` returns all local records. Resource endpoints support `GET /api/:resource`, `GET /api/:resource/:id`, `POST /api/:resource`, `PUT /api/:resource/:id`, and `DELETE /api/:resource/:id`. Resource names are enumerated in `shared/domain.ts`.

Writes use JSON. `PUT` replaces validated editable fields; never send metadata (`id`, `demo`, timestamps). Unknown fields and invalid relationships are rejected. Deletes require `{ "confirm": true }`. Settings are a singleton and cannot be deleted. `GET /api/export` downloads expenses as CSV; formula-like descriptions are escaped. `GET /api/backup` exports all current records as JSON. `POST /api/assistant` accepts `{ "prompt": "Summarize my week" }` and has no write operations or network calls.

All mutations append a local `audit_log` entry, including before/after values and timestamps. Audit data is retained after deletion; there is no permanent-erasure or undo UI in this version. The audit trail is available through SQLite tools and included in full database backups, not the JSON records export.

### Environment variables

Copy `.env.example` to `.env` if you want overrides; defaults work without it.

| Variable   | Default       | Purpose                                                                               |
| ---------- | ------------- | ------------------------------------------------------------------------------------- |
| `PORT`     | `3000`        | HTTP port                                                                             |
| `HOST`     | `127.0.0.1`   | Bind address; keep loopback for local use                                             |
| `DATA_DIR` | `./data`      | Directory containing `orbit.sqlite`                                                   |
| `TZ`       | host timezone | Set to `Asia/Taipei` in Docker; align server and browser timezone for daily summaries |
| `NODE_ENV` | unset         | Set `production` for deployment                                                       |

No API keys or OAuth tokens are accepted by this version. Never put secrets into frontend `VITE_*` variables.

## Security and privacy boundary

This is a **single-user local application**, not an authenticated remote service. The default server binds only to loopback, accepts localhost/loopback Host headers, rejects cross-origin and cross-site requests, validates all write bodies, and requires JSON. Production responses use CSP, frame denial, and MIME protections. React renders notes as escaped text; no arbitrary HTML or generated shell commands are executed.

Host/origin checks are defense in depth, **not authentication**. Do not publish this app on a public port, tunnel, or reverse proxy. Docker binds the published port to host loopback. `HOST=0.0.0.0` is only for the container's internal listener; do not use it for a public host. Browser mobile layout is supported, but LAN access from a phone is intentionally not enabled yet.

All records and audit history are plaintext in the local database. Use appropriate OS file permissions and disk encryption. Integration tokens will require authenticated configuration and an encryption key kept outside the database before any credential persistence is added. No personal data is sent to an AI provider, email service, analytics service, or repository provider.

## Backup and restore

Stop the application, then copy the entire `DATA_DIR` (including any SQLite sidecar files). Restore by stopping the app and restoring that directory, or point `DATA_DIR` at your backup. Avoid replacing an open SQLite file. JSON export is portable records-only data; JSON import is not implemented. CSV exports are for analysis, not complete backups.

## Docker

```sh
docker compose up --build -d
docker compose logs -f orbit
```

Open http://localhost:3000. The named `orbit-data` volume persists the database. The container runs as a non-root user, has a health check, and publishes only to `127.0.0.1`. To add demo data to a fresh container:

```sh
docker compose exec orbit node server/seed-cli.ts
```

Do not use `docker compose down -v` unless you intend to delete the persistent volume. The Docker configuration is provided, but image building was not verified in this restricted environment; image/package downloads require network access.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Domain and HTTP tests use isolated databases and an ephemeral loopback server. The persistence test closes and reopens a file database. `scripts/browser-smoke.mjs` exercises the real application, including CRUD, reload persistence, check-ins, keyboard commands, deletion confirmation, themes, and every page at desktop/mobile widths. It uses Playwright Core and an installed Chromium browser; point `PLAYWRIGHT_MODULE` at an installed module and `BROWSER_PATH` at its executable. Set `BASE_URL` to a test server, then run `node scripts/browser-smoke.mjs`.

The browser script creates then deletes its test records and writes screenshots under ignored `test-results/`. Use a test workspace when running it yourself: records are cleaned up, but audit entries are intentionally retained, and it ends in dark mode. Node tests and browser tests do not query any external service.

## Deliberately deferred

Phase 1 is implemented; this is not the full four-phase roadmap. OAuth integrations, real AI providers, encrypted credentials, authentication, background scheduling/notification history, natural-language expense parsing, Google Sheets synchronization, recurring transaction generation, JSON import, and repository adapters are not implemented. Integration and automation cards explicitly say so, show no last sync/run, and have no pretend connection buttons.

See [DEVELOPMENT.md](DEVELOPMENT.md) for implementation status, verification results, and the recommended next work.
