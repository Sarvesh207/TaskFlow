import { Button } from '@/components/ui/Button'
import { Modal, ModalActions } from '@/components/ui/Modal'
import { useRouteModal } from '@/components/ui/route-modal'
import { ProjectForm } from '@/features/projects/ProjectForm'
import { useCreateProject } from '@/features/projects/queries'

/** /projects/new — over the projects list; opens the new project when created. */
export function CreateProjectModal() {
  const modal = useRouteModal('/projects')
  const create = useCreateProject()

  return (
    <Modal
      open={modal.open}
      onOpenChange={modal.onOpenChange}
      title="Create Project"
      description="Create a new project to organize your work."
      className="max-w-lg"
    >
      <ProjectForm
        onSubmit={async (values) => {
          const { data } = await create.mutateAsync({
            ...values,
            description: values.description || undefined,
          })
          modal.close(`/projects/${data.id}`)
        }}
        actions={({ isSubmitting }) => (
          <ModalActions>
            <Button variant="secondary" onClick={() => modal.close()}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Create Project
            </Button>
          </ModalActions>
        )}
      />
    </Modal>
  )
}
