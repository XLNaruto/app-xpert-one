import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePagination } from '@/hooks/use-pagination'
import { encryptId } from '@/lib/crypto'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { ALL_ROWS } from '@/lib/pagination'
import { useAuthStore } from '@/stores/auth-store'
import { useMyCompanies } from '@/features/company'
import { useAdminUsers } from '@/features/administration/admin-user'
import {
  ALL_FILTER,
  ANY_ASSIGNEE_OPTION,
  EMPLOYEE_TICKET_DEFAULT_SORT,
  EMPLOYEE_TICKET_TABS,
  EMPTY_EMPLOYEE_TICKET_FILTERS,
} from '../constants'
import {
  useEmployeeTicketSummary,
  useEmployeeTickets,
} from '../api/use-employee-tickets'
import type { EmployeeTicketFilters, EmployeeTicketSummary } from '../types'

/** Count for one tab — `''` (All) has no count of its own, so it shows none. */
function tabCount(
  value: string,
  summary: EmployeeTicketSummary | undefined,
): number | null {
  if (!summary) return null
  switch (value) {
    case 'open':
      return summary.open
    case 'in_progress':
      return summary.inProgress
    case 'reopened':
      return summary.reopened
    case 'resolved':
      return summary.resolved
    case 'closed':
      return summary.closed
    default:
      return null
  }
}

/**
 * Orchestrates the employee help desk queue: the paged list, the status tab
 * strip with its counts, the server-side facets and navigation to a thread.
 *
 * Everything is server-side — search, paging, sorting, every facet — so a tab
 * click re-queries rather than filtering the rows already on screen.
 *
 * The queue opens most-severe-then-oldest, which is the endpoint's own order and
 * the right one: this is work waiting on somebody. Nothing is *promised* behind
 * a severity here, though — it ranks the queue and carries no deadline, so
 * there's no overdue state to render and none to police.
 */
export function useEmployeeTicketList() {
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
  } = usePagination(DEFAULT_PAGE_SIZE, EMPLOYEE_TICKET_DEFAULT_SORT)

  const [filters, setFilters] = useState<EmployeeTicketFilters>(
    EMPTY_EMPLOYEE_TICKET_FILTERS,
  )

  const { data, isLoading, isError, error } = useEmployeeTickets(params, filters)
  const summary = useEmployeeTicketSummary(filters)

  const { companies } = useMyCompanies()

  /** Who is reading — so "On my plate" is one click rather than a name search. */
  const currentUser = useAuthStore((state) => state.user)
  const currentUserId = currentUser?.id ?? null

  /**
   * The assignee facet, from the account's existing user list — there is no
   * support-specific roster endpoint and no desk to filter by. Inactive people
   * stay pickable HERE (unlike the hand-over dialog): they may still be holding
   * tickets somebody needs to find.
   */
  const { data: users } = useAdminUsers(ALL_ROWS)

  const assigneeOptions = useMemo(() => {
    const roster = (users?.items ?? []).map((user) => ({
      label: user.id === currentUserId ? `${user.name} (you)` : user.name,
      value: String(user.id),
    }))
    // "On my plate" files the reader's own id into the facet, and the chip that
    // then appears is labelled from these options — so the reader has to be one
    // of them even before the roster answers, and whether or not that endpoint
    // lists them at all (an owner account isn't an admin user). Otherwise the
    // chip falls back to the raw id and reads as `14`.
    const hasMe = roster.some((option) => option.value === String(currentUserId))
    return [
      ANY_ASSIGNEE_OPTION,
      ...(currentUser && !hasMe
        ? [{ label: `${currentUser.name} (you)`, value: String(currentUser.id) }]
        : []),
      ...roster,
    ]
  }, [users?.items, currentUser, currentUserId])

  /**
   * '' is every company — the desk is staffed by people, not by company, so an
   * HR user covering two of them sees both without switching screens.
   */
  const companyOptions = useMemo(
    () => [
      { label: 'All companies', value: ALL_FILTER },
      ...companies.map((company) => ({ label: company.name, value: String(company.id) })),
    ],
    [companies],
  )

  /** The tab strip, each position carrying its count from the summary read. */
  const tabs = useMemo(
    () =>
      EMPLOYEE_TICKET_TABS.map((tab) => ({
        ...tab,
        count: tabCount(tab.value, summary.data),
      })),
    [summary.data],
  )

  /** A different filter is a different result set, so it starts at its own first page. */
  const setFilter = <K extends keyof EmployeeTicketFilters>(
    key: K,
    value: EmployeeTicketFilters[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    onPaginationChange({ limit, offset: 0 })
  }

  /**
   * The tab strip IS the status filter. Picking one clears "unfinished only",
   * which spans three tabs — the API would ignore one of the two anyway, and a
   * chip claiming a filter that isn't applied lies.
   */
  const changeStatus = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      status: value,
      openOnly: value ? false : prev.openOnly,
      unassignedOnly: value ? false : prev.unassignedOnly,
    }))
    onPaginationChange({ limit, offset: 0 })
  }

  /**
   * "Outstanding work nobody has taken" — the queue's real starting point.
   *
   * It carries its own status predicate, so turning it on clears both the status
   * tab and "unfinished only": the API would ignore them, and a chip claiming a
   * filter that isn't applied lies.
   */
  const toggleUnassignedOnly = (value: string) => {
    const unassignedOnly = value === 'true'
    setFilters((prev) => ({
      ...prev,
      unassignedOnly,
      status: unassignedOnly ? ALL_FILTER : prev.status,
      openOnly: unassignedOnly ? false : prev.openOnly,
      // Nobody's plate and one person's plate are contradictory questions.
      assignedToUserId: unassignedOnly ? ALL_FILTER : prev.assignedToUserId,
    }))
    onPaginationChange({ limit, offset: 0 })
  }

  /** Narrow to one person's desk. Picking anybody drops "unassigned only". */
  const changeAssignee = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      assignedToUserId: value,
      unassignedOnly: value ? false : prev.unassignedOnly,
    }))
    onPaginationChange({ limit, offset: 0 })
  }

  /** The one-click "what is on my plate", off the signed-in user's own id. */
  const showMyDesk = () => {
    if (!currentUserId) return
    changeAssignee(String(currentUserId))
  }

  const isMyDesk =
    currentUserId !== null && filters.assignedToUserId === String(currentUserId)

  const toggleOpenOnly = (value: string) => {
    const openOnly = value === 'true'
    setFilters((prev) => ({
      ...prev,
      openOnly,
      status: openOnly ? ALL_FILTER : prev.status,
      // "Unassigned only" already means the three unfinished statuses, and wins
      // over this one server-side — so it can't be left showing as applied.
      unassignedOnly: openOnly ? false : prev.unassignedOnly,
    }))
    onPaginationChange({ limit, offset: 0 })
  }

  const resetFilters = () => {
    setSearch('')
    setFilters(EMPTY_EMPLOYEE_TICKET_FILTERS)
    onPaginationChange({ limit, offset: 0 })
  }

  // The id travels encrypted in `?data=` so it's never exposed in the address bar.
  const goToDetail = (id: number) =>
    navigate({ to: '/support/employee-ticket/detail', search: { data: encryptId(id) } })

  /** Whether any facet is narrowing the queue — drives the empty state's wording. */
  const hasFilters = useMemo(
    () =>
      Boolean(
        filters.status ||
          filters.openOnly ||
          filters.category ||
          filters.priority ||
          filters.companyId ||
          filters.assignedToUserId ||
          filters.unassignedOnly,
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
    toggleUnassignedOnly,
    changeAssignee,
    showMyDesk,
    isMyDesk,
    canShowMyDesk: currentUserId !== null,
    resetFilters,
    hasFilters,
    companyOptions,
    assigneeOptions,
    tabs,

    isLoading,
    isError: isError && !isForbidden,
    error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(error) : undefined,

    goToDetail,
  }
}
