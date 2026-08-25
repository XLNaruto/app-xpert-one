import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { employeeOptions, useEmployees } from '@/features/hr/employee'
import { useLeaveTypes } from '@/features/master/leave-type'
import { leaveSchemaFor, type LeaveFormValues } from '../schemas'
import { EMPTY_LEAVE_FORM } from '../constants'
import { useLeave, useLeaveBalance } from '../api/use-leaves'
import {
  useCreateLeave,
  useUpdateLeave,
  useUploadLeaveAttachment,
} from '../api/use-leave-mutations'
import { leaveToFormValues } from '../lib/leave-mappers'
import { asLocalDate, earliestLeaveDate, leaveDayCount } from '../lib/leave-dates'
import { describeApplication, formatDays } from '../lib/leave-summary'
import type { LeaveBalanceItem } from '../types'

/**
 * Owns the leave form for both create and edit.
 *
 * **Pay type is neither asked for nor derived.** The only choice is the leave
 * TYPE; each type carries its own yearly paid allowance, the server spends what's
 * left of it, and every day past it is unpaid. So there is no pay-type field on
 * this form at all — what the screen shows instead is the allowance the chosen
 * type has left, and a warning when the range will run past it.
 *
 * **Running out never blocks the save.** The API accepts an application whatever
 * the allowance says; it just stops paying for the overflow. The warning is a
 * confirmation, not a validation error.
 *
 * **The employee is fixed once recorded.** `PATCH …/:id` can't move a leave to
 * someone else, so in edit mode the picker is locked to the employee on the row.
 *
 * **A decided application's schedule is frozen.** Moving the dates or the type of
 * an approved or rejected leave answers 409 — it has to be removed and refiled —
 * so those inputs are locked and the edit narrows to the reason and the
 * attachment, which the API accepts at any status.
 *
 * **A decision is a separate endpoint.** The status is only settable at creation;
 * approve/reject lives on the list, through `PATCH …/:id/status`.
 */
export function useLeaveForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = useLeave(id ?? Number.NaN)
  const employees = useEmployees()
  const leaveTypes = useLeaveTypes()
  const createLeave = useCreateLeave()
  const updateLeave = useUpdateLeave(id ?? Number.NaN)
  const uploadAttachment = useUploadLeaveAttachment()

  /*
   * The date floor is part of the schema, so it can't be a fresh object every
   * render — that would rebuild the resolver on each keystroke.
   */
  const schema = useMemo(() => leaveSchemaFor({ isEdit }), [isEdit])

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_LEAVE_FORM,
  })
  const { control, setValue, reset, handleSubmit } = form

  const employeeId = useWatch({ control, name: 'employeeId' })
  const leaveTypeId = useWatch({ control, name: 'leaveTypeId' })
  const duration = useWatch({ control, name: 'duration' })
  const fromDate = useWatch({ control, name: 'fromDate' })
  const toDate = useWatch({ control, name: 'toDate' })
  const attachment = useWatch({ control, name: 'attachment' })

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) reset(leaveToFormValues(detail.data, EMPTY_LEAVE_FORM))
  }, [detail.data, reset])

  /**
   * A decided application's schedule is settled. Only the reason and the
   * attachment stay editable, which is the one PATCH the API allows on it.
   */
  const isDecided = isEdit && detail.data !== undefined && detail.data.status !== 'PENDING'

  const employeeSelectOptions = useMemo(
    () => employeeOptions(employees.data?.items ?? []),
    [employees.data],
  )

  const leaveTypeOptions = useMemo(
    () =>
      (leaveTypes.data?.items ?? []).map((type) => ({
        label: `${type.leaveName} (${type.shortName})`,
        value: String(type.id),
      })),
    [leaveTypes.data],
  )

  /** A half day covers one date, so the two ends are held together. */
  useEffect(() => {
    if (duration === 'HALF_DAY' && fromDate) setValue('toDate', fromDate)
  }, [duration, fromDate, setValue])

  /*
   * The allowance is a per-YEAR ledger, and the year that matters is the one the
   * leave falls in — filing next January against this year's remainder would read
   * the wrong balance. Before a date is picked, the current year is the only
   * answer available.
   */
  const year = fromDate
    ? Number(fromDate.slice(0, 4))
    : new Date(`${earliestLeaveDate()}T00:00:00`).getFullYear()

  const numericEmployeeId = Number(employeeId)
  const balance = useLeaveBalance(
    employeeId && Number.isFinite(numericEmployeeId) ? numericEmployeeId : undefined,
    year,
  )

  /**
   * The chosen type's own line on the balance card — **not** the headline.
   * Allowances don't pool: a company-wide "6 days available" can be six sick days
   * and no casual ones, so only this line answers "will this leave be paid".
   */
  const balanceItem: LeaveBalanceItem | undefined = useMemo(() => {
    if (!leaveTypeId) return undefined
    return balance.data?.items.find((item) => String(item.leaveTypeId) === leaveTypeId)
  }, [balance.data, leaveTypeId])

  /** How many days the range covers — what the warning is measured against. */
  const requestedDays = leaveDayCount(
    fromDate,
    toDate,
    duration === 'HALF_DAY' ? 'HALF_DAY' : 'FULL_DAY',
  )

  /**
   * What the range will cost against this type's allowance, as far as the browser
   * can tell. The server is authoritative — it also knows the weekly offs and
   * holidays inside the range — so this drives a warning and never a block.
   *
   * `available: null` is an UNPAID type: uncapped, unpaid from day one, and
   * nothing to overflow.
   */
  const projection = useMemo(() => {
    if (!balanceItem || requestedDays <= 0) return undefined
    if (balanceItem.available === null) {
      return { paid: 0, unpaid: requestedDays, overflows: false, unlimited: true }
    }
    const paid = Math.min(balanceItem.available, requestedDays)
    const unpaid = requestedDays - paid
    return { paid, unpaid, overflows: unpaid > 0, unlimited: false }
  }, [balanceItem, requestedDays])

  const goToList = () => navigate({ to: '/hr/leave' })

  /** Upload on pick, so the form holds a durable key by the time it is saved. */
  const pickAttachment = async (file: File) => {
    try {
      const key = await uploadAttachment.mutateAsync(file)
      setValue('attachment', key, { shouldDirty: true })
      return key
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't upload the attachment."))
      throw error
    }
  }

  const clearAttachment = () => setValue('attachment', '', { shouldDirty: true })

  const save = (values: LeaveFormValues) => {
    const typeLabel =
      leaveTypeOptions.find((option) => option.value === values.leaveTypeId)?.label ?? ''

    if (!isEdit) {
      createLeave.mutate(values, {
        onSuccess: (application) => {
          // ONE confirmation for the application, never two for its halves — and
          // it says outright when part of what was just recorded is unpaid.
          toast.success('Leave recorded', {
            description: describeApplication(application, typeLabel),
          })
          goToList()
        },
        onError: (error) =>
          toast.error(getApiErrorMessage(error, "Couldn't save the leave.")),
      })
      return
    }

    /*
     * A decided application accepts only the reason and the attachment; a pending
     * one accepts its schedule too, which re-runs the split and REWRITES the rows
     * (their ids change). Either way the response is the whole application, so the
     * form is re-seeded from it rather than from the id that was sent.
     */
    updateLeave.mutate(
      { values, mode: isDecided ? 'notes' : 'schedule' },
      {
        onSuccess: (application) => {
          toast.success('Leave updated', {
            description: describeApplication(application, typeLabel),
          })
          goToList()
        },
        onError: (error) =>
          toast.error(getApiErrorMessage(error, "Couldn't save the leave.")),
      },
    )
  }

  /**
   * The values held back for the overflow confirmation. Running out of allowance
   * is allowed, so the answer is a confirm-and-continue rather than an error on
   * the field.
   */
  const [pendingOverflow, setPendingOverflow] = useState<LeaveFormValues | null>(null)

  const onSubmit = handleSubmit((values) => {
    // Nothing to warn about on a notes-only edit — the days aren't moving.
    if (!isDecided && projection?.overflows) {
      setPendingOverflow(values)
      return
    }
    save(values)
  })

  const confirmOverflow = () => {
    if (!pendingOverflow) return
    save(pendingOverflow)
    setPendingOverflow(null)
  }

  return {
    form,
    errors: form.formState.errors,
    onSubmit,
    isEdit,
    isDecided,
    /** The status the record was read at — what the lock notice names. */
    decidedStatus: detail.data?.status,
    employeeSelectOptions,
    /** Who the leave belongs to, for the locked field on the edit screen. */
    employeeLabel: detail.data
      ? [detail.data.employeeName, detail.data.employeeCode].filter(Boolean).join(' · ')
      : '',
    isEmployeesLoading: employees.isLoading,
    leaveTypeOptions,
    isLeaveTypesLoading: leaveTypes.isLoading,
    isHalfDay: duration === 'HALF_DAY',
    fromDate,
    /** A new leave starts tomorrow at the earliest — the picker's own floor. */
    minFromDate: isEdit ? undefined : asLocalDate(earliestLeaveDate()),
    minToDate: fromDate ? asLocalDate(fromDate) : undefined,

    // The allowance read-out beside the leave type, and the overflow warning.
    balanceItem,
    isBalanceLoading: balance.isLoading,
    requestedDays,
    requestedDaysLabel: requestedDays > 0 ? formatDays(requestedDays) : '',
    projection,
    pendingOverflow,
    cancelOverflow: () => setPendingOverflow(null),
    confirmOverflow,

    attachment,
    pickAttachment,
    clearAttachment,
    isUploading: uploadAttachment.isPending,

    isPending: isEdit ? updateLeave.isPending : createLeave.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && (detail.isError || (!detail.isLoading && !detail.data)),
    loadError: detail.error,
    goToList,
  }
}
