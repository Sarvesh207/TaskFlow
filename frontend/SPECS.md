# TaskFlow Frontend — Specification & Implementation Plan

> "Turn ideas into real progress."

The web client for the Project Management API in `../backend`. This document
defines the scope, architecture, design system and screen-by-screen behaviour,
and records every place where the mockups ask for something the API does not
provide yet.

---

## 1. Goals

- Implement the TaskFlow mockups (dark mode) against the **existing** API.
- Every screen reads and writes real data — no mock data, no fake features.
- Respect the backend authorization model in the UI: hide or disable actions a
  user is not allowed to perform, but always handle a `403` gracefully anyway.
- Surface the API's error contract (`code`, `message`, `fieldErrors`) directly
  in forms and toasts.

### Non-goals (this iteration)

- Light theme (mockups are dark only; tokens are structured to add it later).
- Features with no backend endpoint — see [§9 API gaps](#9-api-gaps).
- SSR. This is a client-rendered SPA.

---

## 2. Tech stack

| Concern         | Choice                                   | Why |
|-----------------|------------------------------------------|-----|
| Build           | **Vite 8** + `@vitejs/plugin-react`       | Requested; fast dev server, proxy for the API |
| UI              | **React 19** + TypeScript                | Requested |
| Styling         | **Tailwind CSS v4** via `@tailwindcss/vite` | Requested; CSS-first `@theme` tokens |
| Routing         | `react-router` (data router)             | Nested layouts, loaders not required |
| Server state    | `@tanstack/react-query`                  | Caching, dedup, invalidation after mutations |
| Forms           | `react-hook-form` + `zod` + `@hookform/resolvers` | Schemas mirror backend Zod rules |
| Overlays        | `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu` | Accessible modals and row menus |
| Toasts          | `sonner`                                 | Small, accessible |
| Icons           | `lucide-react`                           | Matches the outline icon style in the mockups |
| Font            | `@fontsource-variable/inter` (self-hosted) | Matches mockups; no external font request |
| Package manager | **Bun** (same as backend)                | |

---

## 3. Design system

Modelled on **takeuforward.org**: its colour tokens were read from the live
site's CSS in both themes and reused here, along with its floating-panel layout
and Geist typeface.

### 3.1 Theme tokens (`src/index.css`)

Light is `:root`, dark is `.dark` on `<html>`; `@theme inline` maps them to
Tailwind utilities (`bg-bg`, `text-muted`, `bg-hover`, …), so every component is
written once. Hard-coded colours are only used as explicit light/dark pairs
(`text-emerald-600 dark:text-emerald-400`).

| Token | Light | Dark | Use |
|---|---|---|---|
| `canvas` | `#f4f4f6` | `#070709` | App background behind the panels |
| `bg` | `#fcfcfd` | `#0f0f10` | Sidebar, top bar, content panel |
| `surface` | `#ffffff` | `#131316` | Cards, menus, dialogs |
| `surface-2` / `-3` | `#f7f7f8` / `#eff2f6` | `#1a1a1e` / `#232329` | Raised controls, table header |
| `border` / `-soft` / `-strong` | `#e3e8ef` / `#e7ebf1` / `#d3dae5` | `#24272e` / `#1e2128` / `#343842` | Hairlines |
| `fg` / `fg-2` | `#252a3c` / `#556277` | `#fcfcfd` / `#c1c4cc` | Text |
| `muted` / `subtle` | `#64748b` / `#8a94a6` | `#8d93a1` / `#646b78` | Secondary / tertiary text |
| `primary` (+ hover, pressed) | `#327cf6` | `#327cf6` | Buttons, links, active icons |
| `primary-soft` | `#e8f0ff` | `#111827` | Active nav pill, info notes |
| `hover` / `hover-strong` | ink at 4.5% / 7.5% | white at 4.5% / 7.5% | Hover overlays |

**Theme switching** — `src/features/theme/theme.ts` (Light / Dark / System,
default Dark, key `taskflow.theme` in localStorage, System follows the OS live).
`index.html` applies the saved theme inline before first paint. UI: the
**Settings** popover at the bottom of the sidebar (segmented radio group) and a
one-click sun/moon toggle in the top bar.

**Layout** — sidebar, top bar and page are separate rounded (`rounded-2xl`),
bordered panels on the canvas with 12px gaps; the page scrolls inside its panel.
The sidebar has collapsible sections (Workspace / Manage / Projects shortcuts),
a collapse-to-rail button (persisted), Settings and the user card.

Semantic badge palettes (takeuforward-style rounded-rectangle chips):

| Meaning                              | Colour  |
|--------------------------------------|---------|
| Active / Completed / Low             | emerald |
| In Progress / Admin                  | blue    |
| To Do / Member / Archived            | slate   |
| Medium                               | amber   |
| High / Overdue / Danger              | red     |
| Owner                                | violet  |

### 3.2 Typography & spacing

- **Geist Variable** (as on takeuforward.org), Geist Mono with tabular figures for numbers.
- Page title 26px semibold, tight tracking; body 13–14px; table headers 11.5px uppercase.
- Radius: `rounded-lg` (inputs, buttons), `rounded-xl` (cards), `rounded-2xl` (panels, dialogs).
- Sidebar 252px (68px collapsed); content max-width 1320px.
- Motion follows `review-animations` (Emil Kowalski): ease-out only, UI under 300ms,
  exits faster than entrances, nothing animates on keyboard-triggered actions,
  reduced-motion respected.

### 3.3 Logo

`src/components/brand/Logo.tsx` — inline SVG of the "T" mark (tilted pill +
rounded drop, blue→indigo gradient) plus the wordmark "Task**Flow**" where
"Flow" uses the brand gradient. `public/favicon.svg` is the mark on a rounded
blue tile, matching the favicon sheet.

### 3.4 Core components (`src/components/ui/`)

`Button` (primary / secondary / ghost / danger, sizes sm/md), `Input`,
`Textarea`, `Select`, `Field` (label + control + error), `Badge`, `Avatar`
(image or initials with deterministic colour), `AvatarStack`, `Card`,
`StatCard`, `Tabs` (router-aware underline tabs), `Table` primitives,
`Pagination`, `Modal` (Radix Dialog), `RowMenu` (Radix Dropdown),
`EmptyState`, `Skeleton`, `Spinner`, `ConfirmDialog`, `SearchInput`.

---

## 4. Architecture

```
frontend/
├── public/favicon.svg
├── src/
│   ├── main.tsx              # QueryClient, Router, Toaster
│   ├── router.tsx            # route tree
│   ├── index.css             # Tailwind v4 + @theme tokens
│   ├── lib/
│   │   ├── api.ts            # fetch wrapper → ApiRequestError
│   │   ├── format.ts         # dates, initials
│   │   ├── domain.ts         # status/priority/role labels + tones
│   │   └── permissions.ts    # role → capability matrix (mirrors backend)
│   ├── types/api.ts          # response DTOs
│   ├── pages/                # EVERY route-level screen lives here
│   │   ├── DashboardPage.tsx, NotFoundPage.tsx
│   │   ├── auth/             # LoginPage, RegisterPage
│   │   ├── projects/         # ProjectsPage, CreateProjectPage, ProjectLayout,
│   │   │                     # ProjectOverview/Tasks/Members/SettingsPage
│   │   ├── tasks/            # MyTasksPage, TaskDetailPage, TaskFormPage
│   │   └── users/            # UsersPage, UserProfilePage, MyProfilePage
│   ├── features/             # non-page building blocks, by domain
│   │   ├── auth/             # queries (me/login/logout), RequireAuth, AuthLayout
│   │   ├── projects/         # queries, ProjectForm, project-context
│   │   ├── members/          # queries, Add/UpdateRole/MemberDetails modals
│   │   ├── tasks/            # queries, filters
│   │   └── users/            # queries, user directory
│   ├── components/
│   │   ├── layout/           # AppLayout, Sidebar, Topbar
│   │   ├── brand/            # Logo
│   │   └── ui/               # design-system primitives
│   └── hooks/                # useDebouncedValue, usePagination
└── vite.config.ts            # tailwind plugin, @ alias, /api proxy → :3000
```

### 4.1 API client

No axios: `src/lib/api.ts` is a ~100-line wrapper over native `fetch`, and
TanStack Query provides caching, retries and global error handling on top.
Every request goes through this one module, so swapping in axios later is a
single-file change.

- Base URL `import.meta.env.VITE_API_URL ?? "/api/v1"`. In dev, Vite proxies
  `/api` → `http://localhost:3000`, so the `accessToken` cookie is same-origin.
- Every request uses `credentials: "include"`.
- Success: return `body.data`.
- Failure: throw `ApiRequestError { status, code, message, fieldErrors, requestId }`.
- Network failure → `ApiRequestError { status: 0, code: "NETWORK_ERROR" }`.

### 4.2 Auth flow

- Session source of truth: `GET /auth/me` via `useCurrentUser()` (React Query,
  `retry: false`). `401` → `null` user.
- `<RequireAuth>` wraps the app shell: loading → full-screen spinner; no user →
  redirect to `/login?next=<path>`.
- A global `QueryCache`/`MutationCache` `onError` handler: on `401` with
  `TOKEN_EXPIRED | INVALID_TOKEN | UNAUTHORIZED`, clear the cache and redirect
  to `/login` (toast "Session expired" for `TOKEN_EXPIRED`).
- Login → `POST /auth/login` → invalidate `me` → navigate to `next` or `/`.
- Logout → `POST /auth/logout` → `queryClient.clear()` → `/login`.

### 4.3 Server-state conventions

Query keys:

```
["me"]
["users"]                       ["users", id]
["projects"]                    ["projects", id]
["projects", id, "members"]
["projects", id, "tasks"]       ["projects", id, "tasks", taskId]
```

- Mutations invalidate the narrowest affected keys.
- `GET /users` is cached once and used as a **directory** (`useUserDirectory`)
  to resolve any user id → name / email / avatar (tasks only return
  `assigned_to`, and project owners are not in `project_members`).
- Cross-project views (Dashboard, My Tasks) fan out with `useQueries` over the
  project list — requests run in parallel, not as a waterfall.

### 4.4 Permissions (mirrors backend services)

`getProjectRole(project, members, userId)` → `"owner" | "admin" | "member" | null`
(owner = `project.owner_id`, others from `project_members`).

| Capability                 | Owner | Admin | Member |
|----------------------------|:-----:|:-----:|:------:|
| View project & tasks       | ✓ | ✓ | ✓ |
| Edit / delete project      | ✓ | ✗ | ✗ |
| Add members / change roles | ✓ | ✓ | ✗ |
| Remove member              | ✓ | ✓ | self only |
| Create tasks               | ✓ | ✓ | ✓ |
| Edit any task              | ✓ | ✓ | ✗ (own assigned only) |
| Change assignee / priority | ✓ | ✓ | ✗ (may assign a **new** task to self) |
| Delete tasks               | ✓ | ✓ | ✗ |

This table is also rendered on the project Settings tab (mockup 1-5).

### 4.5 Domain mapping

| API                          | UI label |
|------------------------------|----------|
| task `pending`               | To Do |
| task `in_progress`           | In Progress |
| task `completed`             | Completed |
| task `cancelled`             | Cancelled (display only; API rejects it on write) |
| priority `1–2` / `3` / `4–5` | Low / Medium / High |
| form priority Low/Med/High   | writes `1` / `3` / `5` |
| project `active/completed/archived` | Active / Completed / Archived |
| overdue                      | `due_date < today` and status ≠ completed |

`due_date` is a SQL `DATE` serialized as `…T00:00:00.000Z`; it is formatted in
UTC to avoid off-by-one days and sent back as `YYYY-MM-DD`.

---

## 5. Routes

| Path                                   | Screen | Mockup |
|----------------------------------------|--------|--------|
| `/login`                               | Login | 3-1 |
| `/register`                            | Sign up | (Login variant) |
| `/`                                    | Dashboard | 3-2 |
| `/projects`                            | Projects list | 3-3 |
| `/projects/new`                        | Create project | 3-4 |
| `/projects/:projectId`                 | Project overview | 3-5 |
| `/projects/:projectId/tasks`           | Project tasks | 3-9 |
| `/projects/:projectId/tasks/new`       | Create task | 3-10 |
| `/projects/:projectId/tasks/:taskId`   | Task details | 3-11 |
| `/projects/:projectId/tasks/:taskId/edit` | Edit task | 3-10 |
| `/projects/:projectId/members`         | Members (+ add / role / details modals) | 1-3, 1-4, 1-6, 3-6/7/8 |
| `/projects/:projectId/settings`        | Edit project, permissions, danger zone | 1-5 |
| `/my-tasks`                            | My tasks | 3-12 |
| `/users`                               | Users directory | 1-1 |
| `/users/:userId`                       | User profile (Overview / Projects) | 1-8, 1-9 |
| `/profile`                             | My profile | 1-7 |
| `*`                                    | 404 | — |

The project pages share a `ProjectLayout` (breadcrumb, avatar tile, name,
status badge, "…" menu, tab bar) that loads the project + members once.

---

## 6. Screens

### 6.1 Login / Register
- Split layout: form left, hero right (gradient mountain illustration in CSS,
  "Turn ideas into real progress." + quote). Hero hidden below `lg`.
- Login: email, password (show/hide). Sign up: full name, email, password with
  the backend rules shown as a live checklist (8+ chars, upper, lower, number,
  symbol). Server `fieldErrors` bind to fields; `INVALID_CREDENTIALS` shows a
  form-level error. After sign up, auto-login with the same credentials.

### 6.2 Dashboard
- Stat cards: Total projects · Total tasks (across my projects) · In progress · Completed (with % of total).
- **My Tasks** (first 5 open tasks assigned to me, sorted by due date) with project name, priority badge, due label ("Today", "Overdue", date). "View all" → `/my-tasks`.
- **Recent Projects** (4 newest) with letter tile, description, status badge.

### 6.3 Projects list
- Search (name/description), status filter, "New Project".
- Table: Name · Description · Status · Members (avatar stack incl. owner, `+N`) · Created · Actions (Open, Edit*, Delete*).
- Client-side pagination, 10 per page, "Showing a–b of n".

### 6.4 Create / Edit project
- Name (2–100), Description (≤2000), Status. Edit is the Settings tab form (owner only).

### 6.5 Project overview
- Stats: Total tasks · In progress · Completed · Overdue.
- Description card with "Created by" (owner) and "Created at".
- Quick actions: Add task, Manage members*, Edit project*, Project settings.

### 6.6 Project tasks
- Status tabs with counts (All / To Do / In Progress / Completed), search, priority filter.
- Table: Title · Assignee · Status · Priority · Due date · Actions (View, Edit*, Delete*).
- Row click → task details.

### 6.7 Create / Edit task
- Title (2–100), Description, Assignee (project members + owner; "Unassigned"),
  Priority, Due date, Status.
- Plain members: Priority is disabled and never sent. On create, Assignee
  offers only "Unassigned" or themselves; on edit (own task only) it is
  disabled and not sent. The API rejects anything else with 403.

### 6.8 Task details
- Title, priority badge, **status dropdown that updates inline** (optimistic).
- Description card; metadata grid: Project · Assignee · Due date · Created at · Updated at.
- Edit / Delete buttons per permissions.

### 6.9 Members
- Search, "Add Member"* button, table: Name · Email · Role badge · Joined · Actions.
- Owner row is synthesized (from `owner_id` + user directory, joined = project created).
- Row menu: View details, Change role*, Remove* / Leave project (self).
- **Add member modal:** user picker (directory minus existing members), role (Admin/Member).
- **Update role modal:** member card with current role, new role select.
- **Member details modal:** avatar, role, joined, email, "Remove from project".

### 6.10 Project settings
- Edit project form (owner; read-only notice for others).
- Roles & permissions matrix (§4.4).
- Danger zone: Delete project (owner, confirm by typing name) / Leave project (non-owner).

### 6.11 My tasks
- All tasks assigned to me across projects. Status tabs with counts, search,
  project filter, priority filter. Table: Title · Project · Status · Priority · Due.

### 6.12 Users
- Search, table: Name · Email · Joined · Actions (View profile), pagination.

### 6.13 User profile (other user)
- Header: avatar, name, email. Tabs:
  - **Overview:** Joined, Shared projects, Tasks assigned (in shared projects), Bio, Phone.
  - **Projects:** projects we share, with their role, status and created date.
- Viewing yourself redirects to `/profile`.

### 6.14 My profile
- Avatar (with "Change photo" → avatar URL modal), Full name, Email, Phone, Bio.
- Saves via `PATCH /users/:me`, sending only changed fields.

### 6.15 Cross-cutting states
- Every data view has a skeleton, an empty state and an error state with retry.
- `403` on a project → "You don't have access to this project"; `404` → not found view.
- Destructive actions always go through `ConfirmDialog`.
- Mutations show a success toast using the API `message`, or the error message.

---

## 7. Responsive behaviour

- `≥ lg`: fixed sidebar.
- `< lg`: sidebar becomes an off-canvas drawer opened from the top bar.
- Tables scroll horizontally inside their card on narrow screens.

## 8. Accessibility

- All controls reachable by keyboard; Radix handles focus trap in modals/menus.
- Visible focus rings (`focus-visible:ring-2 ring-primary/60`).
- Form errors linked via `aria-describedby`; icon-only buttons have `aria-label`.
- Colour is never the only signal — badges always carry text.

---

## 9. API gaps

Mockup elements with **no backend support**. They are left out of the UI (no
fake data) and listed here as backend follow-ups.

| Mockup element | Status |
|---|---|
| Invite user by email (1-2) | Omitted — no invite endpoint; users self-register |
| Global user role (Admin/User) & Active/Inactive status (1-1) | Omitted — not in `users` schema |
| Task comments & activity (3-11) | Omitted — listed as future feature in backend README |
| Notifications bell | Omitted |
| "Continue with Google", "Forgot password", "Remember me" | Omitted |
| Profile Security / Notifications tabs, Timezone | Omitted |
| Avatar upload | URL field only (`avatar_url`) — no upload endpoint |
| "+2 this month" trend lines on stats | Omitted — no history endpoint |
| Project status "In Progress" / "Planning" | Mapped to real enum: Active / Completed / Archived |
| Server-side pagination & search | Done client-side; endpoints return full lists |

### Backend fixes required by the UI (applied)

1. **Task responses omitted `status`.** `projects.repository.ts` task `select`
   sets now include `status: true` — without it no status column, tab or
   dashboard stat can work.
2. **Profile update failed for users without a profile row.** Registration
   doesn't create `user_profiles`, so `profile: { update }` threw `P2025`
   (404). Changed to `upsert`.
3. **Creating a task assigned to the owner returned 400.** The assignee check
   looked only in `project_members`, where the owner has no row. It now accepts
   `project.owner_id` as well.

### Backend risks found in review (fixed, with tests)

4. **Any user could edit or delete any other user.** `PATCH/DELETE /users/:id`
   now return 403 unless `:id` is the caller.
5. **Updates could assign a task to a non-member.** `PUT …/tasks/:id` now
   applies the same check as create (owner or `project_members` row) → 400.
6. **Create and update disagreed for members.** Members may now create a task
   only for themselves (or unassigned) and without a priority, matching the
   update rule → 403 otherwise.

### Frontend bugs found by testing (fixed, with regression tests)

| # | Bug | Fix |
|---|---|---|
| F1 | Sign out didn't redirect until the next navigation | `me` updated in place, other queries removed |
| F2 | Sign in after sign out (same tab) stayed on `/login` | `fetchQuery(me)` with `staleTime: 0` |
| F3 | Pages scrolled sideways on phones | `relative` table wrapper / due label; `grid-cols-1` on responsive grids |
| F4 | Add Member list could be up to 60 s stale | Refetch users when the modal opens |
| F5 | Crash ("useMe() outside an authenticated route") when the session ended | `RequireAuth` provides the user via `MeContext` |
| F6 | `?next=` lost after login (`RedirectIfAuthed` sent to `/`) | Both redirects use `safeNext()` |

---

## 10. Implementation plan

1. **Scaffold** — Vite React-TS template, Tailwind v4 plugin, `@` alias, `/api`
   proxy, fonts, tokens, favicon, logo.
2. **Foundation** — `api.ts`, DTO types, domain/format/permissions helpers,
   QueryClient with global 401 handling, router skeleton.
3. **UI kit** — primitives in `components/ui`.
4. **Auth** — login, register, `RequireAuth`, logout.
5. **Shell** — sidebar, top bar (search → projects, user menu), mobile drawer.
6. **Projects** — list, create, `ProjectLayout`, overview, settings.
7. **Members** — tab, add / role / details / remove modals.
8. **Tasks** — tab, form, details with inline status.
9. **Cross-project** — dashboard, my tasks.
10. **Users** — directory, user profile, my profile.
11. **Verify** — `tsc -b` + `vite build` clean; manual run against the API.
12. **Tests** — see §12.

## 11. Commands

```bash
cd frontend
bun install
bun run dev        # http://localhost:5173 (backend must run on :3000)
bun run build      # type-check (tsc -b) + production build
bun run lint       # oxlint
bun run test       # Vitest: unit + component tests (MSW, no backend needed)
bun run test:e2e   # Playwright: real API on the "-test" DB (see §12)
```

## 12. Testing

| Layer | Tool | Where | Needs |
|---|---|---|---|
| Unit | Vitest | `src/**/*.test.ts` next to the code (`lib/`, `hooks/`, `features/tasks/filters`) | nothing |
| Component / page | Vitest + Testing Library + MSW | `src/pages/**/*.test.tsx`, `src/features/auth/session.test.tsx` | nothing |
| End-to-end | Playwright (Chromium) | `e2e/*.spec.ts` | Postgres + `backend/` test DB |

- **Fake API** — `src/test/msw/handlers.ts` mimics the backend envelope, error
  codes and authorization rules over an in-memory `db` (`src/test/msw/db.ts`)
  seeded with Alex (owner), Sam (admin), Jo (member) and Olivia (outsider).
  Override one endpoint in a test with `server.use(...)`.
- **Rendering** — `renderApp(path, { as: userId })` mounts the real route tree
  (`routes` from `src/router.tsx`) in a memory router with a fresh
  `createQueryClient()`; `sent(method, path)` returns request bodies the app sent.
- **E2E** — `playwright.config.ts` starts the backend on :3100 against
  `project-management-sass-test` (`bun run test:serve`) and Vite on :5174
  proxying to it. `global-setup.ts` empties the test DB; each test seeds its own
  uniquely named team through the API (`e2e/fixtures.ts`), so tests run in
  parallel. `responsive.spec.ts` runs at 390×844.

First run: `cd ../backend && bun run test:db:setup`, then
`bunx playwright install chromium`.
