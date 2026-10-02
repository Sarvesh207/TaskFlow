/**
 * Route code-splitting with warm-up. Every page is a lazy chunk; these loaders
 * are shared by the router (to render) and by nav links / idle time (to fetch
 * the chunk *before* it is needed), so navigation feels instant.
 */

type Loader = () => Promise<unknown>

export const loaders = {
  login: () => import('@/pages/auth/LoginPage'),
  register: () => import('@/pages/auth/RegisterPage'),
  dashboard: () => import('@/pages/DashboardPage'),
  projects: () => import('@/pages/projects/ProjectsPage'),
  createProject: () => import('@/pages/projects/CreateProjectModal'),
  projectOverview: () => import('@/pages/projects/ProjectOverviewPage'),
  projectTasks: () => import('@/pages/projects/ProjectTasksPage'),
  taskForm: () => import('@/pages/tasks/TaskFormRoute'),
  taskDetail: () => import('@/pages/tasks/TaskDetailPage'),
  projectMembers: () => import('@/pages/projects/ProjectMembersPage'),
  projectSettings: () => import('@/pages/projects/ProjectSettingsPage'),
  myTasks: () => import('@/pages/tasks/MyTasksPage'),
  users: () => import('@/pages/users/UsersPage'),
  userProfile: () => import('@/pages/users/UserProfilePage'),
  myProfile: () => import('@/pages/users/MyProfilePage'),
  notFound: () => import('@/pages/NotFoundPage'),
} satisfies Record<string, Loader>

const BY_PATH: Record<string, Loader[]> = {
  '/': [loaders.dashboard],
  '/projects': [loaders.projects, loaders.projectOverview],
  '/my-tasks': [loaders.myTasks],
  '/users': [loaders.users, loaders.userProfile],
  '/profile': [loaders.myProfile],
}

const started = new Set<Loader>()

function load(loader: Loader) {
  if (started.has(loader)) return
  started.add(loader)
  loader().catch(() => started.delete(loader)) // retry on the next hint
}

/** Warm the chunk(s) behind a top-level path. */
export function preloadRoute(path: string) {
  BY_PATH[path]?.forEach(load)
}

/** Once the app is idle, fetch every app page so later navigation never waits on the network. */
export function preloadAllWhenIdle() {
  const run = () => Object.values(loaders).forEach(load)
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 })
  else setTimeout(run, 1500)
}
