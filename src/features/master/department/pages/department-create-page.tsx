import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DepartmentForm } from '../components/department-form'
import { useDepartment } from '../api/use-department'
import {
  useCreateDepartment,
  useUpdateDepartment,
} from '../api/use-department-mutations'
import { departmentToFormValues } from '../mappers'

/**
 * Create/edit a department record. Pass `departmentId` to edit an existing
 * record, or omit it to create a new one.
 */
export function DepartmentManagePage({ departmentId }: { departmentId?: number }) {
  const isEdit = departmentId !== undefined
  const navigate = useNavigate()

  const department = useDepartment(departmentId ?? Number.NaN)
  const createDepartment = useCreateDepartment()
  const updateDepartment = useUpdateDepartment(departmentId ?? Number.NaN)

  const isPending = isEdit ? updateDepartment.isPending : createDepartment.isPending
  const goToList = () => navigate({ to: '/department' })

  const handleSubmit = (values: Parameters<typeof createDepartment.mutate>[0]) => {
    const mutation = isEdit ? updateDepartment : createDepartment
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(isEdit ? 'Department updated' : 'Department created')
        goToList()
      },
      onError: (err) =>
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to ${isEdit ? 'update' : 'create'} department`,
        ),
    })
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Department' : 'Add New Department'}
        description={
          isEdit ? 'Update this department record' : 'Create a new department record'
        }
        actions={
          <Button variant="outline" onClick={goToList}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {isEdit && department.isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : isEdit && (department.isError || !department.data) ? (
            <p className="text-sm text-destructive">
              {department.error instanceof Error
                ? department.error.message
                : "Couldn't load this department."}
            </p>
          ) : (
            <DepartmentForm
              defaultValues={
                isEdit && department.data
                  ? departmentToFormValues(department.data)
                  : undefined
              }
              isPending={isPending}
              submitLabel={isEdit ? 'Save Changes' : 'Create Department'}
              onCancel={goToList}
              onSubmit={handleSubmit}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
