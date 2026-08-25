import { Controller } from 'react-hook-form'
import { AlertTriangle, ArrowLeft, CalendarDays, Lock } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { DateField } from '@/components/common/date-field'
import { TimeField } from '@/components/common/time-field'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { LEAVE_DURATION_OPTIONS } from '../constants'
import { formatDays, formatSplit } from '../lib/leave-summary'
import { LeaveAttachmentField } from '../components/leave-attachment-field'
import { useLeaveForm } from '../hooks/use-leave-form'

interface LeaveCreatePageProps {
  /**
   * Encrypted leave id from the `?data=` search param. When present the page
   * switches to edit mode; otherwise it's a fresh record.
   */
  data?: string
}

/**
 * Record / edit a leave. One screen for both: a `?data=` token edits the record
 * it carries, no token records a new one.
 *
 * **There is no Pay Type field, and that is the point.** The only choice is the
 * leave TYPE. Each type carries its own yearly paid allowance; the server spends
 * what's left of it and every day past it is unpaid, without limit. So instead of
 * asking for something the user can't decide, the form shows what the chosen type
 * has left and warns — never blocks — when the range will run past it.
 */
export function LeaveCreatePage({ data }: LeaveCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const leaveId = decryptId(data)

  const {
    form,
    errors,
    onSubmit,
    isEdit,
    isDecided,
    decidedStatus,
    employeeSelectOptions,
    employeeLabel,
    isEmployeesLoading,
    leaveTypeOptions,
    isLeaveTypesLoading,
    isHalfDay,
    minFromDate,
    minToDate,
    balanceItem,
    isBalanceLoading,
    requestedDaysLabel,
    projection,
    pendingOverflow,
    cancelOverflow,
    confirmOverflow,
    attachment,
    pickAttachment,
    clearAttachment,
    isUploading,
    isPending,
    isLoading,
    isError,
    loadError,
    goToList,
  } = useLeaveForm(leaveId)

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Leave' : 'Add Leave'}
        description="Record a leave against an employee — the leave type decides what's paid."
        actions={
          <Button variant="outline" onClick={goToList}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">
              {loadError instanceof Error
                ? loadError.message
                : "Couldn't load this leave record."}
            </p>
          ) : (
            <form
              onSubmit={onSubmit}
              noValidate
              className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <FormSection
                icon={CalendarDays}
                title={isEdit ? 'Edit Leave' : 'Add Leave'}
                description="Employee, dates and the leave type whose allowance the days come out of"
                className="mt-0"
              />

              {/*
                A decided application's schedule is settled: moving its type, dates
                or duration answers 409 — it has to be removed and refiled. The
                reason and the attachment stay editable, which is the one PATCH the
                API accepts on it.
              */}
              {isDecided && (
                <p className="col-span-full flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>
                    This leave is already <strong>{decidedStatus}</strong>, so its
                    type, dates and duration are fixed — changing them would mean
                    re-deciding a leave the employee has already been told about.
                    Remove it and record it again if the days have to move. The
                    reason and the attachment can still be updated.
                  </span>
                </p>
              )}

              <Field
                label="Employee Name"
                required
                error={errors.employeeId?.message}
                // A leave can't change hands: `PATCH …/:id` has no employee field.
                hint={isEdit ? 'The employee is fixed once the leave is recorded.' : undefined}
              >
                {isEdit ? (
                  <Input readOnly value={employeeLabel} />
                ) : (
                  <Controller
                    control={form.control}
                    name="employeeId"
                    render={({ field }) => (
                      <Combobox
                        className="w-full"
                        value={field.value}
                        onChange={field.onChange}
                        options={employeeSelectOptions}
                        placeholder={
                          isEmployeesLoading ? 'Loading…' : 'Search & Select Employee…'
                        }
                        searchPlaceholder="Search employee"
                      />
                    )}
                  />
                )}
              </Field>

              <Field
                label="Leave Type"
                required
                error={errors.leaveTypeId?.message}
                hint="Each type has its own yearly paid allowance. Days beyond it are unpaid — allowances never pool between types."
              >
                <Controller
                  control={form.control}
                  name="leaveTypeId"
                  render={({ field }) => (
                    <Combobox
                      className="w-full"
                      value={field.value}
                      onChange={field.onChange}
                      options={leaveTypeOptions}
                      placeholder={isLeaveTypesLoading ? 'Loading…' : 'Select Leave Type'}
                      searchPlaceholder="Search leave type"
                      disabled={isDecided}
                    />
                  )}
                />
              </Field>

              <DateField
                control={form.control}
                name="fromDate"
                label="From Date"
                required
                error={errors.fromDate?.message}
                // A leave is filed ahead of the day it's taken — today and earlier
                // answer a 400, so the picker doesn't offer them on a new record.
                hint={isEdit ? undefined : 'A leave has to start tomorrow or later.'}
                minDate={minFromDate}
                disabled={isDecided}
              />

              <DateField
                control={form.control}
                name="toDate"
                label="To Date"
                required
                error={errors.toDate?.message}
                hint={isHalfDay ? 'A half day covers a single date.' : undefined}
                minDate={minToDate ?? minFromDate}
                disabled={isDecided}
              />

              <Field label="Duration" required error={errors.duration?.message}>
                <Controller
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <Combobox
                      className="w-full"
                      searchable={false}
                      value={field.value}
                      onChange={field.onChange}
                      options={LEAVE_DURATION_OPTIONS}
                      placeholder="Select duration"
                      disabled={isDecided}
                    />
                  )}
                />
              </Field>

              {/*
                No status field: recording a leave from the back office IS the
                approval, so a new record is filed as `APPROVED` (the form's own
                default). A leave that still needs deciding arrives as `PENDING`
                from the employee's side, and the register's Approve / Reject
                actions settle it through `PATCH …/:id/status`.
              */}

              {isHalfDay && (
                <>
                  {/*
                    `TimeField` opens a clock popup (hour / minute / AM-PM) and
                    shows hh:mm AM/PM, but holds `HH:MM` — so what the user
                    reads is 12-hour and what the API gets is 24.
                  */}
                  <TimeField
                    control={form.control}
                    name="fromTime"
                    label="From Time"
                    required
                    error={errors.fromTime?.message}
                    disabled={isDecided}
                  />

                  <TimeField
                    control={form.control}
                    name="toTime"
                    label="To Time"
                    required
                    error={errors.toTime?.message}
                    disabled={isDecided}
                  />
                </>
              )}

              <Field
                label="Attachment"
                error={errors.attachment?.message}
                hint="A medical certificate or other proof. Uploaded straight to storage — the record keeps only a reference to it."
              >
                <LeaveAttachmentField
                  value={attachment}
                  onPick={pickAttachment}
                  onClear={clearAttachment}
                  isUploading={isUploading}
                />
              </Field>

              <Field
                label="Leave Reason"
                error={errors.leaveReason?.message}
                className="md:col-span-2"
              >
                <Textarea
                  rows={2}
                  placeholder="Leave Reason"
                  {...form.register('leaveReason')}
                />
              </Field>

              {/*
                What this leave will cost the chosen type's allowance. It reads the
                type's OWN line, never the headline: allowances don't pool, so a
                company-wide "6 days remaining" can be six sick days and no casual
                ones.
              */}
              {!isDecided && (
                <AllowanceNotice
                  isLoading={isBalanceLoading}
                  item={balanceItem}
                  requestedDaysLabel={requestedDaysLabel}
                  projection={projection}
                />
              )}

              <div className="col-span-full mt-4 flex items-center justify-end gap-3 border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goToList}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || isUploading}>
                  {isPending ? 'Saving…' : isEdit ? 'Update Leave' : 'Save Leave'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/*
        Running out of allowance NEVER refuses an application — it only stops
        paying for it. So the overflow is a confirm-and-continue, not a validation
        error on a field: the desk is told what part of this will be unpaid and
        decides whether to file it anyway.
      */}
      <ConfirmDialog
        open={pendingOverflow !== null}
        onOpenChange={(open) => !open && cancelOverflow()}
        icon={AlertTriangle}
        title="Part of this leave will be unpaid"
        description={
          projection
            ? `${balanceItem?.leaveType || 'This leave type'} has ${formatDays(balanceItem?.available ?? 0)} of paid allowance left, and this request is ${requestedDaysLabel}. It will be recorded as ${formatSplit({ paidDays: projection.paid, unpaidDays: projection.unpaid })} — the unpaid days are still granted, they just won't be paid for. Record it?`
            : undefined
        }
        confirmLabel="Record it"
        loading={isPending}
        keepOpenOnConfirm
        onConfirm={confirmOverflow}
      />
    </div>
  )
}

/**
 * The chosen leave type's remaining paid allowance, and what this range will do
 * to it.
 *
 * Three states worth telling apart, because two of them look like "zero" and mean
 * different things:
 *
 * - an UNPAID type is uncapped and unpaid from day one — nothing to run out of;
 * - a type with no allowance configured anywhere has NO PAID DAYS, which is not
 *   the same as unlimited;
 * - a type whose allowance is simply spent pays for nothing more this year.
 */
function AllowanceNotice({
  isLoading,
  item,
  requestedDaysLabel,
  projection,
}: {
  isLoading: boolean
  item:
    | {
        leaveType: string
        total: number
        available: number | null
        overflow: number
        quotaSource: 'EMPLOYEE' | 'DESIGNATION' | 'NONE'
        payType: 'PAID' | 'UNPAID'
      }
    | undefined
  requestedDaysLabel: string
  projection: { paid: number; unpaid: number; overflows: boolean; unlimited: boolean } | undefined
}) {
  if (isLoading) {
    return (
      <div className="col-span-full">
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  // Nothing to say until both an employee and a leave type are chosen.
  if (!item) return null

  const unlimited = item.available === null

  return (
    <div className="col-span-full rounded-lg border border-border bg-muted/30 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">{item.leaveType}</span>
        {unlimited ? (
          <Badge variant="secondary">Unlimited — unpaid type</Badge>
        ) : item.quotaSource === 'NONE' ? (
          <Badge variant="destructive">No paid days configured</Badge>
        ) : (
          <Badge variant={item.available === 0 ? 'warning' : 'success'}>
            {formatDays(item.available ?? 0)} paid left of {formatDays(item.total)}
          </Badge>
        )}
        {requestedDaysLabel && (
          <span className="text-muted-foreground">· this request is {requestedDaysLabel}</span>
        )}
      </div>

      {unlimited ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Every day of this type is unpaid, so there is no allowance to run out of.
        </p>
      ) : item.quotaSource === 'NONE' ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Nothing is set on this employee or their designation for this type, so
          every day of it will be unpaid. It doesn't stop the leave being recorded.
        </p>
      ) : projection?.overflows ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-foreground">
          <AlertTriangle className="mt-px size-3.5 shrink-0 text-warning" />
          <span>
            The allowance runs out inside this range — expect{' '}
            <strong>
              {formatSplit({ paidDays: projection.paid, unpaidDays: projection.unpaid })}
            </strong>
            . It will still be recorded; the server does the final count, which also
            accounts for weekly offs and holidays.
          </span>
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Within the allowance as far as this screen can tell — the server does the
          final count, and it also accounts for weekly offs and holidays.
        </p>
      )}
    </div>
  )
}
