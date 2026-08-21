import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarOff, Pin, Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { ScopedDataError } from '@/features/company'
import { WEEKOFF_POLICY_SORT } from '../constants'
import { flexibleWeekoffCaption, ruleLabel } from '../lib/weekoff-policy-mappers'
import { useWeekoffPolicyList } from '../hooks/use-weekoff-policy-list'
import { WeekoffDefaultDialog } from '../components/weekoff-default-dialog'
import type { WeekoffPolicy } from '../types'

/**
 * Week-off policies — which days of the week don't count as working days.
 *
 * Each row shows its whole rule set as badges rather than a count: "2nd & 4th
 * Sat" *is* the policy, and a row reading "4 rules" would tell a user nothing
 * they came here to find out.
 *
 * The Pin action is the one write that isn't CRUD — it makes a policy the default
 * for a company or a department, which is what decides the pattern for every shift
 * that doesn't name its own.
 */
export function WeekoffPolicyListPage() {
  const list = useWeekoffPolicyList()

  // Which of this screen's buttons this role may see.
  const { canCreate, canUpdate, canDelete } = useResourceAccess(
    PERMISSIONS.weekoffPolicies,
  )

  const columns = useMemo<ColumnDef<WeekoffPolicy>[]>(
    () => [
      {
        id: 'serial',
        header: 'Sr No.',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {list.offset + row.index + 1}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="text-xs font-medium uppercase">Actions</span>,
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Set as default"
                  onClick={() => list.pinDefault.startPinning(row.original)}
                  className="grid size-8 cursor-pointer place-items-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                >
                  <Pin className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Set as default</TooltipContent>
            </Tooltip>
            <TableRowActions
              onEdit={canUpdate ? () => list.goToEdit(row.original.id) : undefined}
              onDelete={canDelete ? () => list.setPendingDelete(row.original) : undefined}
            />
          </div>
        ),
      },
      {
        // Sortable columns are keyed by the API's own field name, so a header
        // click travels to `?sort=` untranslated.
        id: WEEKOFF_POLICY_SORT.name,
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Policy Name" />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.name}</span>
        ),
      },
      {
        id: 'pattern',
        header: 'Pattern',
        enableSorting: false,
        meta: { className: 'min-w-64' },
        cell: ({ row }) =>
          /*
            A flexible policy names no weekday at all — that's the point of it, not
            a gap — so the count is the pattern rather than an empty badge list.
          */
          row.original.offType === 'FLEXIBLE' ? (
            <Badge variant="secondary">
              {row.original.weeklyOffDays === null
                ? 'Any days'
                : flexibleWeekoffCaption(row.original.weeklyOffDays)}
            </Badge>
          ) : row.original.days.length === 0 ? (
            <span className="text-muted-foreground">No rules</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {row.original.days.map((day) => (
                <Badge
                  key={day.id}
                  // A working-day exception is the opposite of a week off, so it
                  // can't wear the same badge as one.
                  variant={day.isOff ? 'secondary' : 'warning'}
                >
                  {ruleLabel(day)}
                </Badge>
              ))}
            </div>
          ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant={row.original.status ? 'success' : 'secondary'}>
            {row.original.status ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      // Only `created_at` is sortable; "Updated" renders without the control.
      ...auditColumns<WeekoffPolicy>({ createdAt: WEEKOFF_POLICY_SORT.createdAt }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list.offset, canUpdate, canDelete],
  )

  if (list.isForbidden) return <Forbidden description={list.forbiddenMessage} />

  return (
    <div>
      <PageHeader
        title="Week-Off Policy"
        description="The days that don't count as working days — per week, or per occurrence in the month."
        actions={
          canCreate && (
            <Button onClick={list.goToCreate}>
              <Plus className="size-4" />
              Add Week-Off Policy
            </Button>
          )
        }
      />

      {list.isError ? (
        <ScopedDataError
          error={list.error}
          fallback="Couldn't load week-off policies."
          what="week-off policies"
        />
      ) : (
        <DataTable
          columns={columns}
          data={list.rows}
          isLoading={list.isLoading}
          searchPlaceholder="Search policies…"
          itemName="policies"
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
              icon={CalendarOff}
              title={list.search ? 'No matching policies' : 'No week-off policies yet'}
              description={
                list.search
                  ? 'Try a different search term.'
                  : "Without one, every shift falls back to the platform's Sunday-only pattern."
              }
              action={
                list.search
                  ? undefined
                  : canCreate && (
                      <Button onClick={list.goToCreate}>
                        <Plus className="size-4" />
                        Add Week-Off Policy
                      </Button>
                    )
              }
            />
          }
        />
      )}

      <WeekoffDefaultDialog pin={list.pinDefault} />

      <ConfirmDialog
        open={list.pendingDelete !== null}
        onOpenChange={(open) => !open && list.setPendingDelete(null)}
        variant="destructive"
        icon={CalendarOff}
        title="Delete week-off policy?"
        description={
          list.pendingDelete
            ? `"${list.pendingDelete.name}" will be removed. A policy still set as a default, or named by a shift, can't be deleted.`
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
