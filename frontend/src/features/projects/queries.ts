import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Project, ProjectInput } from '@/types/api'

export const projectsKey = ['projects'] as const
export const projectKey = (id: string) => ['projects', id] as const

export function useProjects() {
  return useQuery({ queryKey: projectsKey, queryFn: () => api.get<Project[]>('/projects') })
}

export function useProject(id: string | undefined) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: projectKey(id ?? ''),
    queryFn: () => api.get<Project>(`/projects/${id}`),
    enabled: !!id,
    placeholderData: () => qc.getQueryData<Project[]>(projectsKey)?.find((p) => p.id === id),
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ProjectInput) => api.post<Pick<Project, 'id' | 'name'>>('/projects', input),
    onSuccess: ({ message }) => {
      qc.invalidateQueries({ queryKey: projectsKey, exact: true })
      toast.success(message)
    },
  })
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<ProjectInput>) => api.patch<Project>(`/projects/${id}`, input),
    onSuccess: ({ message }) => {
      qc.invalidateQueries({ queryKey: projectKey(id), exact: true })
      qc.invalidateQueries({ queryKey: projectsKey, exact: true })
      toast.success(message)
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: ({ message }, id) => {
      qc.removeQueries({ queryKey: projectKey(id) })
      qc.invalidateQueries({ queryKey: projectsKey, exact: true })
      toast.success(message)
    },
  })
}
