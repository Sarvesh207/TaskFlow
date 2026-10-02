# Project Management SaaS — Backend

Backend API for a Project Management SaaS application built with Bun,
TypeScript, Express 5, PostgreSQL and Prisma.

## Tech Stack

- Bun (runtime and package manager)
- TypeScript
- Express 5
- PostgreSQL
- Prisma 7 with the `@prisma/adapter-pg` driver adapter
- Zod (validation)
- JWT in an httpOnly cookie
- bcrypt
- dbmate (SQL migrations, run outside this repo)

## Architecture

The backend follows a layered architecture:

```text
HTTP Request
     ↓
   Route
     ↓
 Controller
     ↓
   Service
     ↓
 Repository
     ↓
   Prisma
     ↓
 PostgreSQL
```

### Responsibilities

- **Routes** — Define API endpoints and attach `requireAuth`.
- **Controllers** — Parse and validate `req.params`, `req.body` and
  `req.userId` with Zod, then call services. Controllers never touch Prisma.
- **Services** — Contain business logic and all authorization checks. They
  throw `ApiError`.
- **Repositories** — The only layer that calls Prisma. Use explicit `select`
  sets so internal fields are not returned.
- **Middleware** — Authentication and global error handling.
- **Types/Schemas** — TypeScript types and Zod request validation.

Express 5 forwards rejected async handlers automatically, so controllers
`throw new ApiError(...)` directly — there is no `asyncHandler` wrapper and no
`next(err)` plumbing.

## Project Structure

```text
backend/
│
├── src/
│   ├── app.ts                  # Express app, CORS, routers, error middleware
│   ├── server.ts               # connectDB() then app.listen()
│   │
│   ├── db/
│   │   └── prisma.ts           # shared PrismaClient + connectDB()
│   │
│   ├── generated/prisma/       # generated Prisma client (committed)
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts  # requireAuth
│   │   └── error-middleware.ts # global error handler
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   └── projects/           # also holds members and tasks
│   │
│   ├── utils/
│   │   ├── api-error.ts
│   │   ├── api-response.ts
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   ├── prisma-error.ts
│   │   └── project-member.authorization.ts
│   │
│   └── types/
│       ├── express.d.ts        # req.userId augmentation
│       └── global.types.ts     # shared UUID schema
│
├── prisma/
│   └── schema.prisma           # introspected from the database
│
├── prisma.config.ts
├── .env
├── package.json
├── tsconfig.json
└── README.md
```

Each module follows the same file layout:
`<name>.routes.ts`, `<name>.controller.ts`, `<name>.service.ts`,
`<name>.repository.ts`, `<name>.schema.ts`, `<name>.types.ts`.

Project members and tasks are **not** separate modules. Their routes,
controllers, services and repository functions all live inside
`src/modules/projects/`. The `src/modules/project-members/` and
`src/modules/tasks/` directories are empty placeholders.

## Database

PostgreSQL database:

```text
project-management-sass
```

Main tables:

```text
users
  │
  ├── user_profiles
  │
  └── projects
        │
        ├── project_members
        │
        └── tasks
              │
              └── assigned_to → users
```

### Tables

- `users`
- `user_profiles`
- `projects`
- `project_members`
- `tasks`
- `schema_migrations` (owned by dbmate)

### Enums

- `project_status` — `active`, `completed`, `archived`
- `task_status` — `pending`, `in_progress`, `completed`, `cancelled`
- `member_role` — `owner`, `admin`, `member`

## Environment Variables

Create a `.env` file:

```env
PORT=3000
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/project-management-sass?sslmode=disable
JWT_SECRET=your_secret
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5173/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

See `.env.example`. The `GOOGLE_*` variables are only needed for Google
sign-in; without them `/auth/google` redirects back to `/login?error=SERVICE_UNAVAILABLE`.

`JWT_SECRET` is read when `src/utils/jwt.ts` is first imported and throws if it
is missing, so the server will not boot without it.

Never commit `.env` to Git.

## Installation

Install dependencies:

```bash
bun install
```

Start the development server (watch mode):

```bash
bun run dev
```

Run the server:

```bash
bun run start
```

Type-check the project:

```bash
bun run typecheck
```

`typecheck` is the only build step — `tsconfig.json` sets `noEmit`, and Bun
executes the TypeScript sources directly.

## Testing

Bun's built-in runner; no extra dependencies. `bunfig.toml` preloads
`src/tests/preload.ts`, which points `DATABASE_URL` at a separate database named
after the dev one plus `-test` (override with `TEST_DATABASE_URL`) and refuses to
run against any database whose name does not end in `-test`.

```bash
bun run test:db:setup     # once: create project-management-sass-test and push the schema
bun run test              # unit, then integration
bun run test:unit         # no database needed
bun run test:integration  # real app on a random port + the test database
```

- `src/tests/unit/` — utils, schemas, middleware, and `projects.service` authorization
  with the repository mocked (`mock.module` is process-wide, which is why unit and
  integration run as separate `bun test` invocations).
- `src/tests/integration/` — every route through HTTP; `beforeEach` truncates all tables.
  Helpers: `startServer()`, a cookie-jar `TestClient`, and factories
  (`registerAndLogin`, `createProject`, `addMember`, `createTask`).
- `bun run test:serve` / `test:db:reset` run the server on the test DB for the
  frontend's Playwright suite.
- bcrypt uses 4 rounds when `NODE_ENV=test` (12 otherwise) to keep the suite fast.
- `test:db:setup` never force-resets: tests clear their own rows. If a schema change
  would lose data, drop the `-test` database by hand and rerun it.

## Prisma Workflow

`prisma/schema.prisma` is **introspected from the database**, not authored by
hand. There is no `prisma/migrations/` directory; schema changes are applied to
PostgreSQL with dbmate, then pulled back into the schema file.

```bash
bunx prisma db pull    # re-introspect the database into prisma/schema.prisma
bunx prisma generate   # regenerate the client into src/generated/prisma
```

The generated client is committed and imported by relative path
(`../generated/prisma/client`), **not** from `@prisma/client`. Regenerate and
commit it whenever the schema changes.

## API Responses

Every response uses the same envelope, produced by `ApiResponse` on success and
`ApiError` on failure:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Projects fetched successfully",
  "data": {},
  "errors": []
}
```

`errorMiddleware` resolves errors in this order:

1. Prisma known-request errors via `handlePrismaError`
   (`P2002` → 409, `P2003` → 409, `P2025` → 404)
2. `ApiError` instances thrown by services and controllers
3. Anything else → generic 500

## API Endpoints

All routes are mounted under `/api/v1`.

### Authentication

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
GET  /api/v1/auth/google?next=/path   # browser navigation → 302 to Google
GET  /api/v1/auth/google/callback     # Google → 302 to FRONTEND_URL + next
```

### Users

User profile information is returned together with the user. There is no
separate profile API.

```http
GET    /api/v1/users
GET    /api/v1/users/:id
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id
```

### Projects

```http
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:id
PATCH  /api/v1/projects/:id
DELETE /api/v1/projects/:id
```

### Project Members

```http
GET    /api/v1/projects/:projectId/members
GET    /api/v1/projects/:projectId/members/:userId
POST   /api/v1/projects/:projectId/members
PUT    /api/v1/projects/:projectId/members/:userId
DELETE /api/v1/projects/:projectId/members/:userId
```

### Tasks

Tasks are addressed through their project. The route parameter is spelled
`:tasksId`.

```http
GET    /api/v1/projects/:projectId/tasks
GET    /api/v1/projects/:projectId/tasks/:tasksId
POST   /api/v1/projects/:projectId/tasks
PUT    /api/v1/projects/:projectId/tasks/:tasksId
DELETE /api/v1/projects/:projectId/tasks/:tasksId
```

## Authentication Flow

Register:

```text
Validate input (Zod)
   ↓
Reject duplicate email (409)
   ↓
Hash password with bcrypt (12 salt rounds)
   ↓
Create user
```

Login:

```text
Email + Password
       ↓
Find user by email
       ↓
Compare password hash
       ↓
Sign JWT { sub: userId, type: "access" }, 1 day
       ↓
Set httpOnly cookie "accessToken"
```

Google (OAuth 2.0 Authorization Code + PKCE, `google-auth-library`):

```text
GET /auth/google?next=/projects
       ↓
Random state + PKCE verifier → signed JWT in cookie "oauth_google"
(httpOnly, SameSite=Lax, 10 min, path /api/v1/auth/google)
       ↓
302 → accounts.google.com (scope openid email profile, S256 challenge)
       ↓
GET /auth/google/callback?code&state   (cookie cleared; single use)
       ↓
state must match cookie → exchange code + verifier + client secret
       ↓
Verify ID token (audience = GOOGLE_CLIENT_ID)
       ↓
User by google_id → else link by email (only if email_verified) → else create
       ↓
Set httpOnly cookie "accessToken" → 302 to FRONTEND_URL + next
```

Failures redirect to `FRONTEND_URL/login?error=<code>` instead of returning
JSON, because the browser navigated there.

The frontend opens the flow in a popup with `GET /auth/google?mode=popup`. The
flag is kept in the state cookie, and the callback then redirects the popup to
`FRONTEND_URL/auth/google/done?next=…` (or `?error=<code>`). That page reports
the result to the original tab over a `BroadcastChannel` and closes itself. If
the browser blocks the popup, the button falls back to the full-page flow. Google-only users have a null
`password_hash`; password login answers them with `INVALID_CREDENTIALS`.

Protected request:

```text
Cookie: accessToken=<JWT>
                ↓
        auth.middleware.ts
                ↓
           Verify JWT
                ↓
            req.userId
```

The token travels in an httpOnly cookie, not an `Authorization` header. CORS is
configured for `http://localhost:5173` with `credentials: true`, so the frontend
must send requests with credentials enabled.

## Authorization Model

A project has both an `owner_id` column and rows in `project_members`. The owner
is identified by `projects.owner_id` and is normally **not** present in
`project_members`, so permission checks must consider both.

Rules currently enforced:

- Only the owner can update or delete a project.
- Owner and admins can add members and change member roles.
- The owner's membership cannot be modified or removed.
- A member can remove themselves from a project.
- Any member can read project tasks.
- A member can update a task they are assigned to; only owner and admins can
  change `assigned_to` or `priority`.
- Only owner and admins can delete tasks.

Task handlers use the `requireProjectRole(projectId, userId, allowedRoles)`
helper in `src/utils/project-member.authorization.ts`. Older project and member
handlers still inline their own owner/member checks; new code should use the
helper.

## API Design Rule

Use nested routes when working with resources belonging to a project:

```text
/api/v1/projects/:projectId/tasks
/api/v1/projects/:projectId/members
```

Use direct resource routes when addressing a specific resource:

```text
/api/v1/projects/:projectId
/api/v1/users/:id
```

## Development Priority

Build one complete vertical slice at a time:

```text
Database
   ↓
Repository
   ↓
Service
   ↓
Controller
   ↓
Route
   ↓
API Test
```

Do not add advanced features until the core modules are stable.

## Status

Completed:

- Users CRUD with profile
- Authentication (register, login, logout, current user, JWT cookie, Google OAuth 2.0)
- Projects CRUD
- Project members CRUD
- Project tasks CRUD
- Zod validation, global error handling, consistent API responses
- Test suite: unit + integration (`bun run test`)

Known gaps:

- No `/health` endpoint.
- No linter or formatter is configured.

## Future Features

Intentionally outside the initial MVP:

- Comments
- Notifications
- File attachments
- Activity logs
- Real-time updates / WebSockets
- Redis
- Background jobs
- Email notifications
- Advanced analytics
