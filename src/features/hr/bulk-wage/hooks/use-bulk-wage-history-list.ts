import { usePagination } from '@/hooks/use-pagination'
import { EMPTY_PAGE } from '@/lib/pagination'
import { useAuthStore } from '@/stores/auth-store'
import { useWageHeads } from '@/features/master/designation'
import { useBulkWageHistory } from '../api/use-bulk-wage-history'

/** Designations per page — one title's whole history is a tall block. */
const HISTORY_PAGE_SIZE = 10

/** Page sizes the footer offers. `HISTORY_PAGE_SIZE` has to be one of them. */
export const HISTORY_PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

/**
 * Owns the wage structure history screen — the read-only twin of the bulk wage
 * grid: which company's history is on it, which page of designations, and the
 * heads its columns are built from.
 *
 * Nothing here is editable, so unlike the grid there's no form, no dirty
 * tracking and no save. What it does have that the grid doesn't is paging: the
 * grid is saved whole and so must be read whole, while this screen only reads
 * and a company's full history is far too long for one request.
 *
 * The paging is over the *designations*, which is how the endpoint pages too —
 * so a title always arrives with its complete history rather than half of it.
 */
export function useBulkWageHistoryList() {
  /* The history of the company the session is working in — the same company the
     bulk wage grid writes, so the two screens can't disagree about whose payroll
     is on screen. */
  const companyId = useAuthStore((state) => state.user?.companyId ?? null)

  const pagination = usePagination(HISTORY_PAGE_SIZE)
  const query = useBulkWageHistory(companyId, pagination.params)
  const { heads } = useWageHeads()

  const { items: designations, total } = query.data ?? EMPTY_PAGE

  return {
    companyId,
    designations,
    total,
    heads,

    limit: pagination.limit,
    offset: pagination.offset,
    onPaginationChange: pagination.onPaginationChange,

    isLoading: query.isLoading,
    /** A page arriving over the one already on screen — the grid stays put. */
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
  }
}
