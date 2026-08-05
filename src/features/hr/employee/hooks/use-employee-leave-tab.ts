import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { usePagination } from '@/hooks/use-pagination'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { useLeaveTypes } from '@/features/master/leave-type'
import {
  employeeLeaveSchema,
  leaveDecisionSchema,
  type EmployeeLeaveFormValues,
  type LeaveDecisionFormValues,
} from '../schemas'
import { EMPTY_EMPLOYEE_LEAVE_FORM, LEAVE_DEFAULT_SORT } from '../constants'
import { useEmployeeLeaves } from '../api/use-employee-steps'
import {
  useCreateEmployeeLeave,
  useDecideEmployeeLeave,
  useDeleteEmployeeLeave,
  useUpdateEmployeeLeave,
} from '../api/use-employee-step-mutations'
import { leaveToFormValues } from '../lib/employee-step-mappers'
import type { EmployeeLeave } from '../types'

/**
 * Step 9 — one inline leave form over the employee's leave history.
 *
 * Not a card list like steps 4–7: a leave register grows without bound, so the
 * history is a server-paged table and the form above it records one leave at a
 * time. Editing a row loads it into that same form rather than opening a dialog —
 * the form is already on screen, so a dialog would be a second copy of it.
 *
 * **Pay type is derived, never chosen.** It comes from the leave type's own
 * `payType` in the master, so picking "Sick Leave" decides whether the day is paid.
 * The field is shown read-only rather than hidden, since it's the consequence the
 * user most needs to see before saving.
 *
 * **A decision is a separate endpoint.** `PATCH …/:id` can't change the status —
 * `PATCH …/:id/status` does, and only from `PENDING`. A leave recorded by the back
 * office defaults to `APPROVED`, because recording it *is* the approval.
 */
export function useEmployeeLeaveTab({
  employeeId,
  onClose,
}: {
  employeeId: number
  onClose: () => void
}) {
  const {
    params,
    limit,
    offset,
    search,
    setSearch,
    onPaginationChange,
    sorting,
    onSortingChange,
  } = usePagination(5, LEAVE_DEFAULT_SORT)

  /** Status filter — `''` is every status, which the API gets as no filter. */
  const [statusFilter, setStatusFilter] = useState('')

  const list = useEmployeeLeaves(params, {
    employeeId,
    ...(statusFilter ? { status: statusFilter } : {}),
  })

  const leaveTypes = useLeaveTypes()
  const createLeave = useCreateEmployeeLeave(employeeId)
  const updateLeave = useUpdateEmployeeLeave()
  const deleteLeave = useDeleteEmployeeLeave()
  const decideLeave = useDecideEmployeeLeave()

  /** The row the form is editing, or `null` when it's recording a new leave. */
  const [editing, setEditing] = useState<EmployeeLeave | null>(null)
  const [pendingDelete, setPendingDelete] = useState<EmployeeLeave | null>(null)
  /** The pending leave being approved or rejected, with the decision chosen. */
  const [deciding, setDeciding] = useState<{
    leave: EmployeeLeave
    status: 'APPROVED' | 'REJECTED'
  } | null>(null)

  const form = useForm<EmployeeLeaveFormValues>({
    resolver: zodResolver(employeeLeaveSchema),
    defaultValues: EMPTY_EMPLOYEE_LEAVE_FORM,
  })
  const { control, setValue, reset, handleSubmit } = form

  const decisionForm = useForm<LeaveDecisionFormValues>({
    resolver: zodResolver(leaveDecisionSchema),
    defaultValues: { status: 'APPROVED', remark: '' },
  })

  /** What happens after a successful save — set by whichever button was pressed. */
  const afterSaveRef = useRef<'stay' | 'close' | 'addNew'>('stay')

  const leaveTypeId = useWatch({ control, name: 'leaveTypeId' })
  const duration = useWatch({ control, name: 'duration' })
  const fromDate = useWatch({ control, name: 'fromDate' })

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

  /** Load a history row into the form. */
  const startEdit = (leave: EmployeeLeave) => {
    setEditing(leave)
    reset(leaveToFormValues(leave, EMPTY_EMPLOYEE_LEAVE_FORM))
  }

  /** Abandon an edit and go back to recording a new leave. */
  const clearForm = () => {
    setEditing(null)
    reset(EMPTY_EMPLOYEE_LEAVE_FORM)
  }

  const startDecision = (leave: EmployeeLeave, status: 'APPROVED' | 'REJECTED') => {
    decisionForm.reset({ status, remark: '' })
    setDeciding({ leave, status })
  }
  const closeDecision = () => setDeciding(null)

  const submit = handleSubmit((values) => {
    const after = afterSaveRef.current
    afterSaveRef.current = 'stay'

    const row = editing
    const done = () => {
      toast.success(row ? 'Leave updated' : 'Leave recorded')
      if (after === 'close') {
        onClose()
        return
      }
      // Both "stay" and "add new" leave a blank form ready for the next record —
      // the history table below has already refreshed with what was just saved.
      clearForm()
    }
    const fail = (error: unknown) =>
      toast.error(getApiErrorMessage(error, "Couldn't save the leave."))

    if (row) {
      updateLeave.mutate({ id: row.id, values }, { onSuccess: done, onError: fail })
    } else {
      createLeave.mutate(values, { onSuccess: done, onError: fail })
    }
  })

  const onSubmitAndClose = () => {
    afterSaveRef.current = 'close'
    void submit()
  }

  const onSubmitAndAddNew = () => {
    afterSaveRef.current = 'addNew'
    void submit()
  }

  const onSubmitDecision = decisionForm.handleSubmit((values) => {
    if (!deciding) return
    decideLeave.mutate(
      { id: deciding.leave.id, values },
      {
        onSuccess: () => {
          toast.success(values.status === 'APPROVED' ? 'Leave approved' : 'Leave rejected')
          closeDecision()
        },
        onError: (error) =>
          toast.error(getApiErrorMessage(error, "Couldn't record the decision.")),
      },
    )
  })

  const confirmDelete = () => {
    if (!pendingDelete) return
    const removed = pendingDelete
    deleteLeave.mutate(removed.id, {
      onSuccess: () => {
        toast.success('Leave removed')
        setPendingDelete(null)
        // The form was editing the row that's just gone — reset it.
        if (editing?.id === removed.id) clearForm()
      },
      onError: (error) =>
        toast.error(getApiErrorMessage(error, "Couldn't remove the leave.")),
    })
  }

  /** Filtering is a different result set, so it starts at its own first page. */
  const changeStatusFilter = (value: string) => {
    setStatusFilter(value)
    onPaginationChange({ limit, offset: 0 })
  }

  const isForbidden = isForbiddenError(list.error)

  return {
    rows: list.data?.items ?? [],
    total: list.data?.total ?? 0,
    limit,
    offset,
    onPaginationChange,
    search,
    setSearch,
    sorting,
    onSortingChange,
    statusFilter,
    changeStatusFilter,
    isLoading: list.isLoading,
    isError: list.isError && !isForbidden,
    error: list.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(list.error) : undefined,

    form,
    /** The row being edited — `null` while recording a new leave. */
    editing,
    startEdit,
    clearForm,
    leaveTypeOptions,
    isLeaveTypesLoading: leaveTypes.isLoading,
    isHalfDay: duration === 'HALF_DAY',
    onSubmit: submit,
    onSubmitAndClose,
    onSubmitAndAddNew,
    isSaving: createLeave.isPending || updateLeave.isPending,
    onClose,

    deciding,
    startDecision,
    closeDecision,
    decisionForm,
    onSubmitDecision,
    isDeciding: decideLeave.isPending,

    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: deleteLeave.isPending,
  }
}
