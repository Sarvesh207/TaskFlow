import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageLoader } from '@/components/ui/states'
import type { RouteHandle } from '@/components/layout/fill-height'
import { RedirectIfAuthed } from '@/features/auth/RequireAuth'
import { ProjectLayout } from '@/pages/projects/ProjectLayout'
import { loaders } from '@/router-preload'

/**
 * Route-level code splitting for named page exports. The loaders are shared
 * with router-preload.ts, so a chunk warmed on hover/idle is reused here.
 */
function page<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  const Component = lazy<ComponentType>(() => load().then((m) => ({ default: m[name] })))
  return <Component />
}

/** List pages whose table should scroll inside the page (see fill-height.ts). */
const fillHeight: RouteHandle = { fillHeight: true }

function Public({ children }: { children: ReactNode }) {
  return (
    <RedirectIfAuthed>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </RedirectIfAuthed>
  )
}

export const routes: RouteObject[] = [
  { path: '/login', element: <Public>{page(loaders.login, 'LoginPage')}</Public> },
  { path: '/register', element: <Public>{page(loaders.register, 'RegisterPage')}</Public> },
  {
    element: <AppLayout />,
    children: [
      { index: true, element: page(loaders.dashboard, 'DashboardPage') },
      // Create/edit forms are modals: child routes rendered over the page beneath.
      {
        path: 'projects',
        element: page(loaders.projects, 'ProjectsPage'),
        handle: fillHeight,
        children: [{ path: 'new', element: page(loaders.createProject, 'CreateProjectModal') }],
      },
      {
        path: 'projects/:projectId',
        element: <ProjectLayout />,
        children: [
          { index: true, element: page(loaders.projectOverview, 'ProjectOverviewPage') },
          {
            path: 'tasks',
            element: page(loaders.projectTasks, 'ProjectTasksPage'),
            handle: fillHeight,
            children: [{ path: 'new', element: page(loaders.taskForm, 'TaskFormRoute') }],
          },
          {
            path: 'tasks/:taskId',
            element: page(loaders.taskDetail, 'TaskDetailPage'),
            children: [{ path: 'edit', element: page(loaders.taskForm, 'TaskFormRoute') }],
          },
          { path: 'members', element: page(loaders.projectMembers, 'ProjectMembersPage'), handle: fillHeight },
          { path: 'settings', element: page(loaders.projectSettings, 'ProjectSettingsPage') },
        ],
      },
      { path: 'my-tasks', element: page(loaders.myTasks, 'MyTasksPage'), handle: fillHeight },
      { path: 'users', element: page(loaders.users, 'UsersPage'), handle: fillHeight },
      { path: 'users/:userId', element: page(loaders.userProfile, 'UserProfilePage') },
      { path: 'profile', element: page(loaders.myProfile, 'MyProfilePage') },
      { path: '*', element: page(loaders.notFound, 'NotFoundPage') },
    ],
  },
]

export const router = createBrowserRouter(routes)
