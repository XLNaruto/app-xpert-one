import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { usePagination } from '@/hooks/use-pagination'
import { encryptId } from '@/lib/crypto'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import {
  ALL_FILTER,
  EMPTY_SUPPORT_TICKET_FILTERS,
  SUPPORT_TICKET_DEFAULT_SORT,
} from '../constants'
import { useSupportTickets } from '../api/use-support-tickets'
import {
  useCloseSupportTicket,
  useReopenSupportTicket,
} from '../api/use-support-ticket-mutations'
import type { SupportTicket, SupportTicketFilters } from '../types'

/**
 * Orchestrates the Raise Support screen: the paged list, its server-side
 * facets, navigation to the form and detail, and the two transitions this side
 * of the desk owns — reopen and close.
 *
 * Search, paging, sorting and every facet are server-side, so a header click or
 * a filter change re-queries rather than reordering the rows already on screen.
 *
 * Resolving is the PLATFORM's job, not ours. What this screen can do to a
 * finished ticket is accept it (close) or hand it back (reopen with a reason) —
 * there is no delete at all, because the platform's SLA reports are counted over
 * these rows.
 */
export function useSupportTicketList() {
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
  } = usePagination(DEFAULT_PAGE_SIZE, SUPPORT_TICKET_DEFAULT_SORT)

  const [filters, setFilters] = useState<SupportTicketFilters>(
    EMPTY_SUPPORT_TICKET_FILTERS,
  )

  const { data, isLoading, isError, error } = useSupportTickets(params, filters)

  const reopenTicket = useReopenSupportTicket()
  const closeTicket = useCloseSupportTicket()

  /** The ticket the reopen dialog is open for, and the reason being typed. */
  const [pendingReopen, setPendingReopen] = useState<SupportTicket | null>(null)
  const [reopenReason, setReopenReason] = useState('')

  /** The ticket the close confirmation is open for. */
  const [pendingClose, setPendingClose] = useState<SupportTicket | null>(null)

  /** A different filter is a different result set, so it starts at its own first page. */
  const setFilter = <K extends keyof SupportTicketFilters>(
    key: K,
    value: SupportTicketFilters[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    onPaginationChange({ limit, offset: 0 })
  }

  /**
   * The "Open only" facet is a shortcut for the three unfinished statuses at
   * once, so picking a specific status clears it — the API would ignore one of
   * the two anyway, and a chip claiming a filter that isn't applied lies.
   */
  const changeStatus = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      status: value,
      openOnly: value ? false : prev.openOnly,
    }))
    onPaginationChange({ limit, offset: 0 })
  }

  const toggleOpenOnly = (value: string) => {
    const openOnly = value === 'true'
    setFilters((prev) => ({
      ...prev,
      openOnly,
      status: openOnly ? ALL_FILTER : prev.status,
    }))
    onPaginationChange({ limit, offset: 0 })
  }

  const resetFilters = () => {
    setSearch('')
    setFilters(EMPTY_SUPPORT_TICKET_FILTERS)
    onPaginationChange({ limit, offset: 0 })
  }

  const goToCreate = () => navigate({ to: '/support/ticket/create' })
  // Edit reuses the create screen; the raw id travels encrypted in `?data=` so
  // it's never exposed in the address bar.
  const goToEdit = (id: number) =>
    navigate({ to: '/support/ticket/create', search: { data: encryptId(id) } })
  const goToDetail = (id: number) =>
    navigate({ to: '/support/ticket/detail', search: { data: encryptId(id) } })

  const openReopen = (ticket: SupportTicket) => {
    setReopenReason('')
    setPendingReopen(ticket)
  }

  const confirmReopen = () => {
    if (!pendingReopen || !reopenReason.trim()) return
    reopenTicket.mutate(
      { id: pendingReopen.id, reason: reopenReason },
      {
        onSuccess: () => {
          toast.success('Ticket reopened')
          toast.info('The deadline is unchanged — reopening does not re-buy the clock.')
          setPendingReopen(null)
          setReopenReason('')
        },
        onError: (err) =>
          toast.error(getApiErrorMessage(err, "Couldn't reopen the ticket.")),
      },
    )
  }

  const confirmClose = () => {
    if (!pendingClose) return
    closeTicket.mutate(pendingClose.id, {
      onSuccess: () => {
        toast.success('Ticket closed')
        setPendingClose(null)
      },
      onError: (err) => toast.error(getApiErrorMessage(err, "Couldn't close the ticket.")),
    })
  }

  /** Whether any facet is narrowing the list — drives the empty state's wording. */
  const hasFilters = useMemo(
    () =>
      Boolean(
        filters.status || filters.openOnly || filters.ticketType || filters.priority,
      ),
    [filters],
  )

  // A 403 isn't a broken screen, it's a missing permission.
  const isForbidden = isForbiddenError(error)

  return {
    rows: data?.items ?? [],
    // Server pagination — the table reports pages back as limit/offset.
    total: data?.total ?? 0,
    limit,
    offset,
    onPaginationChange,
    search,
    setSearch,
    sorting,
    onSortingChange,

    filters,
    setFilter,
    changeStatus,
    toggleOpenOnly,
    resetFilters,
    hasFilters,

    isLoading,
    isError: isError && !isForbidden,
    error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(error) : undefined,

    goToCreate,
    goToEdit,
    goToDetail,

    pendingReopen,
    setPendingReopen,
    openReopen,
    reopenReason,
    setReopenReason,
    confirmReopen,
    isReopening: reopenTicket.isPending,

    pendingClose,
    setPendingClose,
    confirmClose,
    isClosing: closeTicket.isPending,
  }
}
