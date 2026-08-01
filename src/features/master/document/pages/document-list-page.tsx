import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { FileText, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { DOCUMENT_LABELS } from '../constants'
import { useDocumentList } from '../hooks/use-document-list'
import type { Document } from '../types'

/** Document master — list with add/edit/delete. */
export function DocumentListPage() {
  const {
    rows,
    total,
    limit,
    offset,
    onPaginationChange,
    search,
    setSearch,
    isLoading,
    isError,
    error,
    goToCreate,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting,
  } = useDocumentList()

  const columns = useMemo<ColumnDef<Document>[]>(
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
        accessorKey: 'documentType',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={DOCUMENT_LABELS.documentType} />
        ),
      },
      {
        accessorKey: 'documentName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={DOCUMENT_LABELS.documentName} />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.documentName}</span>
        ),
      },
      ...auditColumns<Document>(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Manage your document master records."
        actions={
          <Button onClick={goToCreate}>
            <Plus className="size-4" />
            Add Document
          </Button>
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load documents."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder="Search document…"
          itemName="documents"
          pageSizeOptions={[10, 25, 50]}
          serverPagination
          limit={limit}
          offset={offset}
          total={total}
          onPaginationChange={onPaginationChange}
          searchValue={search}
          onSearchChange={setSearch}
          emptyState={
            <EmptyState
              icon={FileText}
              title="No documents yet"
              description="Create your first document to get started."
              action={
                <Button onClick={goToCreate}>
                  <Plus className="size-4" />
                  Add Document
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
        icon={FileText}
        title="Delete document?"
        description={
          pendingDelete
            ? `"${pendingDelete.documentName}" will be permanently removed.`
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
