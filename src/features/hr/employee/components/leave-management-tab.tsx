import { useMemo } from 'react'
import { Controller } from 'react-hook-form'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarDays, Check, History, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DataTable, DataTableColumnHeader } from '@/components/data-table'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { EmptyState } from '@/components/common/empty-state'
import { Field } from '@/components/common/form-field'
import { FormSection } from '@/components/common/form-section'
import { DateField } from '@/components/common/date-field'
import { TableRowActions } from '@/components/common/table-row-actions'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Forbidden } from '@/features/error'
import { formatDate } from '@/lib/utils'
import {
  LEAVE_DURATION_OPTIONS,
  LEAVE_SORT,
  LEAVE_STATUS_FILTER_OPTIONS,
  LEAVE_STATUS_OPTIONS,
} from '../constants'
import { useEmployeeLeaveTab } from '../hooks/use-employee-leave-tab'
import { StepDialog } from './step-dialog'
import { StepFormFooter } from './step-form-footer'
import type { EmployeeLeave } from '../types'

/** Status → badge colour. */
const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive'> = {
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'destructive',
}

/**
 * Step 9 — Leave Management: the leave form, with the history underneath it.
 *
 * The only step whose table is genuinely server-paged, sorted and filtered — a leave
 * register grows without bound, so the endpoint does the work and the table reports
 * pages back as limit/offset.
 *
 * Editing a history row loads it into the form above rather than opening a dialog;
 * the form is already there. Approve and Reject appear on pending rows only, and
 * those do open a dialog, because a decision needs a remark the employee will read
 * and can't be undone.
 */
export function LeaveManagementTab({
  employeeId,
  onBack,
}: {
  employeeId: number
  onBack: () => void
}) {
  const tab = useEmployeeLeaveTab({ employeeId })

  const columns = useMemo<ColumnDef<EmployeeLeave>[]>(
    () => [
      {
        id: 'serial',
        header: 'Sr No.',
        enableSorting: false,
        meta: { className: 'w-px whitespace-nowrap text-center text-muted-foreground' },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {tab.offset + row.index + 1}
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
            {/* Only a pending leave can be decided — a second decision is a 400. */}
            {row.original.status === 'PENDING' && (
              <>
                <DecisionButton
                  label="Approve"
                  icon={Check}
                  onClick={() => tab.startDecision(row.original, 'APPROVED')}
                  className="bg-success/12 text-success hover:bg-success/20"
                />
                <DecisionButton
                  label="Reject"
                  icon={X}
                  onClick={() => tab.startDecision(row.original, 'REJECTED')}
                  className="bg-warning/15 text-warning hover:bg-warning/25"
                />
              </>
            )}
            <TableRowActions
              onEdit={() => tab.startEdit(row.original)}
              onDelete={() => tab.setPendingDelete(row.original)}
            />
          </div>
        ),
      },
      {
        // Sortable columns carry the API's own field name as their id.
        id: LEAVE_SORT.fromDate,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="From Date" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.fromDate ? formatDate(row.original.fromDate) : '—',
      },
      {
        id: LEAVE_SORT.toDate,
        header: ({ column }) => <DataTableColumnHeader column={column} title="To Date" />,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (row.original.toDate ? formatDate(row.original.toDate) : '—'),
      },
      {
        id: LEAVE_SORT.payType,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Pay Type" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => (
          <Badge variant={row.original.payType === 'PAID' ? 'default' : 'warning'}>
            {row.original.payType}
          </Badge>
        ),
      },
      {
        id: LEAVE_SORT.leaveType,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Leave Type" />
        ),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.leaveTypeName || row.original.leaveType || '—'}
          </span>
        ),
      },
      {
        id: LEAVE_SORT.duration,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Duration" />
        ),
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) =>
          row.original.duration === 'HALF_DAY' ? (
            <span>
              Half day
              {row.original.fromTime && (
                <span className="ml-1 text-xs text-muted-foreground">
                  {row.original.fromTime}–{row.original.toTime}
                </span>
              )}
            </span>
          ) : (
            'Full day'
          ),
      },
      {
        id: LEAVE_SORT.status,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        meta: { className: 'whitespace-nowrap' },
        cell: ({ row }) => {
          const badge = (
            <Badge variant={STATUS_VARIANT[row.original.status] ?? 'secondary'}>
              {row.original.status}
            </Badge>
          )
          if (!row.original.statusRemark) return badge
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help">{badge}</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-64 font-normal">
                {row.original.statusRemark}
              </TooltipContent>
            </Tooltip>
          )
        },
      },
      {
        id: 'reason',
        header: 'Reason',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.leaveReason || '—'}</span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab.offset],
  )

  if (tab.isForbidden) return <Forbidden description={tab.forbiddenMessage} />

  const errors = tab.form.formState.errors
  const decisionErrors = tab.decisionForm.formState.errors
  const fromDate = tab.form.watch('fromDate')

  return (
    <div>
      <form onSubmit={tab.onSubmit} noValidate>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <FormSection
            icon={CalendarDays}
            title={tab.editing ? 'Edit Leave' : 'Leave Details'}
            description={
              tab.editing
                ? 'Editing a recorded leave — save to update it, or clear the form to record a new one'
                : 'Record a leave against this employee'
            }
            className="mt-0 flex-1"
          />
          {tab.editing && (
            <button
              type="button"
              onClick={tab.clearForm}
              className="cursor-pointer text-xs font-medium text-primary hover:underline"
            >
              Clear form
            </button>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <DateField
            control={tab.form.control}
            name="fromDate"
            label="From Date"
            required
            error={errors.fromDate?.message}
          />

          <DateField
            control={tab.form.control}
            name="toDate"
            label="To Date"
            required
            error={errors.toDate?.message}
            hint={tab.isHalfDay ? 'A half day covers a single date.' : undefined}
            minDate={fromDate ? new Date(`${fromDate}T00:00:00`) : undefined}
          />

          <Field label="Leave Type" required error={errors.leaveTypeId?.message}>
            <Controller
              control={tab.form.control}
              name="leaveTypeId"
              render={({ field }) => (
                <Combobox
                  className="w-full"
                  value={field.value}
                  onChange={field.onChange}
                  options={tab.leaveTypeOptions}
                  placeholder={
                    tab.isLeaveTypesLoading ? 'Loading…' : 'Select Leave Type'
                  }
                  searchPlaceholder="Search leave type"
                />
              )}
            />
          </Field>

          {/* Derived from the leave type, so it's shown rather than asked for. */}
          <Field
            label="Pay Type"
            hint="Taken from the leave type — change the type to change this."
          >
            <Input readOnly placeholder="Select Paid / Unpaid" value={tab.form.watch('payType')} />
          </Field>

          <Field label="Duration" required error={errors.duration?.message}>
            <Controller
              control={tab.form.control}
              name="duration"
              render={({ field }) => (
                <Combobox
                  className="w-full"
                  searchable={false}
                  value={field.value}
                  onChange={field.onChange}
                  options={LEAVE_DURATION_OPTIONS}
                  placeholder="Select duration"
                />
              )}
            />
          </Field>

          {/* The status is only settable at creation; a decision has its own endpoint. */}
          {!tab.editing && (
            <Field
              label="Status"
              error={errors.status?.message}
              hint="Recording a leave from the back office is the approval — file it as Pending to leave the decision to someone else."
            >
              <Controller
                control={tab.form.control}
                name="status"
                render={({ field }) => (
                  <Combobox
                    className="w-full"
                    searchable={false}
                    value={field.value}
                    onChange={field.onChange}
                    options={LEAVE_STATUS_OPTIONS}
                    placeholder="Select status"
                  />
                )}
              />
            </Field>
          )}

          {tab.isHalfDay && (
            <>
              <Field label="From Time" required error={errors.fromTime?.message}>
                <Input
                  type="time"
                  aria-invalid={errors.fromTime ? true : undefined}
                  {...tab.form.register('fromTime')}
                />
              </Field>

              <Field label="To Time" required error={errors.toTime?.message}>
                <Input
                  type="time"
                  aria-invalid={errors.toTime ? true : undefined}
                  {...tab.form.register('toTime')}
                />
              </Field>
            </>
          )}

          <Field
            label="Leave Reason"
            error={errors.leaveReason?.message}
            className="md:col-span-2"
          >
            <Textarea
              rows={2}
              placeholder="Leave Reason"
              {...tab.form.register('leaveReason')}
            />
          </Field>
        </div>

        <StepFormFooter
          onBack={onBack}
          isSaving={tab.isSaving}
          saveLabel={tab.editing ? 'Update Leave' : 'Save Leave'}
        />
      </form>

      {/* ── History ─────────────────────────────────────────────────────── */}

      <div className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <FormSection
            icon={History}
            title="Leave History"
            description="Every leave recorded against this employee"
            className="mt-0 flex-1"
          />
          <Combobox
            className="w-40"
            searchable={false}
            value={tab.statusFilter}
            onChange={tab.changeStatusFilter}
            options={LEAVE_STATUS_FILTER_OPTIONS}
            placeholder="All statuses"
          />
        </div>

        <div className="mt-5">
          {tab.isError ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {tab.error instanceof Error
                ? tab.error.message
                : "Couldn't load the leave records."}
            </p>
          ) : (
            <DataTable
              columns={columns}
              data={tab.rows}
              isLoading={tab.isLoading}
              searchPlaceholder="Search leave records…"
              itemName="leave records"
              pageSizeOptions={[5, 10, 25, 50]}
              serverPagination
              limit={tab.limit}
              offset={tab.offset}
              total={tab.total}
              onPaginationChange={tab.onPaginationChange}
              searchValue={tab.search}
              onSearchChange={tab.setSearch}
              manualSorting
              sorting={tab.sorting}
              onSortingChange={tab.onSortingChange}
              emptyState={
                <EmptyState
                  icon={CalendarDays}
                  title="No records found"
                  description="Record a leave in the form above, or approve one the employee has filed."
                />
              }
            />
          )}
        </div>
      </div>

      {/* ── Approve / reject ────────────────────────────────────────────── */}

      <StepDialog
        open={tab.deciding !== null}
        onOpenChange={(open) => !open && tab.closeDecision()}
        title={tab.deciding?.status === 'REJECTED' ? 'Reject Leave' : 'Approve Leave'}
        description={
          tab.deciding?.status === 'REJECTED'
            ? "The remark is what the employee reads, so say why. This can't be undone — a rejected leave has to be removed and recorded again."
            : "Only an approved leave marks its days as leave on the attendance calendar. This can't be undone."
        }
        onSubmit={tab.onSubmitDecision}
        isPending={tab.isDeciding}
        submitLabel={tab.deciding?.status === 'REJECTED' ? 'Reject' : 'Approve'}
      >
        <Field
          label="Remark"
          className="sm:col-span-2"
          error={decisionErrors.remark?.message}
          hint="Shown to the employee alongside the decision."
        >
          <Textarea
            rows={3}
            placeholder={
              tab.deciding?.status === 'REJECTED'
                ? 'Reason for rejecting'
                : 'Optional note'
            }
            {...tab.decisionForm.register('remark')}
          />
        </Field>
      </StepDialog>

      <ConfirmDialog
        open={tab.pendingDelete !== null}
        onOpenChange={(open) => !open && tab.setPendingDelete(null)}
        variant="destructive"
        icon={CalendarDays}
        title="Remove this leave record?"
        description={
          tab.pendingDelete
            ? `The leave from ${formatDate(tab.pendingDelete.fromDate)} will be removed, and its days will stop counting as leave on the attendance calendar.`
            : undefined
        }
        confirmLabel="Remove"
        loading={tab.isDeleting}
        keepOpenOnConfirm
        onConfirm={tab.confirmDelete}
      />
    </div>
  )
}

/** A soft-tinted square icon button for the approve / reject pair. */
function DecisionButton({
  label,
  icon: Icon,
  onClick,
  className,
}: {
  label: string
  icon: typeof Check
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
