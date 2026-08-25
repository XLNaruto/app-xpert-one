import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { usePagination } from '@/hooks/use-pagination'
import { encryptId } from '@/lib/crypto'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { LEAVE_DEFAULT_SORT, LEAVE_TAB_MINE } from '../constants'
import { leaveDecisionSchema, type LeaveDecisionFormValues } from '../schemas'
import { useLeaves } from '../api/use-leaves'
import { useDecideLeave, useDeleteLeave } from '../api/use-leave-mutations'
import { groupLeaves } from '../lib/leave-mappers'
import { describeApplication } from '../lib/leave-summary'
import type { LeaveGroup } from '../types'

/**
 * Orchestrates the leave register: the paged list, the status filter, navigation
 * to the create/edit screen, the delete flow and the approve/reject decision.
 * The page consumes this and only renders.
 *
 * Search, paging and sorting are all server-side — the register grows without
 * bound, so the endpoint does the work and the table reports pages back as
 * limit/offset.
 *
 * **The rows are grouped before they're rendered.** The endpoint answers one row
 * per stored row, and an application whose range outran the leave type's paid
 * allowance is stored as TWO — a paid row and an unpaid one sharing an
 * `applicationRef`. They were filed as one thing and are approved, rejected and
 * deleted as one thing, so they are shown as one line. Every write is addressed to
 * the group's first row id, which moves the whole application.
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

  /**
   * The tab in force. `''` is every status; `MINE` is `pending_with_me=true`,
   * which is a different question from a status and so travels as its own param.
   */
  const [statusFilter, setStatusFilter] = useState('')
  /** Paid / unpaid narrows what's being LOOKED at — it is never a choice on a leave. */
  const [payTypeFilter, setPayTypeFilter] = useState('')

  const isMyQueue = statusFilter === LEAVE_TAB_MINE
  const list = useLeaves(params, {
    ...(isMyQueue
      ? // The endpoint implies `status=PENDING` itself — sending both would be
        // saying the same thing twice.
        { pendingWithMe: true }
      : statusFilter
        ? { status: statusFilter }
        : {}),
    ...(payTypeFilter ? { payType: payTypeFilter } : {}),
  })
  const deleteLeave = useDeleteLeave()
  const decideLeave = useDecideLeave()

  /**
   * One line per application. Grouping happens within the page the server sent:
   * both halves of a split normally arrive together, and a split that straddles a
   * page boundary shows the half each page holds.
   */
  const rows = useMemo(() => groupLeaves(list.data?.items ?? []), [list.data])

  const [pendingDelete, setPendingDelete] = useState<LeaveGroup | null>(null)
  /** The pending application being approved or rejected, with the decision chosen. */
  const [deciding, setDeciding] = useState<{
    leave: LeaveGroup
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

  const startDecision = (leave: LeaveGroup, status: 'APPROVED' | 'REJECTED') => {
    decisionForm.reset({ status, remark: '' })
    setDeciding({ leave, status })
  }
  const closeDecision = () => setDeciding(null)

  const onSubmitDecision = decisionForm.handleSubmit((values) => {
    if (!deciding) return
    decideLeave.mutate(
      // Any row of the application moves all of it, and the employee gets one
      // notification covering the whole range.
      { id: deciding.leave.id, values },
      {
        onSuccess: (application) => {
          toast.success(
            values.status === 'APPROVED' ? 'Leave approved' : 'Leave rejected',
            { description: describeApplication(application, deciding.leave.leaveType) },
          )
          closeDecision()
        },
        /*
         * A 403 is possible here even with `leaves:update` — the leave may be
         * standing at somebody else's level of the approval chain. The server's
         * message names that level ("This leave is with HR (level 1)…"), which is
         * exactly what tells the user who to chase, so it is surfaced verbatim.
         * A 400 "already approved" says the row on screen is stale. The dialog
         * stays open behind either rather than closing on a failure.
         */
        onError: (error) =>
          toast.error(getApiErrorMessage(error, "Couldn't record the decision.")),
      },
    )
  })

  const confirmDelete = () => {
    if (!pendingDelete) return
    // Deletes the whole application — both halves of a split.
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

  const changePayTypeFilter = (value: string) => {
    setPayTypeFilter(value)
    onPaginationChange({ limit, offset: 0 })
  }

  const isForbidden = isForbiddenError(list.error)

  return {
    rows,
    /**
     * The server's ROW count, not the number of lines on screen — it is what the
     * endpoint pages by, so the pager has to speak in it.
     */
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
    payTypeFilter,
    changePayTypeFilter,
    isMyQueue,
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
