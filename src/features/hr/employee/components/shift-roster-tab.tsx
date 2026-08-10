import { useMemo } from 'react'
import { Controller } from 'react-hook-form'
import type { ColumnDef } from '@tanstack/react-table'
import {
  CalendarClock,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Clock,
  Moon,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { DatePicker } from '@/components/ui/date-picker'
import { MonthPicker } from '@/components/ui/month-picker'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DataTable } from '@/components/data-table'
import { DetailItem } from '@/components/common/detail-item'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Field } from '@/components/common/form-field'
import { FormSection } from '@/components/common/form-section'
import { DateField } from '@/components/common/date-field'
import { Forbidden } from '@/features/error'
import { formatShiftWindow } from '@/features/master/shift'
import { formatDate } from '@/lib/utils'
import { ASSIGNMENT_MODE_OPTIONS } from '../constants'
import {
  assignmentLabel,
  SHIFT_SOURCE_LABELS,
} from '../lib/employee-shift-mappers'
import { useEmployeeShiftTab } from '../hooks/use-employee-shift-tab'
import { StepDialog } from './step-dialog'
import { StepNavFooter } from './step-nav-footer'
import type { EmployeeRosterEntry, EmployeeShiftAssignment } from '../types'

/**
 * Step 9 — Shift & Roster.
 *
 * The screen is built around the fact that an employee's shift is *resolved*, not
 * stored: the card at the top asks the server which shift answers for a date and
 * which link of the chain answered it, and the two tables below are the only two
 * places a human can intervene — the effective-dated assignment timeline, and the
 * per-date roster that outranks everything.
 *
 * An EMPTY timeline is the ordinary, healthy state. Most employees work their
 * department's or company's default shift and need no row here at all, which is why
 * the empty state explains rather than nags.
 */
export function ShiftRosterTab({
  employeeId,
  onContinue,
  onBack,
}: {
  employeeId: number
  onContinue: () => void
  onBack: () => void
}) {
  const tab = useEmployeeShiftTab(employeeId)

  const timelineColumns = useMemo<ColumnDef<EmployeeShiftAssignment>[]>(
    () => [
      {
        id: 'serial',
        header: 'Sr No.',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.index + 1}</span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="text-xs font-medium uppercase">Actions</span>,
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        // Delete is for a MISTYPED entry only, never for ending an assignment —
        // hence the wording here and the warning in the confirm dialog.
        cell: ({ row }) => (
          <IconAction
            label="Remove entry (typed by mistake)"
            icon={Trash2}
            onClick={() => tab.setPendingAssignmentDelete(row.original)}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
          />
        ),
      },
      {
        accessorKey: 'effectiveDate',
        header: 'Effective From',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.effectiveDate ? formatDate(row.original.effectiveDate) : '—',
      },
      {
        id: 'assignment',
        header: 'Assignment',
        enableSorting: false,
        meta: { className: 'min-w-56' },
        cell: ({ row }) => {
          const entry = row.original
          const isDefault = entry.shiftId === null && entry.rotationId === null
          return (
            <div className="flex items-center gap-2">
              {entry.rotationId !== null ? (
                <Badge variant="secondary">
                  <RefreshCw className="mr-1 size-3" />
                  Rotation
                </Badge>
              ) : entry.shiftId !== null ? (
                <Badge variant="secondary">
                  <Clock className="mr-1 size-3" />
                  Shift
                </Badge>
              ) : (
                <Badge variant="warning">Ends assignment</Badge>
              )}
              <span
                className={
                  isDefault ? 'text-sm text-muted-foreground' : 'font-medium text-foreground'
                }
              >
                {assignmentLabel(entry)}
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: 'createdBy',
        header: 'Entered By',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.createdBy || '—'}
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const rosterColumns = useMemo<ColumnDef<EmployeeRosterEntry>[]>(
    () => [
      {
        id: 'serial',
        header: 'Sr No.',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.index + 1}</span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="text-xs font-medium uppercase">Actions</span>,
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap' },
        cell: ({ row }) => (
          <IconAction
            label="Drop this override"
            icon={Trash2}
            onClick={() => tab.setPendingRosterDelete(row.original)}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
          />
        ),
      },
      {
        accessorKey: 'workDate',
        header: 'Date',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (row.original.workDate ? formatDate(row.original.workDate) : '—'),
      },
      {
        accessorKey: 'shiftName',
        header: 'Shift',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.shiftName || `#${row.original.shiftId}`}
          </span>
        ),
      },
      {
        accessorKey: 'sourceType',
        header: 'Source',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        // MANUAL is somebody's decision; the other two were laid down by the
        // system, and a manager reading the table needs to know which is which.
        cell: ({ row }) => (
          <Badge variant={row.original.sourceType === 'MANUAL' ? 'default' : 'secondary'}>
            {row.original.sourceType === 'MANUAL' ? 'Manual' : row.original.sourceType}
          </Badge>
        ),
      },
      {
        accessorKey: 'createdBy',
        header: 'Rostered By',
        enableSorting: false,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.createdBy || '—'}
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  if (tab.isForbidden) return <Forbidden description={tab.forbiddenMessage} />

  const assignErrors = tab.assignForm.formState.errors
  const rosterErrors = tab.rosterForm.formState.errors
  const mode = tab.assignForm.watch('mode')

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <FormSection
          icon={CalendarClock}
          title="Shift & Roster"
          description="Which shift this employee works — and, when they deviate from the default, why"
          className="mt-0 flex-1"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={tab.hasNoShifts}
            onClick={() => tab.openRoster()}
          >
            <CalendarClock className="size-4" />
            Override a Date
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={tab.hasNoShifts}
            onClick={tab.openAssign}
          >
            <Clock className="size-4" />
            Assign Shift / Rotation
          </Button>
        </div>
      </div>

      {tab.hasNoShifts && (
        <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          This employee's company has no shifts yet. Add them on the company's Shift
          tab first — there is nothing to assign or roster until then.
        </p>
      )}

      {/* ── The resolved answer ─────────────────────────────────────────── */}

      <div className="mt-6 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Shift on a given day</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Answered live by walking roster → rotation → assignment → department →
              company. Any date works, past or future.
            </p>
          </div>
          <div className="w-44">
            <Field label="Date">
              <DatePicker value={tab.lookupDate} onChange={tab.setLookupDate} />
            </Field>
          </div>
        </div>

        <div className="mt-4">
          {tab.isResolving ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : tab.resolveError ? (
            <p className="text-sm text-destructive">
              {tab.resolveError instanceof Error
                ? tab.resolveError.message
                : "Couldn't work out the shift for that date."}
            </p>
          ) : !tab.resolved ? (
            <p className="text-sm text-muted-foreground">Pick a date to resolve.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <DetailItem
                icon={Clock}
                label="Shift"
                value={
                  tab.resolved.shift
                    ? `${tab.resolved.shift.shiftName} (${formatShiftWindow(tab.resolved.shift)})`
                    : null
                }
              />
              {/*
                The source is the whole point of this card: it says whether there's
                anything on this screen to undo, or whether the answer comes from a
                default set elsewhere.
              */}
              <DetailItem
                icon={CalendarClock}
                label="Because"
                value={
                  tab.resolved.source ? SHIFT_SOURCE_LABELS[tab.resolved.source] : null
                }
              />
              <div className="flex flex-wrap items-center gap-2">
                {tab.resolved.isWeekOff && (
                  <Badge variant="warning">
                    <CalendarOff className="mr-1 size-3" />
                    Week off
                  </Badge>
                )}
                {tab.resolved.shift?.isNightShift && (
                  <Badge variant="secondary">
                    <Moon className="mr-1 size-3" />
                    Night shift
                  </Badge>
                )}
                {!tab.resolved.shift && (
                  <span className="text-xs text-muted-foreground">
                    No shift is configured for this employee at any level — attendance
                    falls back to its pre-shift behaviour.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── The assignment timeline ─────────────────────────────────────── */}

      <div className="mt-8">
        <FormSection
          icon={Clock}
          title="Assignment Timeline"
          description="Only needed when the employee deviates from the default — newest first"
        />
        <div className="mt-4">
          {tab.isTimelineError ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {tab.timelineError instanceof Error
                ? tab.timelineError.message
                : "Couldn't load the assignment timeline."}
            </p>
          ) : (
            <DataTable
              columns={timelineColumns}
              data={tab.timelineRows}
              isLoading={tab.isTimelineLoading}
              itemName="assignments"
              pageSize={5}
              pageSizeOptions={[5, 10, 25]}
              emptyState={
                <EmptyState
                  icon={Clock}
                  title="On the default shift"
                  description="An empty timeline is the normal state — this employee follows their department's or company's default shift. Add an entry only if they work something else."
                />
              }
            />
          )}
        </div>
      </div>

      {/* ── The roster ──────────────────────────────────────────────────── */}

      <div className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <FormSection
            icon={CalendarClock}
            title="Date Overrides"
            description="The dates somebody rostered by hand — they outrank the rotation and every default"
            className="flex-1"
          />
          {/*
            A roster is read a month at a time, and the endpoint requires a window,
            so the window is the control rather than a page number.
          */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label="Previous month"
              onClick={tab.goToPreviousMonth}
            >
              <ChevronLeft className="size-4" />
            </Button>
            {/* Stepping is for the month either side; the picker is for the one
                six months out. */}
            <MonthPicker
              size="sm"
              className="w-[130px]"
              value={tab.month}
              onChange={tab.goToMonth}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={tab.goToThisMonth}
              title="Back to this month"
            >
              This month
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label="Next month"
              onClick={tab.goToNextMonth}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4">
          {tab.isRosterError ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {tab.rosterError instanceof Error
                ? tab.rosterError.message
                : "Couldn't load the roster."}
            </p>
          ) : (
            <DataTable
              columns={rosterColumns}
              data={tab.rosterRows}
              isLoading={tab.isRosterLoading}
              itemName="overrides"
              pageSize={5}
              pageSizeOptions={[5, 10, 25]}
              emptyState={
                <EmptyState
                  icon={CalendarClock}
                  title="No overrides this month"
                  description="Ordinary days aren't rows here — they resolve from the rotation, the assignment or a default. Override a date only for a one-off."
                />
              }
            />
          )}
        </div>
      </div>

      <StepNavFooter onContinue={onContinue} onBack={onBack} continueLabel="Finish">
        Ending an assignment is an entry naming neither a shift nor a rotation —
        never a deletion, which would rewrite closed days.
      </StepNavFooter>

      {/* ── Assign a shift or rotation ──────────────────────────────────── */}

      <StepDialog
        open={tab.dialog === 'assign'}
        onOpenChange={(open) => !open && tab.closeDialog()}
        title="Assign Shift / Rotation"
        description="Effective-dated and append-only: the entry says what the employee works from this date on."
        onSubmit={tab.onSubmitAssignment}
        isPending={tab.isAssigning}
        submitLabel="Save Assignment"
      >
        <Field label="Assign" required error={assignErrors.mode?.message}>
          <Controller
            control={tab.assignForm.control}
            name="mode"
            render={({ field }) => (
              <Combobox
                className="w-full"
                searchable={false}
                value={field.value}
                onChange={field.onChange}
                options={ASSIGNMENT_MODE_OPTIONS}
                placeholder="Select"
              />
            )}
          />
        </Field>

        <DateField
          control={tab.assignForm.control}
          name="effectiveDate"
          label="Effective From"
          required
          error={assignErrors.effectiveDate?.message}
          hint={
            mode === 'rotation'
              ? "Also the cycle's anchor — week 1 of the rotation starts on this date."
              : 'The date this takes effect.'
          }
        />

        {mode === 'shift' && (
          <Field
            label="Shift"
            required
            error={assignErrors.shiftId?.message}
            className="sm:col-span-2"
          >
            <Controller
              control={tab.assignForm.control}
              name="shiftId"
              render={({ field }) => (
                <Combobox
                  className="w-full"
                  panelMinWidth={320}
                  value={field.value}
                  onChange={field.onChange}
                  options={tab.shiftSelectOptions}
                  placeholder={tab.isShiftsLoading ? 'Loading…' : 'Select shift'}
                  searchPlaceholder="Search shift"
                />
              )}
            />
          </Field>
        )}

        {mode === 'rotation' && (
          <Field
            label="Rotation"
            required
            error={assignErrors.rotationId?.message}
            className="sm:col-span-2"
          >
            <Controller
              control={tab.assignForm.control}
              name="rotationId"
              render={({ field }) => (
                <Combobox
                  className="w-full"
                  panelMinWidth={320}
                  value={field.value}
                  onChange={field.onChange}
                  options={tab.rotationSelectOptions}
                  placeholder={tab.isRotationsLoading ? 'Loading…' : 'Select rotation'}
                  searchPlaceholder="Search rotation"
                />
              )}
            />
          </Field>
        )}

        {/*
          "Back to default" is a real entry, not a cancel — it's the only correct way
          to END an assignment, since deleting the old entry would change what closed
          days were judged against.
        */}
        {mode === 'default' && (
          <p className="sm:col-span-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            This appends an entry naming no shift and no rotation, which is how the
            API says "back to the department or company default from this date". The
            earlier entries stay on record.
          </p>
        )}
      </StepDialog>

      {/* ── Override one date ───────────────────────────────────────────── */}

      <StepDialog
        open={tab.dialog === 'roster'}
        onOpenChange={(open) => !open && tab.closeDialog()}
        title="Override a Date"
        description="The most specific statement there is — it outranks the rotation and every default for this one date."
        onSubmit={tab.onSubmitRoster}
        isPending={tab.isRostering}
        submitLabel="Save Override"
      >
        <DateField
          control={tab.rosterForm.control}
          name="workDate"
          label="Date"
          required
          error={rosterErrors.workDate?.message}
          hint="Rostering a date that already has an override replaces it — changing your mind is an ordinary correction."
        />

        <Field label="Shift" required error={rosterErrors.shiftId?.message}>
          <Controller
            control={tab.rosterForm.control}
            name="shiftId"
            render={({ field }) => (
              <Combobox
                className="w-full"
                panelMinWidth={320}
                value={field.value}
                onChange={field.onChange}
                options={tab.shiftSelectOptions}
                placeholder={tab.isShiftsLoading ? 'Loading…' : 'Select shift'}
                searchPlaceholder="Search shift"
              />
            )}
          />
        </Field>
      </StepDialog>

      {/* ── Deletes ─────────────────────────────────────────────────────── */}

      <ConfirmDialog
        open={tab.pendingAssignmentDelete !== null}
        onOpenChange={(open) => !open && tab.setPendingAssignmentDelete(null)}
        variant="destructive"
        icon={Clock}
        title="Remove this timeline entry?"
        description={
          tab.pendingAssignmentDelete
            ? `Only do this if the entry was typed by mistake. Removing the entry effective ${formatDate(tab.pendingAssignmentDelete.effectiveDate)} rewrites which shift the employee was judged against on days that are already closed — to END an assignment, add an entry naming no shift instead.`
            : undefined
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        loading={tab.isDeletingAssignment}
        keepOpenOnConfirm
        onConfirm={tab.confirmAssignmentDelete}
      />

      <ConfirmDialog
        open={tab.pendingRosterDelete !== null}
        onOpenChange={(open) => !open && tab.setPendingRosterDelete(null)}
        variant="destructive"
        icon={CalendarClock}
        title="Drop this date override?"
        description={
          tab.pendingRosterDelete
            ? `${formatDate(tab.pendingRosterDelete.workDate)} goes back to resolving from the rotation, the assignment or a default. Nothing about history changes.`
            : undefined
        }
        confirmLabel="Drop"
        cancelLabel="Cancel"
        loading={tab.isDeletingRosterEntry}
        keepOpenOnConfirm
        onConfirm={tab.confirmRosterDelete}
      />
    </div>
  )
}

/** A soft-tinted square icon button for a row action. */
function IconAction({
  label,
  icon: Icon,
  onClick,
  className,
}: {
  label: string
  icon: typeof Trash2
  onClick: () => void
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={`grid size-8 cursor-pointer place-items-center rounded-lg transition-colors ${className ?? ''}`}
        >
          <Icon className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
