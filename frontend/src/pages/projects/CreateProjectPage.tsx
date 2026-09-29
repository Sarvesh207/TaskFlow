import { useNavigate } from 'react-router'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/misc'
import { ProjectForm } from '@/features/projects/ProjectForm'
import { useCreateProject } from '@/features/projects/queries'

export function CreateProjectPage() {
  const navigate = useNavigate()
  const create = useCreateProject()

  return (
    <div className="max-w-2xl">
      <PageHeader title="Create Project" description="Create a new project to organize your work." />
      <Card className="p-6">
        <ProjectForm
          onSubmit={async (values) => {
            const { data } = await create.mutateAsync({
              ...values,
              description: values.description || undefined,
            })
            navigate(`/projects/${data.id}`)
          }}
          actions={({ isSubmitting }) => (
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={isSubmitting}>
                Create Project
              </Button>
              <ButtonLink to="/projects" variant="secondary">
                Cancel
              </ButtonLink>
            </div>
          )}
        />
      </Card>
    </div>
  )
}
