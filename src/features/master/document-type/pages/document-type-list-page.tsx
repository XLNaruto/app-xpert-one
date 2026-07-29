import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { FileType2, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { DOCUMENT_TYPE_LABELS } from '../constants'
import { useDocumentTypeList } from '../hooks/use-document-type-list'
import type { DocumentType } from '../types'

/** Document type master — list with add/edit/delete. */
export function DocumentTypeListPage() {
  const {
    rows,
    isLoading,
    isError,
    error,
    goToCreate,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting,
  } = useDocumentTypeList()

  const columns = useMemo<ColumnDef<DocumentType>[]>(
    () => [
      {
        id: 'serial',
        header: 'Sr No.',
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.index + 1}</span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="text-xs font-medium uppercase">Actions</span>,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <TableRowActions
            onEdit={() => goToEdit(row.original.id)}
            onDelete={() => setPendingDelete(row.original)}
          />
        ),
      },
      {
        accessorKey: 'typeName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={DOCUMENT_TYPE_LABELS.typeName} />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.typeName}</span>
        ),
      },
      ...auditColumns<DocumentType>(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div>
      <PageHeader
        title="Document Types"
        description="Manage your document type master records."
        actions={
          <Button onClick={goToCreate}>
            <Plus className="size-4" />
            Add Document Type
          </Button>
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load document types."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchColumn="typeName"
          searchPlaceholder="Search document type…"
          itemName="document types"
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={
            <EmptyState
              icon={FileType2}
              title="No document types yet"
              description="Create your first document type to get started."
              action={
                <Button onClick={goToCreate}>
                  <Plus className="size-4" />
                  Add Document Type
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
        icon={FileType2}
        title="Delete document type?"
        description={
          pendingDelete
            ? `"${pendingDelete.typeName}" will be permanently removed.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={isDeleting}
        keepOpenOnConfirm
        onConfirm={confirmDelete}
      />
    </div>
  )
}
