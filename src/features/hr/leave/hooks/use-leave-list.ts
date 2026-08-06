import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { usePagination } from '@/hooks/use-pagination'
import { encryptId } from '@/lib/crypto'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { LEAVE_DEFAULT_SORT } from '../constants'
import { leaveDecisionSchema, type LeaveDecisionFormValues } from '../schemas'
import { useLeaves } from '../api/use-leaves'
import { useDecideLeave, useDeleteLeave } from '../api/use-leave-mutations'
import type { Leave } from '../types'

/**
 * Orchestrates the leave register: the paged list, the status filter, navigation
 * to the create/edit screen, the delete flow and the approve/reject decision.
 * The page consumes this and only renders.
 *
 * Search, paging and sorting are all server-side — the register grows without
 * bound, so the endpoint does the work and the table reports pages back as
 * limit/offset.
 */
export function useLeaveList() {
  const navigate = useNavigate()
  const {
    params,
    limit,
    offset,
    search,
    setSearch,
    onPaginationChange,
    sorting,
    onSortingChange,
  } = usePagination(DEFAULT_PAGE_SIZE, LEAVE_DEFAULT_SORT)

  /** Status filter — `''` is every status, which the API gets as no filter. */
  const [statusFilter, setStatusFilter] = useState('')

  const list = useLeaves(params, statusFilter ? { status: statusFilter } : {})
  const deleteLeave = useDeleteLeave()
  const decideLeave = useDecideLeave()

  const [pendingDelete, setPendingDelete] = useState<Leave | null>(null)
  /** The pending leave being approved or rejected, with the decision chosen. */
  const [deciding, setDeciding] = useState<{
    leave: Leave
    status: 'APPROVED' | 'REJECTED'
  } | null>(null)

  const decisionForm = useForm<LeaveDecisionFormValues>({
    resolver: zodResolver(leaveDecisionSchema),
    defaultValues: { status: 'APPROVED', remark: '' },
  })

  const goToCreate = () => navigate({ to: '/hr/leave/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({ to: '/hr/leave/create', search: { data: encryptId(id) } })

  const startDecision = (leave: Leave, status: 'APPROVED' | 'REJECTED') => {
    decisionForm.reset({ status, remark: '' })
    setDeciding({ leave, status })
  }
  const closeDecision = () => setDeciding(null)

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
    deleteLeave.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Leave removed')
        setPendingDelete(null)
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
    // Server-side ordering — a header click re-queries instead of sorting the
    // page on screen.
    sorting,
    onSortingChange,
    statusFilter,
    changeStatusFilter,
    isLoading: list.isLoading,
    isError: list.isError && !isForbidden,
    error: list.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(list.error) : undefined,

    goToCreate,
    goToEdit,

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
