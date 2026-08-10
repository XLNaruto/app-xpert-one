import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ALL_ROWS, type PageParams } from '@/lib/pagination'
import { fetchShiftRotation, fetchShiftRotations } from './shift-rotation-api'

/**
 * GET /user/shift-rotations — a company's rotation cycles, newest first.
 *
 * One limit/offset page — pass the params from `usePagination()`. Called with no
 * params it returns the whole master, which is what the employee tab's rotation
 * dropdown reads.
 *
 * `companyId` is the company on screen; the master screen leaves it off and works
 * on the session's active company.
 */
export function useShiftRotations(params: PageParams = ALL_ROWS, companyId?: number) {
  return useQuery({
    queryKey: queryKeys.shiftRotation.list(params, companyId),
    queryFn: () => fetchShiftRotations(params, companyId),
    // Keep the previous page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}

/** GET /user/shift-rotations/:id — one rotation with its whole cycle. */
export function useShiftRotation(id: number) {
  return useQuery({
    queryKey: queryKeys.shiftRotation.detail(id),
    queryFn: () => fetchShiftRotation(id),
    enabled: Number.isFinite(id),
  })
}
