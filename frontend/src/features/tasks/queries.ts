import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Project, Task, TaskInput } from '@/types/api'

export const tasksKey = (projectId: string) => ['projects', projectId, 'tasks'] as const
export const taskKey = (projectId: string, taskId: string) => ['projects', projectId, 'tasks', taskId] as const

const fetchTasks = (projectId: string) => api.get<Task[]>(`/projects/${projectId}/tasks`)

export function useTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: tasksKey(projectId ?? ''),
    queryFn: () => fetchTasks(projectId!),
    enabled: !!projectId,
  })
}

export function useTask(projectId: string | undefined, taskId: string | undefined) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: taskKey(projectId ?? '', taskId ?? ''),
    queryFn: () => api.get<Task>(`/projects/${projectId}/tasks/${taskId}`),
    enabled: !!projectId && !!taskId,
    placeholderData: () => qc.getQueryData<Task[]>(tasksKey(projectId ?? ''))?.find((t) => t.id === taskId),
  })
}

export interface TaskWithProject extends Task {
  project: Project
}

/**
 * Tasks of every given project, fetched in parallel. The API has no
 * cross-project task endpoint, so Dashboard and My Tasks fan out here.
 */
export function useTasksAcross(projects: Project[] | undefined) {
  const list = projects ?? []
  return useQueries({
    queries: list.map((p) => ({ queryKey: tasksKey(p.id), queryFn: () => fetchTasks(p.id) })),
    combine: (results) => {
      const tasks: TaskWithProject[] = []
      results.forEach((r, i) => {
        const project = list[i]
        if (!project || !r.data) return
        for (const t of r.data) tasks.push({ ...t, project })
      })
      return {
        tasks,
        isPending: results.some((r) => r.isPending),
        error: results.find((r) => r.error)?.error ?? null,
      }
    },
  })
}

export function useCreateTask(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TaskInput) => api.post<Task>(`/projects/${projectId}/tasks`, input),
    onSuccess: ({ message }) => {
      qc.invalidateQueries({ queryKey: tasksKey(projectId), exact: true })
      toast.success(message)
    },
  })
}

export function useUpdateTask(projectId: string, { silent = false }: { silent?: boolean } = {}) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: TaskInput }) =>
      api.put<Task>(`/projects/${projectId}/tasks/${taskId}`, input),
    // Optimistic: status changes from the detail page should feel instant.
    onMutate: async ({ taskId, input }) => {
      const key = taskKey(projectId, taskId)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<Task>(key)
      if (previous && input.status) qc.setQueryData<Task>(key, { ...previous, status: input.status })
      return { previous, key }
    },
    onError: (_error, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.key, ctx.previous)
    },
    onSuccess: ({ data, message }, { taskId }) => {
      qc.setQueryData(taskKey(projectId, taskId), data)
      if (!silent) toast.success(message)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: tasksKey(projectId) })
    },
  })
}

export function useDeleteTask(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) => api.delete(`/projects/${projectId}/tasks/${taskId}`),
    onSuccess: ({ message }, taskId) => {
      qc.removeQueries({ queryKey: taskKey(projectId, taskId) })
      qc.invalidateQueries({ queryKey: tasksKey(projectId), exact: true })
      toast.success(message)
    },
  })
}
