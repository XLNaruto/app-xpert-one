import { useMemo, useState } from 'react'
import { Map, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table'
import { useDistricts } from '../api/use-districts'
import { useDeleteDistrict } from '../api/use-district-mutations'
import { districtColumns } from '../components/district-columns'
import { DistrictFormDialog } from '../components/district-form-dialog'
import type { DistrictRecord } from '../types'

/** District master — list with add/edit/delete. */
export function DistrictListPage() {
  const { data, isLoading, isError, error } = useDistricts()
  const deleteDistrict = useDeleteDistrict()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<DistrictRecord | null>(null)
  const [pendingDelete, setPendingDelete] = useState<DistrictRecord | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const columns = useMemo(
    () =>
      districtColumns({
        onEdit: (record) => {
          setEditing(record)
          setFormOpen(true)
        },
        onDelete: (record) => setPendingDelete(record),
      }),
    [],
  )

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteDistrict.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('District deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to delete district'),
    })
  }

  return (
    <div>
      <PageHeader
        title="District"
        description="Manage your district master records."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add District
          </Button>
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load districts."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          isLoading={isLoading}
          searchColumn="districtName"
          searchPlaceholder="Search districts…"
          itemName="districts"
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={
            <EmptyState
              icon={Map}
              title="No districts yet"
              description="Add your first district to get started."
              action={
                <Button onClick={openCreate}>
                  <Plus className="size-4" />
                  Add District
                </Button>
              }
            />
          }
        />
      )}

      <DistrictFormDialog open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        icon={Map}
        title="Delete district?"
        description={
          pendingDelete
            ? `"${pendingDelete.districtName}" will be permanently removed.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={deleteDistrict.isPending}
        keepOpenOnConfirm
        onConfirm={confirmDelete}
      />
    </div>
  )
}
