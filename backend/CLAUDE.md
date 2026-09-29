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

Tests (Bun's runner; see README "Testing"):

```bash
bun run test:db:setup     # once: create the "-test" database and push the schema
bun run test              # unit (src/tests/unit), then integration (src/tests/integration)
bun test src/tests/integration/tasks.test.ts   # a single file
```

The preload in `bunfig.toml` rewrites `DATABASE_URL` to the `-test` database and refuses any other; integration tests truncate every table before each test. Keep unit and integration as separate `bun test` runs — the service unit test uses `mock.module`, which is process-wide. There is no linter or formatter; verify with `bun run typecheck` and `bun run test`.

Required `.env` (git-ignored): `PORT`, `DATABASE_URL`, `JWT_SECRET`. `JWT_SECRET` is read at module load in `src/utils/jwt.ts` and throws if missing, so the server won't boot without it.

## Architecture

Express 5 API on Bun, PostgreSQL via Prisma 7 with the `@prisma/adapter-pg` driver adapter (`src/db/prisma.ts` is the single shared client; `connectDB()` pings with `SELECT 1` before `app.listen`).

Every feature is a module under `src/modules/<name>/` with a strict four-layer split — this is the core convention to follow when adding anything:

```
routes → controller → service → repository → prisma
```

- **routes** — path, `requireAuth`, and the `validate({ params, body, query })` middleware that declares the Zod schemas for that endpoint.
- **controller** — reads the already-parsed values (`validatedParams<T>(req)`, `validatedBody<T>(req)`, `requireUserId(req)`) and calls services. Controllers no longer call `safeParse` themselves, and do not touch `prisma`.
- **service** — all authorization and business rules live here, and services throw `ApiError`.
- **repository** — the only layer that calls `prisma`; picks explicit `select` sets so password hashes and internals never leak.

Repositories and services export plain functions; the ambiguity between layers is resolved with import aliases (`createProject as createProjectRepository`), and services are re-exported with a `...Service` suffix for controllers.

### Database schema ownership

`prisma/schema.prisma` is **introspected**, not authored: there is no `prisma/migrations/` directory, the models use snake_case table/column names, and a `schema_migrations` model (dbmate) is present. Migrations are applied to Postgres outside this repo; after a schema change, `prisma db pull` then `prisma generate`.

The generated client is committed at `src/generated/prisma/` and imported by relative path (`../generated/prisma/client`, `../generated/prisma/enums`) — **not** from `@prisma/client`. Regenerate and commit it when the schema changes.

### Errors and responses

**`ERRORS.md` is the reference for the error contract** — envelope, status codes, `ErrorCode` table, and the rules for adding an endpoint. Read it before changing anything below.

Express 5 forwards rejected async handlers automatically, so controllers `throw new ApiError(...)` instead of calling `next(err)` and there is no `asyncHandler` wrapper.

`errorMiddleware` (last `app.use` in `src/app.ts`, preceded by `notFoundMiddleware`) resolves in order: `ApiError`, then `ZodError` via `handleZodError`, then Prisma errors via `handlePrismaError` (P2000/P2011→400, P2001/P2025→404, P2002→409, P2003/P2014→409, validation/panic→500, initialization→503), then body-parser errors (`entity.parse.failed`→400 `INVALID_JSON`, `entity.too.large`→413), then a generic 500. It is the only place an error becomes a response; nothing else calls `res.status(...).json(...)` on a failure path.

Every error response carries `{ success, statusCode, code, message, data, errors, requestId }` plus `fieldErrors` on validation failures — `code` is a stable `ErrorCode` string (`src/utils/error-codes.ts`) that clients branch on. 5xx are logged with a stack; outside production the response also includes a `debug` block. Success paths return `new ApiResponse(status, data, message)`.

Validation lives in `middleware/validate.middleware.ts`: it parses params, query and body in one pass so a request's problems are reported together, and `ValidationError` (`src/utils/zod-error.ts`) flattens Zod issues into `{ field, code, message }` entries plus a `fieldErrors` map keyed by dot path (`_root` for object-level issues). Body failures are 422, param/query failures 400. Every Zod rule must carry a human-written message, and every body schema is `.strict()`.

### Auth

JWT in an **httpOnly cookie** named `accessToken` (not an `Authorization` header). `requireAuth` reads `req.cookies.accessToken`, verifies it, and sets `req.userId` (typed via the global augmentation in `src/types/express.d.ts`). Tokens are `{ sub: userId, type: "access" }`, 1 day; passwords are bcrypt with 12 salt rounds (4 under `NODE_ENV=test`).

CORS is hardcoded to `http://localhost:5173` with `credentials: true`; the frontend (`../frontend`) calls the API through Vite's same-origin `/api` proxy.

### Authorization model

Projects have an `owner_id` column *and* a `project_members` join table with a `member_role` enum (`owner`/`admin`/`member`). The owner is identified by `projects.owner_id` and is typically **not** a row in `project_members`, so any permission check must consider both.

Two styles coexist in `projects.service.ts`: the newer task handlers use the `requireProjectRole(projectId, userId, allowedRoles)` helper in `src/utils/project-member.authorization.ts`; the older project/member handlers inline `isOwner || isMember` checks against `findProjectById`. Prefer `requireProjectRole` for new code.

Rules encoded today: only the owner may update/delete a project; owner+admin may add members, change roles, and delete tasks; the owner's own membership row cannot be modified or removed; a member may remove themselves; any member may update a task they're assigned to, but only owner/admin may change `assigned_to` or `priority`; on create, a plain member may assign the task only to themselves and may not set `priority`; an assignee (create or update) must be the owner or a `project_members` row (`requireAssignableUser`). Users may only `PATCH`/`DELETE` their own account (`/users/:id` → 403 otherwise).

## Routing

Mounted in `src/app.ts` under `/api/v1`: `users`, `auth`, `projects`. Sub-resources are nested inside the projects router rather than in their own modules — `src/modules/project-members/` and `src/modules/tasks/` are empty placeholders, and member and task handlers all live in `projects.{routes,controller,service,repository}.ts`.

```
POST   /api/v1/auth/register|login|logout      GET /api/v1/auth/me
GET    /api/v1/users            GET|PATCH|DELETE /api/v1/users/:id
GET|POST /api/v1/projects       GET|PATCH|DELETE /api/v1/projects/:id
GET|POST /api/v1/projects/:projectId/members    GET|PUT|DELETE .../members/:userId
GET|POST /api/v1/projects/:projectId/tasks      GET|PUT|DELETE .../tasks/:tasksId
```

Note the task route param is spelled `:tasksId` — param schema keys must match it. Every route above is behind `requireAuth` except `auth/register`, `auth/login` and `auth/logout`. The users repository selects explicit columns, so `password_hash` is never returned (an integration test enforces this). There is no `/health` endpoint. Unmatched paths return a JSON `404 ROUTE_NOT_FOUND` from `notFoundMiddleware`, and every request is tagged with an `X-Request-Id`.

Nested routes for resources that belong to a project; flat routes for addressing a resource directly.
