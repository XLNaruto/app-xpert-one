import { useMemo } from 'react'
import { Controller } from 'react-hook-form'
import type { ColumnDef } from '@tanstack/react-table'
import { Clock, History, Moon } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DateField } from '@/components/common/date-field'
import { Field } from '@/components/common/form-field'
import { FormSection } from '@/components/common/form-section'
import { TableRowActions } from '@/components/common/table-row-actions'
import { TimeField } from '@/components/common/time-field'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDate } from '@/lib/utils'
import { auditColumns, DataTable, DataTableColumnHeader } from '@/components/data-table'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { LATE_CHECK_IN_PENALTY_TYPE_OPTIONS, SHIFT_SORT } from '../constants'
import { formatLateCheckInPenalty, formatShiftWindow } from '../lib/shift-mappers'
import { ShiftHistoryDialog } from './shift-history-dialog'
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
 *
 * **A shift is a timeline.** Its rules hang off dated versions, so a row shows the
 * timings in force for the day the list read — future-date a change and the row
 * goes on showing the old ones until that date arrives, which is correct rather
 * than stale. The clock icon on each row opens the whole history.
 */
export function CompanyShiftTab({ companyId }: CompanyShiftTabProps) {
  const list = useShiftList(companyId)
  // The tab is both the shift form and the shift list, so it needs all four.
  const { canCreate, canUpdate, canDelete, canManage } = useResourceAccess(
    PERMISSIONS.shifts,
  )
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
          <div className="flex items-center gap-2">
            <TableRowActions
              onEdit={canUpdate ? () => list.setEditing(row.original) : undefined}
              onDelete={canDelete ? () => list.setPendingDelete(row.original) : undefined}
            />
            {/*
              Gated on `shifts:read` like the list itself — the history is the same
              record read across time, not a separate right.
            */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Update history"
                  onClick={() => list.setHistoryFor(row.original)}
                  className="grid size-8 cursor-pointer place-items-center rounded-lg bg-slate-500/10 text-slate-600 transition-colors hover:bg-slate-500/20 dark:text-slate-300"
                >
                  <History className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Update history</TooltipContent>
            </Tooltip>
          </div>
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
        id: 'effectiveDate',
        header: 'Effective From',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        // Which dated version these timings are. A row dated ahead of today is a
        // change that hasn't arrived yet, so the shift still works the old hours.
        cell: ({ row }) =>
          row.original.effectiveDate ? formatDate(row.original.effectiveDate) : '—',
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
        meta: { className: 'whitespace-nowrap' },
        // The allowance and whether going over it costs anything read as one fact,
        // so they share a cell rather than widening the table by a column.
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span>{row.original.breakMinutes} min</span>
            {row.original.isLateBreakPenaltyApplicable && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary">Penalty</Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-56 text-pretty font-normal">
                  Break time beyond this is deducted from pay
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'concessionMinutes',
        header: 'Concession',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        // Same reading as the break cell: the grace and what overrunning it costs
        // are one fact, so the penalty rides along as a badge rather than a column.
        cell: ({ row }) => {
          const penalty = formatLateCheckInPenalty(row.original)
          return (
            <div className="flex items-center gap-2">
              <span>{row.original.concessionMinutes} min</span>
              {row.original.isLateCheckInPenaltyApplicable && penalty && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary">{penalty}</Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-56 text-pretty font-normal">
                    Deducted from pay for each late day
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )
        },
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
        id: 'weekoffPolicy',
        header: 'Week-Off',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        // Naming no policy is the ordinary case, and it isn't "none" — the
        // department's default answers, then the company's. The cell says which
        // situation the row is in rather than leaving a blank.
        cell: ({ row }) =>
          row.original.weekoffPolicyId === null ? (
            <span className="text-xs text-muted-foreground">Follows default</span>
          ) : (
            <Badge variant="secondary">
              {list.weekoffPolicyNames.get(row.original.weekoffPolicyId) ??
                `#${row.original.weekoffPolicyId}`}
            </Badge>
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
    [list.weekoffPolicyNames, canUpdate, canDelete],
  )

  return (
    <div>
      {/*
        Its own form element, submitted on its own — the company detail tab has a
        separate one, and nesting the two would be invalid markup.
      */}
      {canManage && (
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
          {/*
            The date is the edit's whole point: an edit WRITES A NEW VERSION from
            here rather than overwriting what came before, so days already closed
            go on resolving against the rules they were actually judged by. Name
            and status aren't versioned — changing only those sends no date.
          */}
          <DateField
            control={form.control}
            name="effectiveDate"
            label="These Timings Apply From"
            required
            error={form.errors.effectiveDate?.message}
            hint={
              form.isEdit
                ? "A new dated version is written from this day. Earlier days keep being judged by the timings that were in force when they happened — this is what stops an edit changing last month's attendance. Change only the name or status and no version is written at all."
                : 'The day these timings start applying. It opens the shift\'s timeline.'
            }
          />
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
            hint="Filled in from the start plus the full day hours — pick your own instead and the hours follow. An end earlier than the start makes this a night shift, worked out for you."
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
            label="Full Day Hours"
            error={form.errors.minFullDayHours?.message}
            hint="Worked hours at or above this count as a full day. Filled in from the shift window, and typing a number here moves the end time to match. The break isn't taken off — it's charged by its own penalty."
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
            hint="Worked hours at or above this, but under a full day, count as a half day. Filled in as half the full day — type over it and your number stands, so 3 against a full day of 8 is fine."
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

          {/*
          Clearable, and blank by default: most shifts name no pattern of their own
          and fall back to the department's default, then the company's, then the
          platform's Sunday-only constant. Naming one here overrides all three for
          this shift alone.
        */}
          <Field
            label="Week-Off Policy"
            hint="Leave blank to follow the department's or company's default pattern. Set one only for a shift whose off days differ from everyone else's."
          >
            <Controller
              control={form.control}
              name="weekoffPolicyId"
              render={({ field }) => (
                <Combobox
                  className="w-full"
                  value={field.value}
                  onChange={field.onChange}
                  options={form.weekoffPolicySelectOptions}
                  clearable
                  panelMinWidth={340}
                  placeholder={
                    form.isWeekoffPoliciesLoading ? 'Loading…' : 'Follows default'
                  }
                  searchPlaceholder="Search policy"
                />
              )}
            />
          </Field>

          <Field
            label="Late Check-In Penalty"
            hint="Deduct pay when a check-in falls outside the concession above — the whole day charged once, shown on the payslip as the penalty. Off reports the lateness without charging it."
          >
            <div className="flex h-9 items-center gap-2">
              <Controller
                control={form.control}
                name="isLateCheckInPenaltyApplicable"
                render={({ field }) => (
                  <>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Late check-in penalty"
                    />
                    <span className="text-xs text-muted-foreground">
                      {field.value ? 'Deducted' : 'Not deducted'}
                    </span>
                  </>
                )}
              />
            </div>
          </Field>

          {/*
            Only while the switch is on: the API rejects it without a rule behind
            it, and the rule is meaningless without it. The two keep their values
            when it's switched off, so suspending the penalty doesn't lose them.
          */}
          {form.isLateCheckInPenaltyApplicable && (
            <>
              <Field
                label="Penalty Type"
                required
                error={form.errors.lateCheckInPenaltyType?.message}
                hint="A share of that day's wage, or a flat amount."
              >
                <Controller
                  control={form.control}
                  name="lateCheckInPenaltyType"
                  render={({ field }) => (
                    <Combobox
                      className="w-full"
                      value={field.value}
                      onChange={field.onChange}
                      options={LATE_CHECK_IN_PENALTY_TYPE_OPTIONS}
                      placeholder="Select"
                      searchPlaceholder="Search type"
                    />
                  )}
                />
              </Field>

              <Field
                label={
                  form.lateCheckInPenaltyType === 'FIXED'
                    ? 'Penalty Amount (₹)'
                    : 'Penalty (%)'
                }
                required
                error={form.errors.lateCheckInPenaltyValue?.message}
                hint="What one late day costs — 5 minutes late and 50 minutes late cost the same, since the minutes only decide whether the day is late."
              >
                <Input
                  type="number"
                  min={0}
                  max={form.lateCheckInPenaltyType === 'FIXED' ? 1000000 : 100}
                  step={form.lateCheckInPenaltyType === 'FIXED' ? 1 : 0.5}
                  placeholder={form.lateCheckInPenaltyType === 'FIXED' ? '150' : '10'}
                  {...form.register('lateCheckInPenaltyValue')}
                />
              </Field>
            </>
          )}
          <Field
            label="Break Penalty"
            hint="Deduct pay for break time taken beyond the break above — the extra minutes only, at the daily wage's per-minute rate, shown on the payslip as the lunch deduction. Off reports the extra time without charging it."
          >
            <div className="flex h-9 items-center gap-2">
              <Controller
                control={form.control}
                name="isLateBreakPenaltyApplicable"
                render={({ field }) => (
                  <>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Break penalty"
                    />
                    <span className="text-xs text-muted-foreground">
                      {field.value ? 'Deducted' : 'Not deducted'}
                    </span>
                  </>
                )}
              />
            </div>
          </Field>

          <Field
            label="Status"
            hint="An inactive shift stays on record but shouldn't be rostered against going forward."
          >
            <div className="flex h-9 items-center gap-2">
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Shift active"
                    />
                    <span className="text-xs text-muted-foreground">
                      {field.value ? 'Active' : 'Inactive'}
                    </span>
                  </>
                )}
              />
            </div>
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
            {(form.isEdit ? canUpdate : canCreate) && (
              <Button type="submit" disabled={form.isPending}>
                {form.isPending ? 'Saving…' : form.isEdit ? 'Save Shift' : 'Add Shift'}
              </Button>
            )}
          </div>
        </form>
      )}

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

      <ShiftHistoryDialog
        shift={list.historyFor}
        onClose={() => list.setHistoryFor(null)}
      />

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
