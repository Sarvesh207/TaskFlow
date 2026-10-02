# TaskFlow — Project Management App

> Turn ideas into real progress.

TaskFlow is a full-stack project management application. Users sign up, create
projects, invite teammates with roles (**owner**, **admin**, **member**), and
track work as tasks with status, priority, due date and assignee.

The repository is a monorepo with two apps:

| Folder                   | What it is                                   | Stack                                                     |
| ------------------------ | -------------------------------------------- | --------------------------------------------------------- |
| [`backend/`](backend/)   | REST API (`/api/v1`)                          | Bun · TypeScript · Express 5 · PostgreSQL · Prisma 7 · Zod |
| [`frontend/`](frontend/) | TaskFlow single-page web app                  | React 19 · Vite 8 · Tailwind CSS v4 · TanStack Query       |

---

## Features

- **Authentication** — register, login, logout, and "Continue with Google" (OAuth 2.0
  Authorization Code + PKCE); JWT stored in an httpOnly cookie
- **Projects** — create, edit, archive/complete and delete projects
- **Team members** — add users to a project, change roles, remove members, leave a project
- **Tasks** — create, assign, prioritise (1–5), set due dates and move through
  `pending → in_progress → completed / cancelled`
- **My Tasks** — every task assigned to you across all projects, with filters
- **Users & profiles** — user directory, public profiles, editable own profile (bio, phone, avatar)
- **Role-based permissions** — enforced by the API, mirrored in the UI
- **Dashboard** with project and task stats
- **Command palette** (⌘K / Ctrl+K), light / dark / system theme, responsive layout
- **Consistent error handling** — one JSON error envelope, surfaced as form field errors and toasts

---

## System Architecture

```text
  Browser
  ┌─────────────────────────────────────────────────┐
  │  React 19 SPA (Vite)      http://localhost:5173 │
  │  React Router → Pages → TanStack Query hooks    │
  └────────────────────────┬────────────────────────┘
                           │ fetch /api/v1/*  (credentials: include)
                           │ Vite dev proxy → same origin, cookie works
                           ▼
  ┌─────────────────────────────────────────────────┐
  │  Express 5 API on Bun     http://localhost:3000 │
  │  CORS · request-id · JSON · cookie-parser       │
  │  Routes → Controllers → Services → Repositories │
  └────────────────────────┬────────────────────────┘
                           │ Prisma Client (pg adapter)
                           ▼
  ┌─────────────────────────────────────────────────┐
  │  PostgreSQL                                     │
  │  users · user_profiles · projects ·             │
  │  project_members · tasks                        │
  └─────────────────────────────────────────────────┘
```

In development the Vite server proxies `/api` to the backend, so the browser
talks to a single origin and the httpOnly `accessToken` cookie is sent
automatically.

---

## Backend Architecture

A **layered architecture** where each layer has one job:

```text
HTTP Request
     ↓
   Route          → defines endpoints, attaches requireAuth
     ↓
 Controller       → validates params/body with Zod, calls the service
     ↓
   Service        → business logic + authorization, throws ApiError
     ↓
 Repository       → the only layer that touches Prisma (explicit selects)
     ↓
   Prisma  →  PostgreSQL
```

Errors from any layer bubble to one **global error middleware** (Express 5
forwards rejected async handlers automatically — no `asyncHandler` wrappers).

### Folder structure

```text
backend/
├── prisma/schema.prisma          # introspected from the database
├── src/
│   ├── app.ts                    # Express app, middleware, routers
│   ├── server.ts                 # connect DB, start server
│   ├── db/prisma.ts              # shared PrismaClient
│   ├── generated/prisma/         # generated Prisma client (committed)
│   ├── middleware/
│   │   ├── auth.middleware.ts    # requireAuth → req.userId
│   │   ├── request-id.middleware.ts
│   │   ├── validate.middleware.ts
│   │   └── error-middleware.ts   # global error + JSON 404
│   ├── modules/
│   │   ├── auth/                 # register, login, logout, me
│   │   ├── users/                # users + profile
│   │   └── projects/             # projects, members and tasks
│   │       ├── projects.routes.ts
│   │       ├── projects.controller.ts
│   │       ├── projects.service.ts
│   │       ├── projects.repository.ts
│   │       ├── project.schema.ts
│   │       └── projects.types.ts
│   ├── utils/                    # ApiError, ApiResponse, jwt, password,
│   │                             # prisma/zod error mapping, role checks
│   ├── types/                    # Express augmentation, shared schemas
│   └── tests/
│       ├── unit/                 # utils, schemas, service authorization
│       └── integration/          # every route over real HTTP + test DB
└── package.json
```

### Database schema

```text
users ──1:1── user_profiles
  │
  ├──1:N── projects (owner_id)
  │           │
  │           ├──N:M── project_members (role: owner | admin | member)
  │           │
  │           └──1:N── tasks
  │                      │
  └──────────1:N─────────┘ (assigned_to)
```

| Enum             | Values                                          |
| ---------------- | ----------------------------------------------- |
| `project_status` | `active`, `completed`, `archived`               |
| `task_status`    | `pending`, `in_progress`, `completed`, `cancelled` |
| `member_role`    | `owner`, `admin`, `member`                      |

Migrations are written in SQL and applied with **dbmate**; the Prisma schema is
then pulled from the database (`prisma db pull`) and the client regenerated.

### Authentication flow

```text
Login: email + password → bcrypt compare → sign JWT { sub: userId } (1 day)
       → Set-Cookie: accessToken (httpOnly)

Google: GET /auth/google → state + PKCE verifier in a signed SameSite=Lax cookie
        → 302 to Google consent → Google 302s to /auth/google/callback?code&state
        → check state, exchange code + verifier (+ client secret) for an ID token
        → verify ID token → find user by google_id, else link by verified email,
          else create → Set-Cookie: accessToken → 302 to ?next=
        (the button opens this in a popup with ?mode=popup; the popup lands on
         /auth/google/done, reports to the opening tab and closes)

Protected request: Cookie accessToken → requireAuth verifies JWT → req.userId
```

### Authorization rules

| Action                               | Owner | Admin | Member            |
| ------------------------------------ | :---: | :---: | :---------------: |
| Update / delete project              |  ✅   |  ❌   |        ❌         |
| Add members, change roles            |  ✅   |  ✅   |        ❌         |
| Remove a member                      |  ✅   |  ✅   | only themselves   |
| View project and tasks               |  ✅   |  ✅   |        ✅         |
| Create task                          |  ✅   |  ✅   |        ✅         |
| Update task                          |  ✅   |  ✅   | if assigned to them |
| Change assignee / priority           |  ✅   |  ✅   |        ❌         |
| Delete task                          |  ✅   |  ✅   |        ❌         |

### API response envelope

Every response — success or failure — has the same shape:

```jsonc
{
  "success": false,
  "statusCode": 422,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed for 1 field: title",
  "data": null,
  "errors": [{ "field": "title", "code": "too_small", "message": "Title must be at least 2 characters" }],
  "fieldErrors": { "title": ["Title must be at least 2 characters"] },
  "requestId": "b18e3181-c53e-467a-95d8-0a0276173ed5"
}
```

See [`backend/ERRORS.md`](backend/ERRORS.md) for the full list of error codes.

### API endpoints

All routes are prefixed with `/api/v1`.

| Method | Endpoint                                   | Description              |
| ------ | ------------------------------------------ | ------------------------ |
| POST   | `/auth/register`                           | Create an account        |
| POST   | `/auth/login`                              | Log in (sets cookie)     |
| POST   | `/auth/logout`                             | Log out                  |
| GET    | `/auth/me`                                 | Current user             |
| GET    | `/auth/google?next=`                       | Start Google sign-in     |
| GET    | `/auth/google/callback`                    | Google OAuth callback    |
| GET    | `/users`                                   | List users               |
| GET    | `/users/:id`                               | User with profile        |
| PATCH  | `/users/:id`                               | Update user / profile    |
| DELETE | `/users/:id`                               | Delete user              |
| GET    | `/projects`                                | Projects I own or belong to |
| POST   | `/projects`                                | Create project           |
| GET    | `/projects/:id`                            | Project details          |
| PATCH  | `/projects/:id`                            | Update project           |
| DELETE | `/projects/:id`                            | Delete project           |
| GET    | `/projects/:projectId/members`             | List members             |
| GET    | `/projects/:projectId/members/:userId`     | Member details           |
| POST   | `/projects/:projectId/members`             | Add member               |
| PUT    | `/projects/:projectId/members/:userId`     | Change role              |
| DELETE | `/projects/:projectId/members/:userId`     | Remove member            |
| GET    | `/projects/:projectId/tasks`               | List tasks               |
| GET    | `/projects/:projectId/tasks/:tasksId`      | Task details             |
| POST   | `/projects/:projectId/tasks`               | Create task              |
| PUT    | `/projects/:projectId/tasks/:tasksId`      | Update task              |
| DELETE | `/projects/:projectId/tasks/:tasksId`      | Delete task              |

---

## Frontend Architecture

A client-rendered React SPA organised by **pages → features → shared lib/components**.

```text
main.tsx
  └── QueryClientProvider (global error handling, session expiry)
        └── RouterProvider
              ├── /login, /register        (public, redirect if signed in)
              └── AppLayout                (Sidebar with search · phone header · Command palette)
                    ├── /                  Dashboard
                    ├── /projects          Projects list, /projects/new
                    ├── /projects/:id      ProjectLayout
                    │     ├── overview · tasks · tasks/new · tasks/:taskId(/edit)
                    │     └── members · settings
                    ├── /my-tasks
                    ├── /users, /users/:userId
                    └── /profile
```

### Data flow

```text
Page component
   ↓ calls
Feature hook (e.g. useProjects, useCreateTask)   ← features/*/queries.ts
   ↓ TanStack Query (cache, dedupe, invalidation)
lib/api.ts  → fetch('/api/v1/...', { credentials: 'include' })
   ↓ non-2xx → ApiRequestError { status, code, message, fieldErrors }
   ↓
Forms bind fieldErrors to inputs · other errors become toasts
401/expired session → user cache cleared → redirect to /login
```

### Folder structure

```text
frontend/
├── src/
│   ├── main.tsx                # providers, toaster, router
│   ├── router.tsx              # route tree, lazy-loaded pages
│   ├── router-preload.ts       # prefetch page chunks on hover/idle
│   ├── index.css               # Tailwind v4 theme tokens (light + dark)
│   ├── pages/                  # every route-level page
│   │   ├── auth/  projects/  tasks/  users/
│   │   ├── DashboardPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── features/               # domain logic per feature
│   │   ├── auth/               # RequireAuth, session, me query
│   │   ├── projects/           # queries, ProjectForm, project context
│   │   ├── members/            # queries, add/update-role modals
│   │   ├── tasks/              # queries, filters
│   │   ├── users/              # queries
│   │   └── theme/              # light / dark / system switcher
│   ├── components/
│   │   ├── layout/             # AppLayout, Sidebar, MobileHeader, CommandPalette
│   │   └── ui/                 # Button, Modal, Table, Tabs, Pagination, …
│   ├── lib/                    # api client, query client, permissions,
│   │                           # formatting, form helpers
│   ├── hooks/                  # usePagination
│   ├── types/api.ts            # API response types
│   └── test/                   # Vitest setup + MSW mock API
├── e2e/                        # Playwright end-to-end specs
└── vite.config.ts              # dev proxy, aliases, Vitest config
```

### Key design decisions

- **Server state lives in TanStack Query** — no global store; mutations
  invalidate the affected query keys.
- **Permissions mirrored on the client** (`lib/permissions.ts`) — actions a role
  can't perform are hidden, but the API always has the final say.
- **Forms** use `react-hook-form` + `zod` schemas that match the backend rules.
- **Route-level code splitting** with `React.lazy` plus preloading on hover.
- **Accessible UI** built on Radix primitives, `cmdk` and `motion`, respecting
  reduced-motion preferences.

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.x
- PostgreSQL 15+
- [dbmate](https://github.com/amacneil/dbmate) (for applying SQL migrations)

### 1. Clone

```bash
git clone https://github.com/Sarvesh207/project-management.git
cd project-management
```

### 2. Backend

```bash
cd backend
bun install
```

Create `backend/.env`:

```env
PORT=3000
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/project-management-sass?sslmode=disable
JWT_SECRET=your_secret
# Optional: Google sign-in — see backend/.env.example
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:5173/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

For Google sign-in, create a **Web application** OAuth client in Google Cloud
Console (APIs & Services → Credentials) and add `GOOGLE_REDIRECT_URI` as an
authorized redirect URI.

Create the database, then apply the schema (needs [dbmate](https://github.com/amacneil/dbmate)):

```bash
bun run db:migrate   # applies backend/db/migrations to DATABASE_URL
# optional demo data for a LOCAL database only:
# psql "$DATABASE_URL" -f db/seeds/dev_seed.sql
```

```bash
bun run dev          # http://localhost:3000
```

### 3. Frontend

```bash
cd frontend
bun install
cp .env.example .env # VITE_API_URL=/api/v1 (proxied to :3000)
bun run dev          # http://localhost:5173
```

Open <http://localhost:5173>, create an account and start a project.

---

## Testing

### Backend (Bun test runner)

```bash
cd backend
bun run test:db:setup     # once: creates the "-test" database
bun run test              # unit + integration
bun run test:unit
bun run test:integration
```

### Frontend

```bash
cd frontend
bun run test              # Vitest + Testing Library + MSW
bun run test:e2e          # Playwright; starts the backend on the test DB and Vite
bun run lint              # oxlint
bun run build             # type-check + production build
```

---

## Deployment

Live setup: the frontend on **Vercel**, the API on **Render** (native Bun runtime,
no Docker), PostgreSQL on **Neon**, served from one domain, e.g.
`taskflow.sarveshgaynar.in`.

```text
Browser ──► taskflow.sarveshgaynar.in  (Vercel)
              ├─ /…          → the SPA (index.html fallback)
              └─ /api/v1/*   → rewrite → https://taskflow-api.onrender.com  (Render, Bun)
                                                   └─► Neon Postgres (SSL)
```

The browser only ever talks to the frontend's own domain, exactly like the Vite
dev proxy. So the login cookie (`SameSite=Strict`) is first-party, no CORS is
involved, and the Google redirect URI is on that same domain.

Config lives in the repo: [`render.yaml`](render.yaml) (Render Blueprint),
[`frontend/vercel.json`](frontend/vercel.json) (rewrites, SPA fallback, headers),
`backend/.bun-version` (pins Bun) and `backend/db/migrations/` (the schema).

### One-time setup

1. **Neon** — create a project near your Render region. Copy two connection
   strings (both need `sslmode=require`): the **pooled** one for the app and the
   **direct** one for migrations.
2. **Apply the schema** (from your machine, needs [dbmate](https://github.com/amacneil/dbmate)):

   ```bash
   cd backend
   DATABASE_URL="<neon direct url>" bun run db:migrate         # bash
   # PowerShell:  $env:DATABASE_URL="<neon direct url>"; bun run db:migrate
   ```

   Only `db/migrations/` is applied. `db/seeds/dev_seed.sql` is demo data for
   local databases and must never be loaded into production.
3. **Render** — New → **Blueprint** → pick this repo (reads `render.yaml`), or
   New → Web Service with: runtime **Node**, root directory `backend`, build
   `bun install --frozen-lockfile --production`, start `bun src/server.ts`,
   health check `/api/v1/health`. Then set the environment variables below.
   If Render gives the service a URL other than `taskflow-api.onrender.com`,
   update the `/api` rewrite in `frontend/vercel.json`.
4. **Vercel** — import the repo, **Root Directory `frontend`**, framework Vite.
   Do **not** set `VITE_API_URL`: production uses the default `/api/v1`, which the
   rewrite forwards to Render. Add the domain under Settings → Domains.
5. **DNS** — at the DNS host of your domain add `CNAME taskflow → cname.vercel-dns.com`
   (Vercel shows the exact target). HTTPS is issued automatically.
6. **Google Cloud** — on the OAuth client add the authorized redirect URI
   `https://taskflow.sarveshgaynar.in/api/v1/auth/google/callback`, and publish
   the consent screen (Audience → Publish app) so it is not limited to test users.

### Environment variables (Render)

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` — secure cookie, no stack traces in error responses |
| `DATABASE_URL` | Neon **pooled** connection string |
| `JWT_SECRET` | generated by Render (`generateValue` in `render.yaml`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | from the Google OAuth client |
| `GOOGLE_REDIRECT_URI` | `https://taskflow.sarveshgaynar.in/api/v1/auth/google/callback` |
| `FRONTEND_URL` | `https://taskflow.sarveshgaynar.in` |
| `CORS_ORIGIN` | `https://taskflow.sarveshgaynar.in` (comma-separated for several) |
| `TRUST_PROXY_HOPS` | `2` — Vercel and Render's load balancer sit in front of the app |
| `AUTH_RATE_LIMIT_MAX` | optional; sign-in/sign-up requests per minute per IP (default `10`) |

`TRUST_PROXY_HOPS` must match the real number of proxies: too low and every
visitor shares one rate-limit bucket, too high and clients can fake their IP.
Check it after deploying (see below).

### After deploying: smoke test

- `https://<site>/api/v1/health` returns 200 with `"database": "up"`.
- Register and sign in; the `accessToken` cookie is `HttpOnly; Secure; SameSite=Strict`.
- Create, edit and delete a project and a task. Reload a deep link such as `/projects`.
- **Continue with Google** opens the popup, signs in, and a second sign-in reuses the account.
- Rate limit: 11 wrong sign-ins in a minute return `429`. A phone on mobile data
  (a different IP) must still be able to sign in — if it is blocked too,
  `TRUST_PROXY_HOPS` is too low.

### Free-tier notes

Render's free web service sleeps after about 15 minutes without traffic, so the
first request afterwards takes 30–60 s. An uptime monitor pinging
`/api/v1/health` every 10 minutes keeps it awake. The rate limiter keeps its
counters in memory, which is fine for one instance; use a shared store if the
API is ever scaled to several.

### Rollback

- **Frontend:** Vercel → Deployments → promote the previous deployment.
- **Backend:** Render → redeploy the previous commit.
- **Database:** `bun run db:rollback` undoes the last migration (this drops the
  Google columns, so only before real Google users exist).

---

## Scripts Reference

| App      | Command               | Purpose                              |
| -------- | --------------------- | ------------------------------------ |
| backend  | `bun run dev`         | API with watch mode                  |
| backend  | `bun run start`       | API without watch                    |
| backend  | `bun run typecheck`   | TypeScript check                     |
| backend  | `bun run db:migrate`  | Apply `db/migrations` (dbmate)       |
| backend  | `bun run db:rollback` | Undo the last migration              |
| frontend | `bun run dev`         | Vite dev server                      |
| frontend | `bun run build`       | Production build to `dist/`          |
| frontend | `bun run preview`     | Serve the production build           |

---

## Roadmap

- Comments and activity log on tasks
- Notifications and email
- File attachments
- Real-time updates (WebSockets)
- `/health` endpoint and deployment config

---

## More Documentation

- [`backend/README.md`](backend/README.md) — backend details and conventions
- [`backend/ERRORS.md`](backend/ERRORS.md) — API error contract
- [`frontend/SPECS.md`](frontend/SPECS.md) — frontend specification and design system
