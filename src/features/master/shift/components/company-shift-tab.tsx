import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Clock, Moon } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Field } from '@/components/common/form-field'
import { FormSection } from '@/components/common/form-section'
import { TableRowActions } from '@/components/common/table-row-actions'
import { TimeField } from '@/components/common/time-field'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { SHIFT_SORT } from '../constants'
import { formatShiftWindow } from '../lib/shift-mappers'
import { useShiftList } from '../hooks/use-shift-list'
import { useShiftForm } from '../hooks/use-shift-form'
import type { Shift } from '../types'

interface CompanyShiftTabProps {
  /**
   * The company being edited. Shifts hang off a company id, so the tab is only
   * mounted once the company has been saved.
   */
  companyId: number
}

/**
 * The company screen's Shift tab — the add/edit form on top, the company's
 * shifts underneath.
 *
 * It is deliberately NOT part of the company form: a shift is its own record on
 * `/user/shifts`, saved by its own button, so the two never share a submit (and
 * no `<form>` ends up nested inside another).
 */
export function CompanyShiftTab({ companyId }: CompanyShiftTabProps) {
  const list = useShiftList(companyId)
  const form = useShiftForm({
    companyId,
    editing: list.editing,
    onSaved: () => list.setEditing(null),
  })

  const columns = useMemo<ColumnDef<Shift>[]>(
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
            onEdit={() => list.setEditing(row.original)}
            onDelete={() => list.setPendingDelete(row.original)}
          />
        ),
      },
      {
        // Sortable columns are keyed by the API's own field name, so a header
        // click travels to `?sort=` untranslated.
        id: SHIFT_SORT.shiftName,
        accessorKey: 'shiftName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Shift Name" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{row.original.shiftName}</span>
            {/* Derived from the times — a shift ending before it starts crosses midnight. */}
            {row.original.isNightShift && (
              <Badge variant="secondary">
                <Moon className="mr-1 size-3" />
                Night
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: SHIFT_SORT.startTime,
        accessorKey: 'startTime',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Timing" />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-sm">
            {formatShiftWindow(row.original)}
          </span>
        ),
      },
      {
        accessorKey: 'breakMinutes',
        header: 'Break',
        enableSorting: false,
        cell: ({ row }) => `${row.original.breakMinutes} min`,
      },
      {
        accessorKey: 'concessionMinutes',
        header: 'Concession',
        enableSorting: false,
        cell: ({ row }) => `${row.original.concessionMinutes} min`,
      },
      {
        id: 'dayHours',
        header: 'Full / Half Day',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.minFullDayHours} / {row.original.minHalfDayHours} hrs
          </span>
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
      ...auditColumns<Shift>({ createdAt: SHIFT_SORT.createdAt }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div>
      {/*
        Its own form element, submitted on its own — the company detail tab has a
        separate one, and nesting the two would be invalid markup.
      */}
      <form
        onSubmit={form.onSubmit}
        noValidate
        className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <FormSection
          icon={Clock}
          title={form.isEdit ? 'Edit Shift' : 'Add Shift'}
          description="A named window of the clock, and the tolerances attendance is judged against"
          className="mt-0"
        />

        <Field label="Shift Name" required error={form.errors.shiftName?.message}>
          <Input placeholder="General Shift" {...form.register('shiftName')} />
        </Field>
        <TimeField
          control={form.control}
          name="startTime"
          label="Start Time"
          required
          error={form.errors.startTime?.message}
        />
        <TimeField
          control={form.control}
          name="endTime"
          label="End Time"
          required
          error={form.errors.endTime?.message}
          hint="An end earlier than the start makes this a night shift — the flag is worked out for you."
        />
        <Field
          label="Break (minutes)"
          error={form.errors.breakMinutes?.message}
          hint="Unpaid break inside the shift. Leave blank for none."
        >
          <Input
            type="number"
            min={0}
            max={1440}
            placeholder="60"
            {...form.register('breakMinutes')}
          />
        </Field>
        <Field
          label="Concession (minutes)"
          error={form.errors.concessionMinutes?.message}
          hint="Grace after the start time in which a check-in still counts as on time. With 09:00 and 15, arriving at 09:20 is 5 minutes late, not 20."
        >
          <Input
            type="number"
            min={0}
            max={720}
            placeholder="15"
            {...form.register('concessionMinutes')}
          />
        </Field>
        <Field
          label="Early Exit Grace (minutes)"
          error={form.errors.earlyExitGraceMinutes?.message}
          hint="The mirror of the concession at the end of the shift."
        >
          <Input
            type="number"
            min={0}
            max={720}
            placeholder="15"
            {...form.register('earlyExitGraceMinutes')}
          />
        </Field>
        <Field
          label="Full Day Hours"
          error={form.errors.minFullDayHours?.message}
          hint="Worked hours at or above this count as a full day."
        >
          <Input
            type="number"
            min={0.5}
            max={24}
            step={0.5}
            placeholder="8"
            {...form.register('minFullDayHours')}
          />
        </Field>
        <Field
          label="Half Day Hours"
          error={form.errors.minHalfDayHours?.message}
          hint="Worked hours at or above this, but under a full day, count as a half day."
        >
          <Input
            type="number"
            min={0.5}
            max={24}
            step={0.5}
            placeholder="4"
            {...form.register('minHalfDayHours')}
          />
        </Field>

        <div className="col-span-full flex items-center justify-end gap-3 border-t border-border pt-5">
          {form.isEdit && (
            <Button
              type="button"
              variant="outline"
              onClick={form.cancelEdit}
              disabled={form.isPending}
            >
              Cancel Edit
            </Button>
          )}
          <Button type="submit" disabled={form.isPending}>
            {form.isPending ? 'Saving…' : form.isEdit ? 'Save Shift' : 'Add Shift'}
          </Button>
        </div>
      </form>

      <div className="mt-8">
        {list.isForbidden ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {list.forbiddenMessage ?? "You don't have access to this company's shifts."}
          </p>
        ) : list.isError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {list.error instanceof Error ? list.error.message : "Couldn't load shifts."}
          </p>
        ) : (
          <DataTable
            columns={columns}
            data={list.rows}
            isLoading={list.isLoading}
            searchPlaceholder="Search shifts…"
            itemName="shifts"
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
                icon={Clock}
                title={list.search ? 'No matching shifts' : 'No shifts yet'}
                description={
                  list.search
                    ? 'Try a different search term.'
                    : 'Add the first shift using the form above.'
                }
              />
            }
          />
        )}
      </div>

      <ConfirmDialog
        open={list.pendingDelete !== null}
        onOpenChange={(open) => !open && list.setPendingDelete(null)}
        variant="destructive"
        icon={Clock}
        title="Delete shift?"
        description={
          list.pendingDelete
            ? `"${list.pendingDelete.shiftName}" will be removed. A shift still set as a default, or used by an assignment or roster, can't be deleted.`
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
