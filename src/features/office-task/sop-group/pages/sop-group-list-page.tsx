import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Eye, ListChecks, Lock, Pencil, Plus, Trash2, UserCheck, UserPlus, Users } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { RowActionsMenu } from '@/components/common/row-actions-menu'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { auditColumns, DataTable, DataTableColumnHeader, rowNumber } from '@/components/data-table'
import { CompanyRequired, ScopedDataError } from '@/features/company'
import { RuleIcons } from '@/features/office-task/common'
import { SOP_GROUP_SORT } from '../constants'
import { useSopGroupList } from '../hooks/use-sop-group-list'
import { ChecklistPreviewDialog } from '../components/checklist-preview-dialog'
import type { SopGroupRow } from '../types'

/** SOP Tasks — the SOP groups (checklists) and who they're assigned to. */
export function SopGroupListPage() {
  const list = useSopGroupList()

  const columns = useMemo<ColumnDef<SopGroupRow>[]>(
    () => [
      {
        id: 'serial',
        header: 'Sr No.',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row, table }) => <span className="text-sm">{rowNumber(row, table)}</span>,
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <RowActionsMenu
            actions={[
              { label: 'View Checklist', icon: Eye, onSelect: () => list.setPreview(row.original) },
              ...(list.access.canUpdate
                ? [
                    { label: 'Edit Group', icon: Pencil, onSelect: () => list.goToEdit(row.original.id) },
                    {
                      label: 'Assign Employees',
                      icon: UserPlus,
                      onSelect: () => list.goToAssign(row.original.id),
                    },
                  ]
                : []),
              ...(list.canViewAssignments
                ? [
                    {
                      label: 'View Assignments',
                      icon: UserCheck,
                      onSelect: () => list.viewAssignments(row.original.id),
                    },
                  ]
                : []),
              // Gone for good once anyone has worked a run (R1) — Stop its assignments instead.
              ...(list.access.canDelete && row.original.canDelete
                ? [
                    {
                      label: 'Delete',
                      icon: Trash2,
                      destructive: true,
                      separated: true,
                      onSelect: () => list.setPendingDelete(row.original),
                    },
                  ]
                : []),
            ]}
          />
        ),
      },
      {
        id: SOP_GROUP_SORT.name,
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="SOP Group" />,
        cell: ({ row }) => (
          <button type="button" className="cursor-pointer text-left" onClick={() => list.setPreview(row.original)}>
            <p className="font-medium hover:text-primary">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.itemsCount} checklist task{row.original.itemsCount === 1 ? '' : 's'}
            </p>
          </button>
        ),
      },
      {
        accessorKey: 'appliesTo',
        header: 'Assign By',
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <p className="flex items-center gap-1.5">
              {row.original.appliesTo || '—'}
              {row.original.targetLocked && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Lock className="size-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>Employees run this group, so who it applies to is fixed</TooltipContent>
                </Tooltip>
              )}
            </p>
            <p className="text-xs capitalize text-muted-foreground">{row.original.pickBy}</p>
          </div>
        ),
      },
      {
        accessorKey: 'tasksPerDay',
        header: 'Tasks / Day',
        enableSorting: false,
        cell: ({ row }) => <span className="font-medium">{row.original.tasksPerDay}</span>,
      },
      {
        id: 'rules',
        header: 'Rules',
        enableSorting: false,
        cell: ({ row }) => <RuleIcons photo={row.original.anyPhoto} approval={row.original.anyApproval} />,
      },
      {
        accessorKey: 'activeAssignees',
        header: 'Assigned',
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            disabled={!list.canViewAssignments}
            onClick={() => list.viewAssignments(row.original.id)}
            className="flex cursor-pointer items-center gap-1.5 text-sm hover:text-primary disabled:cursor-default disabled:hover:text-inherit"
          >
            <Users className="size-4 text-muted-foreground" />
            {row.original.activeAssignees} employee{row.original.activeAssignees === 1 ? '' : 's'}
          </button>
        ),
      },
      ...auditColumns<SopGroupRow>({ createdAt: SOP_GROUP_SORT.createdAt }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list.access.canUpdate, list.access.canDelete, list.canViewAssignments],
  )

  const addButton = list.access.canCreate ? (
    <Button onClick={list.goToCreate}>
      <Plus className="size-4" />
      Add SOP Group
    </Button>
  ) : undefined

  return (
    <div>
      <PageHeader
        title="SOP Tasks"
        description="Checklists for a designation or role, assigned to employees as daily tasks."
        actions={
          list.companyId === null ? undefined : (
            <>
              {list.canViewAssignments && (
                <Button variant="outline" onClick={() => list.viewAssignments()}>
                  <UserCheck className="size-4" />
                  View Assignments
                </Button>
              )}
              {addButton}
            </>
          )
        }
      />

      {list.companyId === null ? (
        <CompanyRequired what="SOP groups" />
      ) : list.isError ? (
        <ScopedDataError error={list.error} fallback="Couldn't load the SOP groups." what="SOP groups" />
      ) : (
      <DataTable
        columns={columns}
        data={list.rows}
        isLoading={list.isLoading}
        searchPlaceholder="Search SOP groups…"
        itemName="groups"
        pageSizeOptions={[5, 10, 25, 50]}
        serverPagination
        limit={list.limit}
        offset={list.offset}
        total={list.total}
        onPaginationChange={list.onPaginationChange}
        searchValue={list.search}
        onSearchChange={list.setSearch}
        manualSorting
        sorting={list.sorting}
        onSortingChange={list.onSortingChange}
        emptyState={
          <EmptyState
            icon={ListChecks}
            title={list.search ? 'No matching SOP groups' : 'No SOP groups yet'}
            description={
              list.search ? 'Try a different search term.' : 'Create a checklist and assign it to employees.'
            }
            action={list.search ? undefined : addButton}
          />
        }
      />
      )}

      <ChecklistPreviewDialog template={list.preview} onClose={() => list.setPreview(null)} />

      <ConfirmDialog
        open={list.pendingDelete !== null}
        onOpenChange={(open) => !open && list.setPendingDelete(null)}
        variant="destructive"
        icon={ListChecks}
        title="Delete SOP group?"
        description={
          list.pendingDelete
            ? `"${list.pendingDelete.name}", its checklist and all ${list.pendingDelete.activeAssignees} of its assignment(s) will be removed. Nobody has started work on it yet, so no history is lost.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={list.isDeleting}
        keepOpenOnConfirm
        onConfirm={list.confirmDelete}
      />
    </div>
  )
}
