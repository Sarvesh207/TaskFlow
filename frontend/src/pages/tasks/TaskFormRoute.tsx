import { Navigate, useParams } from 'react-router'
import { useRouteModal } from '@/components/ui/route-modal'
import { useMe } from '@/features/auth/queries'
import { useProjectContext } from '@/features/projects/project-context'
import { TaskFormModal } from '@/features/tasks/TaskFormModal'
import { useTask } from '@/features/tasks/queries'
import { can } from '@/lib/permissions'

/**
 * …/tasks/new (over the task list) and …/tasks/:taskId/edit (over the task
 * page). Saving or cancelling returns to the page underneath.
 */
export function TaskFormRoute() {
  const { taskId } = useParams()
  const { project, role } = useProjectContext()
  const me = useMe()
  const taskQuery = useTask(project.id, taskId)
  const tasksPath = `/projects/${project.id}/tasks`
  const modal = useRouteModal(taskId ? `${tasksPath}/${taskId}` : tasksPath)

  if (taskId) {
    // The task page underneath shows the loading and error states.
    if (!taskQuery.data) return null
    if (!can.editTask(role, taskQuery.data, me.id)) return <Navigate to={`${tasksPath}/${taskId}`} replace />
  }

  return (
    <TaskFormModal
      open={modal.open}
      onOpenChange={modal.onOpenChange}
      task={taskQuery.data}
      onSaved={() => modal.close()}
    />
  )
}
