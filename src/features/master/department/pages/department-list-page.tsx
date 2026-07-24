import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Building, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table'
import { useDepartments } from '../api/use-departments'
import { useDeleteDepartment } from '../api/use-department-mutations'
import { departmentColumns } from '../components/department-columns'
import type { Department } from '../types'

/** Department master — list with add/edit/delete. */
export function DepartmentListPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useDepartments()
  const deleteDepartment = useDeleteDepartment()
  const [pendingDelete, setPendingDelete] = useState<Department | null>(null)

  const columns = useMemo(
    () =>
      departmentColumns({
        onEdit: (record) =>
          navigate({
            to: '/department/$departmentId/edit',
            params: { departmentId: String(record.id) },
          }),
        onDelete: (record) => setPendingDelete(record),
      }),
    [navigate],
  )

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteDepartment.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Department deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to delete department'),
    })
  }

  return (
    <div>
      <PageHeader
        title="Department"
        description="Manage your department master records."
        actions={
          <Button onClick={() => navigate({ to: '/department/new' })}>
            <Plus className="size-4" />
            Add New Department
          </Button>
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load departments."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          isLoading={isLoading}
          searchColumn="departmentName"
          searchPlaceholder="Search departments…"
          itemName="departments"
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={
            <EmptyState
              icon={Building}
              title="No departments yet"
              description="Create your first department to get started."
              action={
                <Button onClick={() => navigate({ to: '/department/new' })}>
                  <Plus className="size-4" />
                  Add New Department
                </Button>
              }
            />
          }
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        icon={Building}
        title="Delete department?"
        description={
          pendingDelete
            ? `"${pendingDelete.departmentName}" will be permanently removed.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={deleteDepartment.isPending}
        keepOpenOnConfirm
        onConfirm={confirmDelete}
      />
    </div>
  )
}
