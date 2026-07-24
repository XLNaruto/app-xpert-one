import { useMemo, useState } from 'react'
import { MapPinned, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table'
import { useStates } from '../api/use-states'
import { useDeleteState } from '../api/use-state-mutations'
import { stateColumns } from '../components/state-columns'
import { StateFormDialog } from '../components/state-form-dialog'
import type { StateRecord } from '../types'

/** State master — list with add/edit/delete. */
export function StateListPage() {
  const { data, isLoading, isError, error } = useStates()
  const deleteState = useDeleteState()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<StateRecord | null>(null)
  const [pendingDelete, setPendingDelete] = useState<StateRecord | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const columns = useMemo(
    () =>
      stateColumns({
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
    deleteState.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('State deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to delete state'),
    })
  }

  return (
    <div>
      <PageHeader
        title="State"
        description="Manage your state master records."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add State
          </Button>
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load states."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          isLoading={isLoading}
          searchColumn="stateName"
          searchPlaceholder="Search states…"
          itemName="states"
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={
            <EmptyState
              icon={MapPinned}
              title="No states yet"
              description="Add your first state to get started."
              action={
                <Button onClick={openCreate}>
                  <Plus className="size-4" />
                  Add State
                </Button>
              }
            />
          }
        />
      )}

      <StateFormDialog open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        icon={MapPinned}
        title="Delete state?"
        description={
          pendingDelete ? `"${pendingDelete.stateName}" will be permanently removed.` : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={deleteState.isPending}
        keepOpenOnConfirm
        onConfirm={confirmDelete}
      />
    </div>
  )
}
