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
  const transferType = useWatch({ control: transferForm.control, name: 'transferType' })
  const newCompanyId = useWatch({ control: transferForm.control, name: 'newCompanyId' })
  const editBranchId = useWatch({ control: editForm.control, name: 'branchId' })

  /*
   * A company transfer must point at the DESTINATION company's masters, not the
   * session's — its branches, departments and designations are different rows
   * entirely. So the chosen company scopes the three reads; a branch change (or no
   * company picked yet) falls back to the active company.
   */
  const destinationCompanyId =
    transferType === 'company' && newCompanyId.trim() ? Number(newCompanyId) : undefined

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
    if (isFirstRead && destinationCompanyId === undefined) return

    transferForm.setValue('branchId', '')
    transferForm.setValue('departmentId', '')
    transferForm.setValue('designationId', '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog, destinationCompanyId])

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
   */
  const startTransfer = () => {
    const posting = openPosting ?? latestPosting
    if (!posting) return

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const nextDay = tomorrow.toISOString().slice(0, 10)

    setActiveServiceId(posting.id)
    transferForm.reset({
      ...EMPTY_EMPLOYEE_TRANSFER_FORM,
      leavingDate: todayIso(),
      joiningDate: nextDay,
      confirmationDate: nextDay,
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
    leaveForm.reset({ leavingDate: todayIso(), leavingReason: '' })
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
    transferEmployee.mutate(values, {
      onSuccess: () => {
        toast.success('Employee transferred')
        closeDialog()
      },
      onError: (error) =>
        toast.error(getApiErrorMessage(error, "Couldn't transfer the employee.")),
    })
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

    /** True while a posting is open — the two closing actions need one. */
    hasOpenPosting: openPosting !== undefined,
    /** The joining date of the posting being closed, as the dialogs' floor. */
    openPostingJoiningDate: toFormDate(openPosting?.joiningDate),

    dialog,
    closeDialog,
    startTransfer,
    startEdit,
    startLeave,
    startDetail,

    transfer: {
      form: transferForm,
      options: transferOptions,
      /** True once a cross-company move has its destination chosen. */
      isCrossCompany: destinationCompanyId !== undefined,
      /** A company transfer can't list the destination's masters until it's picked. */
      needsCompany: transferType === 'company' && destinationCompanyId === undefined,
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
