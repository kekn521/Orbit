# Development status

## Scope and decisions

Phase 1 working vertical slice, plus lightweight local analytics/assistant and interaction polish. User approved the React/Vite + Node SQLite fallback on 2026-10-16 after npm network access was denied and Next.js/Prisma were unavailable in cache. No existing repository was replaced.

The planning skill informed the modular file layout, review focus, and written plan. The verification skill informed fresh test/build checks and reporting of unverified integration/deployment capabilities. Implementation proceeded directly as requested; no plan-approval gate or external publication was introduced.

## Implemented

- Persistent local database, versioned initial SQL migration, typed models and strict Zod request validation.
- Transactional creation, editing, deletion and audit history for task, project, event, expense, budget, workout, routine, habit, check-in, note and settings resources.
- Task completion timestamps, tags, subtasks, dependencies, cycle checks, dependency completion checks, search/filter, list/board, project categories and milestones.
- Calendar day/week/month, local events, task links, deadline display and overlap warnings.
- Expense CRUD, per-currency totals, budgets, recurrence labels, category and six-month charts, formula-safe CSV.
- Workout exercise sets/reps/weights, editable routines, session history, personal records; daily habits, weekly check-ins and streaks.
- Research notes, papers, experiment status, blockers/next steps, progress reports and repository links.
- Overview derived from saved records and a deterministic read-only local assistant.
- Dark/light themes, responsive navigation, command palette, shortcuts, native accessible dialogs, confirmation and error feedback, focus timer.
- Honest future integration states, disabled automation catalog, follow-up task inbox.
- Opt-in idempotent demo seed, record-level demo flags, JSON export and backup guidance.
- Dockerfile/Compose with non-root runtime, persistent volume and loopback-only publication.

## Verification record

- Clean offline `npm ci` from the delivered lockfile: passed (136 packages).
- TypeScript strict checking: passed in the final verification run.
- ESLint: passed with no errors or warnings.
- Production Vite build: passed. Lucide's harmless `use client` directives are ignored by the bundler.
- Node unit/database/HTTP tests: **13 passed, 0 failed** in the final verification run, including UTC normalization and midnight event boundaries.
- Browser smoke: passed after the final production restart: CRUD, multi-tag typing, today's-task view, persistence after reload, habits, local assistant, command palette, themes, all 10 pages on desktop and 390px mobile, mobile navigation, and confirmation/cancellation of deletion. No uncaught browser errors. Temporary test records were removed; their audit entries remain.
- Production process restart: verified the six saved demo tasks persisted. Server left running on `http://localhost:3000` for handoff.
- Default build-watch development command: verified startup on port 3001 and rebuilds on source changes; stopped after verification.
- Visual inspection: desktop overview and mobile finance screenshots reviewed; fixed the mobile overflow caused by an absolutely positioned screen-reader table label escaping its scroll container.
- Docker Compose configuration: `docker compose config --quiet` passed. Docker warned that this sandbox cannot read the user's global Docker config. Docker image build was not run; environment network restrictions prevent dependency/image downloads.
- External integration tests: not applicable; no live integrations exist or are represented as connected.

## Known limits

- No authentication: local use only. Host/origin validation is not a substitute for auth. No remote/mobile-LAN deployment is supported yet.
- No tokens/keys are stored. Encrypted secret storage must precede OAuth/AI configuration.
- SQLite JSON-document schema suits a personal MVP; foreign relationships are enforced in `Store`, not SQL. PostgreSQL/Prisma needs a deliberate adapter and migration.
- `GET /api/dashboard` loads all records; pagination and aggregation endpoints are future work for large histories.
- Standard Vite HMR is blocked here by esbuild's parent-directory scan. Default `dev` uses build-watch and manual refresh; backend changes require restart.
- Charts use CSS and tables, styling uses custom CSS components; Tailwind/shadcn/Recharts were not cached and are not used.
- Kanban changes are made through the edit dialog, not drag/drop. Events have no recurrence or drag-to-reschedule yet.
- Recurring expenses are labels only; no transactions are generated automatically.
- No notifications/scheduler workers. Automation cards are planned templates, never active jobs.
- Local assistant recognizes broad topic keywords; it is not an LLM or general-purpose chatbot, and chat history is not persisted.
- Notes render as plain escaped text. No Markdown/attachments, experiment execution, repository fetching, or test-result inference.
- Dates for habits/expenses are calendar keys; events are UTC timestamps displayed in browser local time. Keep server timezone aligned for local assistant summaries.
- Streaks allow an unfinished current day; missing yesterday resets them. A checked day may be reversed without deleting the habit.
- Amounts use a fixed 100-unit storage scale in every supported currency. JPY is displayed without fractional units. No exchange rates or currency conversion.
- Audit history retains deleted values. No permanent-erasure UI, undo, multi-user isolation or concurrent-edit version checks.
- JSON export is records-only; restore full database backups for audit history. No import UI.
- Dependencies are pinned to locally available packages. An online dependency/security audit and development-tool modernization should precede any remote deployment.

## Recommended next implementation order

The next product milestone is application support for **Linux, Windows, macOS, and iOS**. Publishing this web MVP to `kekn521/Orbit` comes first. Desktop/mobile packaging, on-device storage, and any authenticated synchronization architecture still need to be designed and implemented; no native platform support is claimed by this version.

1. Authentication, session/CSRF protection, encrypted secrets, and authenticated configuration before supporting remote access.
2. Optional OpenAI-compatible provider with explicit feature opt-in and user-triggered context transmission; read-only tools first.
3. Calendar/Gmail read-only OAuth, secure token rotation, provider health, manual sync, and stable `(provider, externalId)` deduplication keys.
4. GitHub/GitLab adapters with configured URL and scoped credentials; local Git only through a server allowlist. Keep sourced activity separate from generated summaries.
5. Persistent scheduler worker with run history, lease/locking, retries, and in-app notifications; only then expose enabled automation controls.
6. Normalize storage for PostgreSQL if needed; add pagination, import/restore UI, richer charts and routine progress visualization.

## Project plan

See `docs/superpowers/plans/2026-10-16-dashboard.md`. Work was implemented in an initially empty workspace. Git was initialized on 2026-10-19 for publication to `https://github.com/kekn521/Orbit.git`. Private runtime data and generated artifacts are excluded from source control.
