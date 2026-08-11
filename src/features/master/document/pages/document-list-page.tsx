import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { FileText, FileType2, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { FilterBar } from '@/components/common/filter-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { DOCUMENT_LABELS, DOCUMENT_SORT } from '../constants'
import { useDocumentList } from '../hooks/use-document-list'
import type { Document } from '../types'

/** Document master — list with add/edit/delete and a document type filter. */
export function DocumentListPage() {
  const {
    rows,
    total,
    limit,
    offset,
    onPaginationChange,
    search,
    setSearch,
    sorting,
    onSortingChange,
    typeFilter,
    changeTypeFilter,
    typeOptions,
    isLoading,
    isError,
    error,
    isForbidden,
    forbiddenMessage,
    goToCreate,
    goToEdit,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting,
  } = useDocumentList()

  // Which of this screen's buttons this role may see.
  const { canCreate, canUpdate, canDelete } = useResourceAccess(PERMISSIONS.documents)

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
            onEdit={canUpdate ? () => goToEdit(row.original.id) : undefined}
            onDelete={canDelete ? () => setPendingDelete(row.original) : undefined}
          />
        ),
      },
      {
        // Sortable columns are keyed by the API's own field name, so a header
        // click travels to `?sort=` untranslated.
        id: DOCUMENT_SORT.documentType,
        accessorKey: 'documentTypeName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={DOCUMENT_LABELS.documentType} />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => row.original.documentTypeName || '—',
      },
      {
        id: DOCUMENT_SORT.documentName,
        accessorKey: 'documentName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={DOCUMENT_LABELS.documentName} />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.documentName}</span>
        ),
      },
      {
        accessorKey: 'isRequired',
        enableSorting: false,
        header: DOCUMENT_LABELS.isRequired,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.isRequired ? (
            <Badge>Required</Badge>
          ) : (
            <span className="text-muted-foreground">Optional</span>
          ),
      },
      ...auditColumns<Document>({
        createdAt: DOCUMENT_SORT.createdAt,
        updatedAt: DOCUMENT_SORT.updatedAt,
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canUpdate, canDelete],
  )

  // Reading the master was refused (`{ code: 'FORBIDDEN' }`) — show the 403
  // screen with the server's reason instead of the table and its Add button.
  if (isForbidden) {
    return <Forbidden description={forbiddenMessage} />
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Manage your document master records."
        actions={
          canCreate && (
            <Button onClick={goToCreate}>
              <Plus className="size-4" />
              Add Document
            </Button>
          )
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
          itemName="documents"
          pageSizeOptions={[5, 10, 25, 50]}
          serverPagination
          limit={limit}
          offset={offset}
          total={total}
          onPaginationChange={onPaginationChange}
          manualSorting
          sorting={sorting}
          onSortingChange={onSortingChange}
          // Search and the type filter both narrow the query server-side, so
          // they span every page rather than the one on screen.
          toolbar={
            <FilterBar
              search={{
                value: search,
                onChange: setSearch,
                placeholder: 'Search document…',
              }}
              facets={[
                {
                  key: 'documentType',
                  label: DOCUMENT_LABELS.documentType,
                  icon: FileType2,
                  value: typeFilter,
                  onChange: changeTypeFilter,
                  options: typeOptions,
                  searchable: true,
                  searchPlaceholder: 'Search document type',
                  // '' is "every type" — the API simply gets no filter.
                  clearValue: '',
                },
              ]}
              onReset={() => {
                setSearch('')
                changeTypeFilter('')
              }}
            />
          }
          emptyState={
            <EmptyState
              icon={FileText}
              title="No documents yet"
              description="Create your first document to get started."
              action={
                canCreate && (
                  <Button onClick={goToCreate}>
                    <Plus className="size-4" />
                    Add Document
                  </Button>
                )
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
