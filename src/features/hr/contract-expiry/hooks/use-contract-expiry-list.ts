import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { usePagination } from '@/hooks/use-pagination'
import { ApiError, getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import {
  ANY_STATUS,
  CONTRACT_EXPIRY_PAGE_SIZE,
  EMPTY_CONTRACT_EXPIRY_FILTERS,
} from '../constants'
import { formatDay } from '../lib/contract-format'
import { useExpiringContracts } from '../api/use-expiring-contracts'
import {
  useCompleteContract,
  useRenewContract,
} from '../api/use-contract-mutations'
import type {
  ContractCompleteFormValues,
  ContractRenewFormValues,
} from '../schemas'
import type {
  ContractExpiryFilters,
  ContractExpiryParams,
  ContractStatus,
  ExpiringContract,
} from '../types'

/**
 * The worklist and the two actions on a row — the whole screen, and the
 * dashboard card, driven from one hook.
 *
 * Three things make it unlike an ordinary list hook:
 *
 * **It is never sorted here.** Rows arrive soonest `renewal_due_on` first, then
 * posting id, done in SQL — so `expired` rows float to the top on their own and
 * `total` always agrees with the page. The endpoint takes no `sort`, and the
 * table is mounted without sorting for that reason.
 *
 * **A 409 is not a failure.** It means somebody else completed the posting
 * first. The honest answer is to refetch the list — the row is gone — rather
 * than to show a red error over a screen whose data is simply stale.
 *
 * **Nothing is recomputed after a write.** The response carries the new
 * `contract_ends_on`, and that is what the success toast quotes. A local
 * derivation would name the term that was just replaced.
 */

interface ContractExpiryListOptions {
  /** Rows per page. The dashboard card fixes this and hides the pager. */
  pageSize?: number
  /**
   * Companies imposed from outside — the dashboard's own filter. When given, the
   * screen's company picker is not in play and this is what narrows the list.
   */
  companyIds?: string[]
  /** Whether this instance offers the search box and the facets. */
  filterable?: boolean
}

export function useContractExpiryList({
  pageSize = CONTRACT_EXPIRY_PAGE_SIZE,
  companyIds,
  filterable = true,
}: ContractExpiryListOptions = {}) {
  // No `defaultSort`: the endpoint takes no sort, and the order it applies —
  // soonest review first — is the point of the screen.
  const pagination = usePagination(pageSize)
  const { limit, offset, params } = pagination

  const [filters, setFilters] = useState<ContractExpiryFilters>(
    EMPTY_CONTRACT_EXPIRY_FILTERS,
  )

  /** Only `employees:update` may act; `dashboard:read` alone is read-only. */
  const { canUpdate } = useResourceAccess(PERMISSIONS.employees)

  /** The imposed companies win over the screen's own picker. */
  const selectedCompanyIds = companyIds ?? filters.companyIds

  const query = useMemo<ContractExpiryParams>(() => {
    const ids = selectedCompanyIds.map((id) => id.trim()).filter(Boolean)
    return {
      limit,
      offset,
      // An empty value is read as ABSENT by the API, but the key is omitted
      // rather than relying on that.
      ...(ids.length ? { company_ids: ids.join(',') } : {}),
      ...(filterable && params.search ? { term: params.search } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      // `0` is the worklist itself — sent only when the user previews past it.
      ...(filters.withinDays > 0 ? { within_days: filters.withinDays } : {}),
    }
  }, [limit, offset, selectedCompanyIds, filterable, params.search, filters])

  const list = useExpiringContracts(query)

  const renew = useRenewContract()
  const complete = useCompleteContract()

  /** The row a dialog is open on — `null` when it is closed. */
  const [pendingRenew, setPendingRenew] = useState<ExpiringContract | null>(null)
  const [pendingComplete, setPendingComplete] = useState<ExpiringContract | null>(null)

  /**
   * Somebody else closed this posting first. The list in hand is stale rather
   * than wrong, so the fix is to refetch it and say so — not to fail loudly.
   */
  const handleWriteError = useCallback(
    (error: unknown, fallback: string) => {
      if (error instanceof ApiError && error.status === 409) {
        toast.info('That posting was already closed. Refreshing the list…')
        void list.refetch()
        return true
      }
      toast.error(getApiErrorMessage(error, fallback))
      return false
    },
    [list],
  )

  const confirmRenew = useCallback(
    (values: ContractRenewFormValues) => {
      const row = pendingRenew
      if (!row) return
      renew.mutate(
        { employeeId: row.employeeId, values },
        {
          onSuccess: (posting) => {
            // The END comes off the RESPONSE. A renewal keeps the joining date
            // and replaces the period, so anything computed here would name the
            // term that was just replaced.
            toast.success(
              posting.contractEndsOn
                ? `Contract renewed to ${formatDay(posting.contractEndsOn)}.`
                : 'Contract renewed.',
            )
            setPendingRenew(null)
          },
          onError: (error) => {
            if (handleWriteError(error, "Couldn't renew the contract.")) {
              setPendingRenew(null)
            }
          },
        },
      )
    },
    [pendingRenew, renew, handleWriteError],
  )

  const confirmComplete = useCallback(
    (values: ContractCompleteFormValues) => {
      const row = pendingComplete
      if (!row) return
      complete.mutate(
        { employeeId: row.employeeId, values },
        {
          onSuccess: (posting) => {
            toast.success(
              posting.leavingDate
                ? `Service completed on ${formatDay(posting.leavingDate)}.`
                : 'Service completed.',
            )
            setPendingComplete(null)
          },
          onError: (error) => {
            if (handleWriteError(error, "Couldn't complete the service.")) {
              setPendingComplete(null)
            }
          },
        },
      )
    },
    [pendingComplete, complete, handleWriteError],
  )

  /** A different narrowing is a different result set — back to its first page. */
  const setFilter = useCallback(
    <K extends keyof ContractExpiryFilters>(
      key: K,
      value: ContractExpiryFilters[K],
    ) => {
      setFilters((prev) => ({ ...prev, [key]: value }))
      pagination.onPaginationChange({ limit, offset: 0 })
    },
    [pagination, limit],
  )

  const reset = useCallback(() => {
    setFilters(EMPTY_CONTRACT_EXPIRY_FILTERS)
    pagination.setSearch('')
    pagination.onPaginationChange({ limit, offset: 0 })
  }, [pagination, limit])

  const isForbidden = isForbiddenError(list.error)

  return {
    ...pagination,
    rows: list.data?.items ?? [],
    /** The size of the WORKLIST — what the badge and the pager both read. */
    total: list.data?.total ?? 0,
    isLoading: list.isPending,
    isFetching: list.isFetching,
    isError: list.isError,
    error: list.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(list.error) : undefined,

    filters,
    setFilter,
    setStatus: (status: ContractStatus | '') => setFilter('status', status),
    setWithinDays: (days: number) => setFilter('withinDays', days),
    reset,
    /** Whether any narrowing is applied — drives the empty state's wording. */
    isNarrowed:
      filters.status !== ANY_STATUS ||
      filters.withinDays > 0 ||
      filters.companyIds.length > 0 ||
      Boolean(params.search),
    /** True while previewing past the warning date, which admits `upcoming` rows. */
    isPreviewing: filters.withinDays > 0,

    /** Whether this role may renew or complete at all (`employees:update`). */
    canUpdate,
    pendingRenew,
    setPendingRenew,
    confirmRenew,
    isRenewing: renew.isPending,
    pendingComplete,
    setPendingComplete,
    confirmComplete,
    isCompleting: complete.isPending,
  }
}
