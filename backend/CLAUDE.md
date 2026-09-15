# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Runtime is **Bun** (not Node). Run everything from `backend/`.

```bash
bun install          # install deps
bun run dev          # dev server with --watch
bun run start        # run server
bun run typecheck    # tsc --noEmit  (the only "build" step; noEmit is on)
```

Prisma:

```bash
bunx prisma generate  # regenerate client into src/generated/prisma after editing prisma/schema.prisma
bunx prisma db pull   # re-introspect the DB into prisma/schema.prisma
```

There is no test runner, linter, or formatter configured yet (`src/tests/` is an empty placeholder). Verification is `bun run typecheck` plus manually hitting endpoints.

Required `.env` (git-ignored): `PORT`, `DATABASE_URL`, `JWT_SECRET`. `JWT_SECRET` is read at module load in `src/utils/jwt.ts` and throws if missing, so the server won't boot without it.

## Architecture

Express 5 API on Bun, PostgreSQL via Prisma 7 with the `@prisma/adapter-pg` driver adapter (`src/db/prisma.ts` is the single shared client; `connectDB()` pings with `SELECT 1` before `app.listen`).

Every feature is a module under `src/modules/<name>/` with a strict four-layer split — this is the core convention to follow when adding anything:

```
routes → controller → service → repository → prisma
```

- **routes** — path + `requireAuth` only.
- **controller** — parses/validates `req.params`, `req.body`, and `req.userId` with Zod, then calls services. Controllers do not touch `prisma`.
- **service** — all authorization and business rules live here, and services throw `ApiError`.
- **repository** — the only layer that calls `prisma`; picks explicit `select` sets so password hashes and internals never leak.

Repositories and services export plain functions; the ambiguity between layers is resolved with import aliases (`createProject as createProjectRepository`), and services are re-exported with a `...Service` suffix for controllers.

### Database schema ownership

`prisma/schema.prisma` is **introspected**, not authored: there is no `prisma/migrations/` directory, the models use snake_case table/column names, and a `schema_migrations` model (dbmate) is present. Migrations are applied to Postgres outside this repo; after a schema change, `prisma db pull` then `prisma generate`.

The generated client is committed at `src/generated/prisma/` and imported by relative path (`../generated/prisma/client`, `../generated/prisma/enums`) — **not** from `@prisma/client`. Regenerate and commit it when the schema changes.

### Errors and responses

Express 5 forwards rejected async handlers automatically, so controllers `throw new ApiError(...)` instead of calling `next(err)` and there is no `asyncHandler` wrapper.

`errorMiddleware` (last `app.use` in `src/app.ts`) resolves in order: Prisma known-request errors via `handlePrismaError` (P2002→409, P2003→409, P2025→404), then `ApiError`, then a generic 500. Every success path returns `new ApiResponse(status, data, message)`; both classes keep the same `{ success, statusCode, message, data, errors }` shape.

### Auth

JWT in an **httpOnly cookie** named `accessToken` (not an `Authorization` header). `requireAuth` reads `req.cookies.accessToken`, verifies it, and sets `req.userId` (typed via the global augmentation in `src/types/express.d.ts`). Tokens are `{ sub: userId, type: "access" }`, 1 day; passwords are bcrypt with 12 salt rounds.

CORS is hardcoded to `http://localhost:5173` with `credentials: true` for the (not yet built) frontend.

### Authorization model

Projects have an `owner_id` column *and* a `project_members` join table with a `member_role` enum (`owner`/`admin`/`member`). The owner is identified by `projects.owner_id` and is typically **not** a row in `project_members`, so any permission check must consider both.

Two styles coexist in `projects.service.ts`: the newer task handlers use the `requireProjectRole(projectId, userId, allowedRoles)` helper in `src/utils/project-member.authorization.ts`; the older project/member handlers inline `isOwner || isMember` checks against `findProjectById`. Prefer `requireProjectRole` for new code.

Rules encoded today: only the owner may update/delete a project; owner+admin may add members, change roles, and delete tasks; the owner's own membership row cannot be modified or removed; a member may remove themselves; any member may update a task they're assigned to, but only owner/admin may change `assigned_to` or `priority`.

## Routing

Mounted in `src/app.ts` under `/api/v1`: `users`, `auth`, `projects`. Sub-resources are nested inside the projects router rather than in their own modules — `src/modules/project-members/` and `src/modules/tasks/` are empty placeholders, and member and task handlers all live in `projects.{routes,controller,service,repository}.ts`.

```
POST   /api/v1/auth/register|login|logout      GET /api/v1/auth/me
GET    /api/v1/users            GET|PATCH|DELETE /api/v1/users/:id
GET|POST /api/v1/projects       GET|PATCH|DELETE /api/v1/projects/:id
GET|POST /api/v1/projects/:projectId/members    GET|PUT|DELETE .../members/:userId
GET|POST /api/v1/projects/:projectId/tasks      GET|PUT|DELETE .../tasks/:tasksId
```

Note the task route param is spelled `:tasksId`. The `/api/v1/users` routes currently have **no** `requireAuth`, and the users repository returns full rows including `password_hash`. There is no `/health` endpoint.

Nested routes for resources that belong to a project; flat routes for addressing a resource directly.
