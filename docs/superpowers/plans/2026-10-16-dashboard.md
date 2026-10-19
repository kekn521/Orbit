# Personal Command Center Implementation Plan

> **For agentic workers:** Execute inline. User explicitly requests implementation without a plan approval stop. Verification-before-completion applies.

**Goal:** Deliver a persistent, usable, self-hosted Phase 1 productivity dashboard.

**Architecture:** One local server, one SQLite database, a typed React frontend, validated JSON APIs and modular provider contracts. Prefer Next.js/Prisma; network access is blocked and neither package is cached. The user approved the locally available React/Vite and native SQLite fallback.

**Tech Stack:** User-approved React/Vite, TypeScript, Lucide, Zod, Node HTTP and native SQLite. Custom CSS components and charts; unavailable libraries were not emulated.

**Spec:** User's Personal AI Productivity Dashboard request in this conversation; Phase 1 is the completion boundary.

## Global Constraints

- All implemented editing workflows persist to local SQLite.
- Default dark theme, optional light theme; currency defaults to TWD.
- Demo data must be opt-in and labeled. No fabricated integration activity.
- No external AI transmissions, OAuth tokens, or scheduler claims in Phase 1.
- Bind to loopback until authentication is implemented; reject unexpected hosts/origins.
- Delete requires explicit confirmation; validate all writes server-side.

## Review Focus

- Invalid dates and reversed event intervals are rejected.
- Expense totals never mix currencies; money uses integer minor units.
- Task dependencies cannot cycle or reference deleted/missing tasks.
- Habit check-ins are unique per habit/day and streaks use calendar days.
- Changes survive database reopen; project removal preserves tasks.

### Task 1: Persistent domain and validated API

Files: `shared/domain.ts`, `shared/analytics.ts`, `server/database.ts`, `server/service.ts`, `server/index.ts`, `server/migrations/001-initial.sql`, `tests/*.test.ts`.

Interfaces: typed records and `DashboardData`; `Store.list/create/update/remove`, dashboard endpoint, CRUD endpoints, unique daily habit check-ins.

- [x] Define models and validation; write tests for invalid events, money and dates.
- [x] Create SQLite migration, transactional CRUD, task relation validation and safe deletion.
- [x] Add local-only HTTP boundary, JSON error handling and CSV export.
- [x] Run tests including persistence across reopening, uniqueness and cascades.

### Task 2: Usable application

Files: `src/App.tsx`, `src/components/*`, `src/pages/*`, `src/styles.css`, `src/api.ts`.

Interfaces: `DashboardData` from `/api/dashboard`; shared editor calls typed resource endpoints.

- [x] Build responsive shell, navigation, accessible dialogs, command palette and feedback states.
- [x] Implement overview, tasks/projects, calendar and finances.
- [x] Implement research notes, workout logging, routine configuration, habits and settings.
- [x] Expose clearly unavailable inbox/integrations/automations; deterministic local assistant.
- [x] Run type checking and frontend build; exercise workflow requests against HTTP server.

### Task 3: Delivery and review

Files: `README.md`, `DEVELOPMENT.md`, `Dockerfile`, `compose.yaml`, `.env.example`.

- [x] Provide opt-in, idempotent demo seed and export.
- [x] Document architecture, startup, privacy boundaries, backup and remaining phases.
- [x] Run lint, type checking, tests, production build and runtime smoke checks.
- [x] Review changes for data loss, validation and misleading integration claims.

## Decisions and progress

- Empty directory; no existing application or AGENTS.md found.
- npm registry connection returns EACCES; escalated execution rejected by the environment approval policy. No attempt to bypass that restriction.
- PowerShell execution policy requires `npm.cmd` on Windows.
- No git repository exists; implementation stays in the user-requested workspace, without commits or worktree operations.

## Final result

All three tasks completed. Clean offline install, strict type checking, ESLint, 13 automated tests, production build and browser workflow suite passed. All 10 screens checked at desktop and mobile widths. Database reopening and process-restart persistence verified. Compose configuration validates; image build not executed. See DEVELOPMENT.md for detailed limitations and next phases. No live integrations, external AI, authentication, or scheduler are claimed.
