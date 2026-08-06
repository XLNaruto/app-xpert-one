import { Controller } from 'react-hook-form'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { DateField } from '@/components/common/date-field'
import { TimeField } from '@/components/common/time-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { LEAVE_DURATION_OPTIONS } from '../constants'
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
 */
export function LeaveCreatePage({ data }: LeaveCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const leaveId = decryptId(data)

  const {
    form,
    errors,
    onSubmit,
    isEdit,
    employeeSelectOptions,
    employeeLabel,
    isEmployeesLoading,
    leaveTypeOptions,
    isLeaveTypesLoading,
    isHalfDay,
    fromDate,
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
        description="Record a leave against an employee."
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
                description="Employee, dates and the leave type that decides the pay treatment"
                className="mt-0"
              />

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

              <DateField
                control={form.control}
                name="fromDate"
                label="From Date"
                required
                error={errors.fromDate?.message}
              />

              <DateField
                control={form.control}
                name="toDate"
                label="To Date"
                required
                error={errors.toDate?.message}
                hint={isHalfDay ? 'A half day covers a single date.' : undefined}
                minDate={fromDate ? new Date(`${fromDate}T00:00:00`) : undefined}
              />

              <Field label="Leave Type" required error={errors.leaveTypeId?.message}>
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
                    />
                  )}
                />
              </Field>

              {/* Derived from the leave type, so it's shown rather than asked for. */}
              <Field
                label="Pay Type"
                hint="Taken from the leave type — change the type to change this."
              >
                <Input
                  readOnly
                  placeholder="Select Paid / Unpaid"
                  value={form.watch('payType')}
                />
              </Field>

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
                  />

                  <TimeField
                    control={form.control}
                    name="toTime"
                    label="To Time"
                    required
                    error={errors.toTime?.message}
                  />
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
                  {...form.register('leaveReason')}
                />
              </Field>

              <div className="col-span-full mt-4 flex items-center justify-end gap-3 border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goToList}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Saving…' : isEdit ? 'Update Leave' : 'Save Leave'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
