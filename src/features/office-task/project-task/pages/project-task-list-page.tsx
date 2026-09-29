import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CircleDot, Flag, FolderKanban, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { FilterBar } from '@/components/common/filter-bar'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox } from '@/components/ui/combobox'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { cn, formatDate } from '@/lib/utils'
import { CompanyRequired, ScopedDataError } from '@/features/company'
import {
  deadlineInfo,
  frequencyLabel,
  PeopleChips,
  PriorityBadge,
  PRIORITY_OPTIONS,
  ProgressBar,
  TaskStatusBadge,
  type Priority,
} from '@/features/office-task/common'
import { PROJECT_PRIORITY_FILTER, PROJECT_STATUS_FILTER, PROJECT_TASK_SORT } from '../constants'
import { useProjectTaskList } from '../hooks/use-project-task-list'
import { ProjectTaskFormDrawer } from '../components/project-task-form-drawer'
import { ProjectTaskBulkBar } from '../components/project-task-bulk-bar'
import type { ProjectTaskRow } from '../types'

/** Project Tasks — the list, with a drawer to add or edit a task; View opens its detail page. */
export function ProjectTaskListPage() {
  const list = useProjectTaskList()

  const columns = useMemo<ColumnDef<ProjectTaskRow>[]>(
    () => [
      {
        id: 'select',
        enableSorting: false,
        meta: { className: 'w-px' },
        header: () => (
          <Checkbox
            aria-label="Select all"
            checked={list.allChecked}
            indeterminate={list.someChecked}
            onChange={(e) => list.toggleAll(e.target.checked)}
          />
        ),
        // A completed task is read-only (R13) — nothing to bulk-edit.
        cell: ({ row }) =>
          row.original.isCompleted ? null : (
            <Checkbox
              aria-label="Select row"
              checked={list.selected.has(row.original.id)}
              onChange={(e) => list.toggle(row.original.id, e.target.checked)}
            />
          ),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <TableRowActions
            onView={list.access.canView ? () => list.openView(row.original.id) : undefined}
            onEdit={
              list.access.canUpdate && !row.original.isCompleted
                ? () => list.openEdit(row.original.id)
                : undefined
            }
            // Gone once any assignee has started (R9) — there's no Stop for a project task.
            onDelete={
              list.access.canDelete && row.original.canDelete
                ? () => list.setPendingDelete(row.original)
                : undefined
            }
          />
        ),
      },
      {
        id: PROJECT_TASK_SORT.task,
        accessorKey: 'task',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Task" />,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => list.openView(row.original.id)}
            className="max-w-72 cursor-pointer text-left"
          >
            <p className="line-clamp-2 font-medium hover:text-primary">{row.original.task}</p>
            {row.original.description && (
              <p className="line-clamp-1 text-xs text-muted-foreground">{row.original.description}</p>
            )}
          </button>
        ),
      },
      {
        id: 'assignees',
        header: 'Assigned To',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <div className="min-w-40 space-y-1">
            <PeopleChips names={row.original.assignees.map((a) => a.name)} />
            <p className="text-xs text-muted-foreground">{row.original.appliesTo}</p>
          </div>
        ),
      },
      {
        id: PROJECT_TASK_SORT.deadline,
        accessorKey: 'deadline',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Schedule" />,
        cell: ({ row }) => {
          const { startDate, deadline, status } = row.original
          const info = deadlineInfo(deadline)
          return (
            <div className="whitespace-nowrap text-sm">
              <p>
                {formatDate(startDate)} → {formatDate(deadline)}
              </p>
              {status !== 'completed' && (
                <p
                  className={cn(
                    'text-xs text-muted-foreground',
                    info.tone === 'danger' && 'font-medium text-destructive',
                    info.tone === 'warning' && 'font-medium text-amber-600 dark:text-amber-400',
                  )}
                >
                  {info.label}
                </p>
              )}
            </div>
          )
        },
      },
      {
        id: 'updates',
        header: 'Updates / Day',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm">{frequencyLabel(row.original.updatesPerDay)}</span>
        ),
      },
      {
        id: 'priority',
        header: 'Priority',
        enableSorting: false,
        // Plain text once completed (R13), or without the update grant.
        cell: ({ row }) =>
          list.access.canUpdate && !row.original.isCompleted ? (
            <Combobox
              className="w-28"
              value={row.original.priority}
              onChange={(v) => v && list.changePriority(row.original, v as Priority)}
              options={PRIORITY_OPTIONS}
              searchable={false}
            />
          ) : (
            <PriorityBadge priority={row.original.priority} />
          ),
      },
      {
        accessorKey: 'progress',
        header: 'Progress',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex w-28 items-center gap-2">
            <ProgressBar percent={row.original.progress} />
            <span className="text-xs text-muted-foreground">{row.original.progress}%</span>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => <TaskStatusBadge status={row.original.status} />,
      },
      ...auditColumns<ProjectTaskRow>({ createdAt: PROJECT_TASK_SORT.createdAt }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list.selected, list.allChecked, list.someChecked, list.rows, list.access],
  )

  const addButton = list.access.canCreate ? (
    <Button onClick={list.openCreate}>
      <Plus className="size-4" />
      Add Task
    </Button>
  ) : undefined

  const drawer = list.drawer

  return (
    <div className="space-y-4">
      <PageHeader
        title="Project Tasks"
        description="Work with a start and a deadline. Assignees record progress from My Tasks."
        actions={list.companyId === null ? undefined : addButton}
      />

      {list.companyId === null ? (
        <CompanyRequired what="project tasks" />
      ) : list.isError ? (
        <ScopedDataError error={list.error} fallback="Couldn't load the project tasks." what="project tasks" />
      ) : (
      <>
      {list.access.canUpdate && list.selected.size > 0 && (
        <ProjectTaskBulkBar ids={[...list.selected]} onClear={list.clearSelection} />
      )}

      <DataTable
        columns={columns}
        data={list.rows}
        isLoading={list.isLoading}
        itemName="tasks"
        pageSizeOptions={[5, 10, 25, 50]}
        serverPagination
        limit={list.limit}
        offset={list.offset}
        total={list.total}
        onPaginationChange={list.onPaginationChange}
        manualSorting
        sorting={list.sorting}
        onSortingChange={list.onSortingChange}
        toolbar={
          <FilterBar
            search={{ value: list.search, onChange: list.setSearch, placeholder: 'Search tasks…' }}
            facets={[
              {
                key: 'status',
                label: 'Status',
                icon: CircleDot,
                value: list.filters.status,
                onChange: (v) => list.changeFilter({ status: v || 'all' }),
                options: PROJECT_STATUS_FILTER,
                searchable: false,
              },
              {
                key: 'priority',
                label: 'Priority',
                icon: Flag,
                value: list.filters.priority,
                onChange: (v) => list.changeFilter({ priority: v || 'all' }),
                options: PROJECT_PRIORITY_FILTER,
                searchable: false,
              },
            ]}
            onReset={list.resetFilters}
          />
        }
        emptyState={
          <EmptyState
            icon={FolderKanban}
            title="No project tasks found"
            description="Add a task and assign it to people by designation or role."
            action={addButton}
          />
        }
      />
      </>
      )}

      <ProjectTaskFormDrawer
        open={drawer?.mode === 'create' || drawer?.mode === 'edit'}
        id={drawer?.mode === 'edit' ? drawer.id : undefined}
        onClose={list.closeDrawer}
      />

      <ConfirmDialog
        open={list.pendingDelete !== null}
        onOpenChange={(open) => !open && list.setPendingDelete(null)}
        variant="destructive"
        icon={FolderKanban}
        title="Delete project task?"
        description={
          list.pendingDelete
            ? `"${list.pendingDelete.task}" and its assignees' empty work records will be removed. Nobody has started it yet.`
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
