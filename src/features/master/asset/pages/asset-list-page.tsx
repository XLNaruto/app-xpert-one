import { useMemo, useState } from 'react'
import { Boxes, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table'
import { useAssets } from '../api/use-assets'
import { useDeleteAsset } from '../api/use-asset-mutations'
import { assetColumns } from '../components/asset-columns'
import { AssetFormDialog } from '../components/asset-form-dialog'
import type { AssetRecord } from '../types'

/** Asset master — list with add/edit/delete. */
export function AssetListPage() {
  const { data, isLoading, isError, error } = useAssets()
  const deleteAsset = useDeleteAsset()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AssetRecord | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AssetRecord | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const columns = useMemo(
    () =>
      assetColumns({
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
    deleteAsset.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Asset deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to delete asset'),
    })
  }

  return (
    <div>
      <PageHeader
        title="Assets"
        description="Manage your asset master records."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add Asset
          </Button>
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load assets."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          isLoading={isLoading}
          searchColumn="assetName"
          searchPlaceholder="Search assets…"
          itemName="assets"
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={
            <EmptyState
              icon={Boxes}
              title="No assets yet"
              description="Add your first asset to get started."
              action={
                <Button onClick={openCreate}>
                  <Plus className="size-4" />
                  Add Asset
                </Button>
              }
            />
          }
        />
      )}

      <AssetFormDialog open={formOpen} onOpenChange={setFormOpen} record={editing} />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        icon={Boxes}
        title="Delete asset?"
        description={
          pendingDelete ? `"${pendingDelete.assetName}" will be permanently removed.` : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={deleteAsset.isPending}
        keepOpenOnConfirm
        onConfirm={confirmDelete}
      />
    </div>
  )
}
