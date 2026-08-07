import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { useCompanies } from '@/features/master/company'
import {
  employeeServiceEditSchema,
  employeeTransferSchema,
  leaveServiceSchema,
  type EmployeeServiceEditFormValues,
  type EmployeeTransferFormValues,
  type LeaveServiceFormValues,
} from '../schemas'
import {
  EMPTY_EMPLOYEE_SERVICE_EDIT_FORM,
  EMPTY_EMPLOYEE_TRANSFER_FORM,
  PERMANENT_EMPLOYMENT_TYPE,
} from '../constants'
import {
  useEmployeeTransferDetail,
  useEmployeeTransfers,
} from '../api/use-employee-steps'
import {
  useLeaveEmployeeService,
  useTransferEmployee,
  useUpdateEmployeeService,
} from '../api/use-employee-step-mutations'
import { serviceDetailToEditFormValues } from '../lib/employee-step-mappers'
import { deriveRenewalDate, toFormDate, todayIso } from '../lib/employee-dates'
import { usePostingOptions } from './use-posting-options'
import type { EmployeeTransfer } from '../types'

/** Which of the tab's four dialogs is open, if any. */
type OpenDialog = 'transfer' | 'edit' | 'leave' | 'detail' | null

/** The day after an ISO date, or the day after today when there isn't one. */
function nextDayIso(iso: string): string {
  const date = iso ? new Date(`${iso}T00:00:00`) : new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

/** The later of two ISO dates — they sort lexically. */
function maxIso(a: string, b: string): string {
  return a > b ? a : b
}

/**
 * Step 8 — the posting history and the three writes over it.
 *
 * The history is **append-only**, and the tab's shape follows from that:
 *
 * - **Transfer** (`POST …/transfers`) is the normal move — one atomic call closes
 *   the open posting and inserts the new one, so the old row survives. Offered only
 *   while a posting is open.
 * - **Edit** (`PATCH …/transfers/:id`) corrects the *latest* posting in place. The
 *   API refuses a closed row, so the action is only offered on `isLatest`.
 * - **Leave service** (`POST …/leave-service`) closes the open posting without
 *   opening another — the employee exits. This is also what the list's Deactivate
 *   does.
 *
 * There is no delete: a posting is a fact about the past, and payroll for that
 * period points at it.
 */
export function useEmployeeTransferTab(employeeId: number) {
  const list = useEmployeeTransfers(employeeId)
  const transferEmployee = useTransferEmployee(employeeId)
  const updateService = useUpdateEmployeeService(employeeId)
  const leaveService = useLeaveEmployeeService(employeeId)

  const companies = useCompanies()

  const [dialog, setDialog] = useState<OpenDialog>(null)
  /** The posting a dialog is acting on — the latest one, except for Details. */
  const [activeServiceId, setActiveServiceId] = useState<number | undefined>(undefined)

  const rows = list.data ?? []
  /** The open posting: the newest row with no leaving date. */
  const openPosting = rows.find((row) => row.isCurrent && !row.leavingDate)
  const latestPosting = rows.find((row) => row.isLatest) ?? rows[0]
  /**
   * The employee has left — every posting is closed. A new posting can still be
   * added (they rejoin); only the two closing actions have nothing to act on.
   */
  const isRejoining = openPosting === undefined && latestPosting !== undefined
  /** The posting a new one is seeded from — the open one, or the last one held. */
  const postingToFollow = openPosting ?? latestPosting

  /* ── Forms ─────────────────────────────────────────────────────────────── */

  const transferForm = useForm<EmployeeTransferFormValues>({
    resolver: zodResolver(employeeTransferSchema),
    defaultValues: EMPTY_EMPLOYEE_TRANSFER_FORM,
  })

  const editForm = useForm<EmployeeServiceEditFormValues>({
    resolver: zodResolver(employeeServiceEditSchema),
    defaultValues: EMPTY_EMPLOYEE_SERVICE_EDIT_FORM,
  })

  const leaveForm = useForm<LeaveServiceFormValues>({
    resolver: zodResolver(leaveServiceSchema),
    defaultValues: { leavingDate: '', leavingReason: '' },
  })

  /** The row being edited or inspected, read only while its dialog is open. */
  const detail = useEmployeeTransferDetail(
    employeeId,
    dialog === 'edit' || dialog === 'detail' ? activeServiceId : undefined,
  )

  // Seed the restricted edit form once the posting it corrects has loaded.
  useEffect(() => {
    if (dialog !== 'edit' || !detail.data) return
    editForm.reset(
      serviceDetailToEditFormValues(detail.data, EMPTY_EMPLOYEE_SERVICE_EDIT_FORM),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog, detail.data])

  /* ── Cascading dropdowns ───────────────────────────────────────────────── */

  const transferBranchId = useWatch({ control: transferForm.control, name: 'branchId' })
  const transferCompanyId = useWatch({ control: transferForm.control, name: 'companyId' })
  const editBranchId = useWatch({ control: editForm.control, name: 'branchId' })

  /*
   * The new posting must point at the DESTINATION company's masters, not the
   * session's — another company's branches, departments and designations are
   * different rows entirely. The company is chosen outright on the form (seeded
   * with the one being left), so it scopes the three reads directly.
   */
  const destinationCompanyId = transferCompanyId.trim()
    ? Number(transferCompanyId)
    : undefined

  const transferOptions = usePostingOptions(transferBranchId, destinationCompanyId)
  const editOptions = usePostingOptions(editBranchId)

  const companyOptions = useMemo(
    () =>
      (companies.data?.items ?? []).map((company) => ({
        label: company.companyName,
        value: String(company.id),
      })),
    [companies.data],
  )

  /**
   * Moving to another company invalidates whatever branch, department and
   * designation were chosen — they belong to the company being left.
   *
   * The ref is what makes this a *change* handler rather than an effect that also
   * fires on open: `startTransfer` seeds those three fields from the posting being
   * closed, and a plain dependency on the destination would clear the seed the
   * moment the dialog mounted.
   */
  const lastDestinationRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (dialog !== 'transfer') {
      // Reopening starts fresh, so the next open isn't read as a change.
      lastDestinationRef.current = undefined
      return
    }
    if (lastDestinationRef.current === destinationCompanyId) return
    const isFirstRead = lastDestinationRef.current === undefined
    lastDestinationRef.current = destinationCompanyId
    // The first read IS the seed — the company the employee is already in.
    if (isFirstRead) return

    transferForm.setValue('branchId', '')
    transferForm.setValue('departmentId', '')
    transferForm.setValue('designationId', '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog, destinationCompanyId])

  /*
   * The new posting must start after the old one closed, and that error sits on
   * the joining date. Moving the *leaving* date won't clear it on its own — a
   * resolver only refreshes the field that changed — so re-check it here.
   */
  const transferLeavingDate = useWatch({
    control: transferForm.control,
    name: 'leavingDate',
  })

  useEffect(() => {
    if (transferForm.formState.errors.joiningDate) void transferForm.trigger('joiningDate')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferLeavingDate])

  /* ── Contract dates on the transfer form ───────────────────────────────── */

  const transferValues = useWatch({ control: transferForm.control })

  useEffect(() => {
    if (dialog !== 'transfer') return
    const {
      employmentType = '',
      joiningDate = '',
      contractPeriod = '',
      contractPeriodType = '',
    } = transferValues

    if (employmentType === PERMANENT_EMPLOYMENT_TYPE) {
      if (transferForm.getValues('renewalDate')) transferForm.setValue('renewalDate', '')
      return
    }
    const derived = deriveRenewalDate(joiningDate, contractPeriod, contractPeriodType)
    if (derived && derived !== transferForm.getValues('renewalDate')) {
      transferForm.setValue('renewalDate', derived, { shouldValidate: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dialog,
    transferValues.employmentType,
    transferValues.joiningDate,
    transferValues.contractPeriod,
    transferValues.contractPeriodType,
  ])

  /* ── Opening the dialogs ───────────────────────────────────────────────── */

  /**
   * Start a transfer. The new posting is seeded from the one being closed, since a
   * transfer usually changes one thing — a branch, a designation — rather than
   * everything; and the leaving date defaults to today with the new posting
   * starting the day after, which is what the schema requires anyway.
   *
   * When the employee has already left there is nothing left to close, so the
   * closed posting's own leaving date is what the (still mandatory) leaving field
   * repeats, and the new posting starts today — or the day after the exit, when
   * they left today, since the schema won't take the two on the same day.
   */
  const startTransfer = () => {
    const posting = postingToFollow
    if (!posting) return

    /*
     * Today, but never before the posting opened — that joining date is the
     * field's own floor, and a seed below it would be clamped for display while
     * the form kept (and sent) the earlier day.
     */
    const leavingDate = isRejoining
      ? toFormDate(posting.leavingDate)
      : maxIso(todayIso(), toFormDate(posting.joiningDate))
    const startDate = isRejoining
      ? maxIso(todayIso(), nextDayIso(leavingDate))
      : nextDayIso(leavingDate)

    setActiveServiceId(posting.id)
    transferForm.reset({
      ...EMPTY_EMPLOYEE_TRANSFER_FORM,
      leavingDate,
      joiningDate: startDate,
      confirmationDate: startDate,
      companyId: String(posting.companyId),
      branchId: posting.branchId === null ? '' : String(posting.branchId),
      departmentId: posting.departmentId === null ? '' : String(posting.departmentId),
      designationId: posting.designationId === null ? '' : String(posting.designationId),
    })
    setDialog('transfer')
  }

  const startEdit = (row: EmployeeTransfer) => {
    setActiveServiceId(row.id)
    setDialog('edit')
  }

  const startLeave = () => {
    const posting = openPosting
    if (!posting) return
    setActiveServiceId(posting.id)
    leaveForm.reset({
      leavingDate: maxIso(todayIso(), toFormDate(posting.joiningDate)),
      leavingReason: '',
    })
    setDialog('leave')
  }

  const startDetail = (row: EmployeeTransfer) => {
    setActiveServiceId(row.id)
    setDialog('detail')
  }

  const closeDialog = () => {
    setDialog(null)
    setActiveServiceId(undefined)
  }

  /* ── Submits ───────────────────────────────────────────────────────────── */

  const submitTransfer = transferForm.handleSubmit((values) => {
    transferEmployee.mutate(
      { values, currentCompanyId: postingToFollow?.companyId },
      {
        onSuccess: () => {
          toast.success('Employee transferred')
          closeDialog()
        },
        onError: (error) =>
          toast.error(getApiErrorMessage(error, "Couldn't transfer the employee.")),
      },
    )
  })

  const submitEdit = editForm.handleSubmit((values) => {
    if (activeServiceId === undefined) return
    updateService.mutate(
      { serviceId: activeServiceId, values },
      {
        onSuccess: () => {
          toast.success('Posting updated')
          closeDialog()
        },
        onError: (error) =>
          toast.error(getApiErrorMessage(error, "Couldn't update the posting.")),
      },
    )
  })

  const submitLeave = leaveForm.handleSubmit((values) => {
    if (activeServiceId === undefined) return
    leaveService.mutate(
      { serviceId: activeServiceId, values },
      {
        onSuccess: () => {
          toast.success('Posting closed')
          closeDialog()
        },
        onError: (error) =>
          toast.error(getApiErrorMessage(error, "Couldn't close the posting.")),
      },
    )
  })

  const isForbidden = isForbiddenError(list.error)

  return {
    rows,
    isLoading: list.isLoading,
    isError: list.isError && !isForbidden,
    error: list.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(list.error) : undefined,

    /** True while a posting is open — closing the service needs one. */
    hasOpenPosting: openPosting !== undefined,
    /** Adding a posting only needs an earlier one to follow, open or closed. */
    canAddService: postingToFollow !== undefined,
    /** True when the new posting is a rejoin rather than a move. */
    isRejoining,
    /** The joining date of the posting being followed, as the dialogs' floor. */
    openPostingJoiningDate: toFormDate(postingToFollow?.joiningDate),

    dialog,
    closeDialog,
    startTransfer,
    startEdit,
    startLeave,
    startDetail,

    transfer: {
      form: transferForm,
      options: transferOptions,
      /** True once the chosen company isn't the one the employee is in today. */
      isCrossCompany:
        destinationCompanyId !== undefined &&
        destinationCompanyId !== postingToFollow?.companyId,
      /** The masters below belong to a company, so none can be listed without one. */
      needsCompany: destinationCompanyId === undefined,
      companyOptions,
      isCompaniesLoading: companies.isLoading,
      onSubmit: submitTransfer,
      isPending: transferEmployee.isPending,
    },

    edit: {
      form: editForm,
      options: editOptions,
      onSubmit: submitEdit,
      isPending: updateService.isPending,
      isLoading: detail.isLoading,
    },

    leave: {
      form: leaveForm,
      onSubmit: submitLeave,
      isPending: leaveService.isPending,
    },

    /** The expanded posting behind the Details dialog. */
    detail: {
      data: detail.data,
      isLoading: detail.isLoading,
      isError: detail.isError,
      error: detail.error,
    },
  }
}
