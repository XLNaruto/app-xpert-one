import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { employeeOptions, useEmployees } from '@/features/hr/employee'
import { useLeaveTypes } from '@/features/master/leave-type'
import { leaveSchema, type LeaveFormValues } from '../schemas'
import { EMPTY_LEAVE_FORM } from '../constants'
import { useLeave } from '../api/use-leaves'
import { useCreateLeave, useUpdateLeave } from '../api/use-leave-mutations'
import { leaveToFormValues } from '../lib/leave-mappers'

/**
 * Owns the leave form for both create and edit.
 *
 * **Pay type is derived, never chosen.** It comes from the leave type's own
 * `payType` in the master, so picking "Sick Leave" decides whether the day is
 * paid. The field is shown read-only rather than hidden, since it's the
 * consequence the user most needs to see before saving.
 *
 * **The employee is fixed once recorded.** `PATCH …/:id` can't move a leave to
 * someone else, so in edit mode the picker is locked to the employee on the row.
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

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: EMPTY_LEAVE_FORM,
  })
  const { control, setValue, reset, handleSubmit } = form

  const leaveTypeId = useWatch({ control, name: 'leaveTypeId' })
  const duration = useWatch({ control, name: 'duration' })
  const fromDate = useWatch({ control, name: 'fromDate' })

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) reset(leaveToFormValues(detail.data, EMPTY_LEAVE_FORM))
  }, [detail.data, reset])

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

  /** Pay type follows the chosen leave type's own setting — never entered by hand. */
  useEffect(() => {
    if (!leaveTypeId) return
    const chosen = (leaveTypes.data?.items ?? []).find(
      (type) => String(type.id) === leaveTypeId,
    )
    if (chosen) setValue('payType', chosen.payType)
  }, [leaveTypeId, leaveTypes.data, setValue])

  /** A half day covers one date, so the two ends are held together. */
  useEffect(() => {
    if (duration === 'HALF_DAY' && fromDate) setValue('toDate', fromDate)
  }, [duration, fromDate, setValue])

  const goToList = () => navigate({ to: '/hr/leave' })

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit ? updateLeave : createLeave
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(isEdit ? 'Leave updated' : 'Leave recorded')
        goToList()
      },
      onError: (error) =>
        toast.error(getApiErrorMessage(error, "Couldn't save the leave.")),
    })
  })

  return {
    form,
    errors: form.formState.errors,
    onSubmit,
    isEdit,
    employeeSelectOptions,
    /** Who the leave belongs to, for the locked field on the edit screen. */
    employeeLabel: detail.data
      ? [detail.data.employeeName, detail.data.employeeCode]
          .filter(Boolean)
          .join(' · ')
      : '',
    isEmployeesLoading: employees.isLoading,
    leaveTypeOptions,
    isLeaveTypesLoading: leaveTypes.isLoading,
    isHalfDay: duration === 'HALF_DAY',
    fromDate,
    isPending: isEdit ? updateLeave.isPending : createLeave.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && (detail.isError || (!detail.isLoading && !detail.data)),
    loadError: detail.error,
    goToList,
  }
}
