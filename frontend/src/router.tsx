import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageLoader } from '@/components/ui/states'
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
  // Not <Public>: the popup is already signed in when it lands here.
  {
    path: '/auth/google/done',
    element: <Suspense fallback={<PageLoader />}>{page(loaders.googleDone, 'GoogleDonePage')}</Suspense>,
  },
  {
    element: <AppLayout />,
    children: [
      { index: true, element: page(loaders.dashboard, 'DashboardPage') },
      { path: 'projects', element: page(loaders.projects, 'ProjectsPage') },
      { path: 'projects/new', element: page(loaders.createProject, 'CreateProjectPage') },
      {
        path: 'projects/:projectId',
        element: <ProjectLayout />,
        children: [
          { index: true, element: page(loaders.projectOverview, 'ProjectOverviewPage') },
          { path: 'tasks', element: page(loaders.projectTasks, 'ProjectTasksPage') },
          { path: 'tasks/new', element: page(loaders.taskForm, 'TaskFormPage') },
          { path: 'tasks/:taskId', element: page(loaders.taskDetail, 'TaskDetailPage') },
          { path: 'tasks/:taskId/edit', element: page(loaders.taskForm, 'TaskFormPage') },
          { path: 'members', element: page(loaders.projectMembers, 'ProjectMembersPage') },
          { path: 'settings', element: page(loaders.projectSettings, 'ProjectSettingsPage') },
        ],
      },
      { path: 'my-tasks', element: page(loaders.myTasks, 'MyTasksPage') },
      { path: 'users', element: page(loaders.users, 'UsersPage') },
      { path: 'users/:userId', element: page(loaders.userProfile, 'UserProfilePage') },
      { path: 'profile', element: page(loaders.myProfile, 'MyProfilePage') },
      { path: '*', element: page(loaders.notFound, 'NotFoundPage') },
    ],
  },
]

export const router = createBrowserRouter(routes)
