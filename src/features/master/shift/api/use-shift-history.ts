import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchShiftHistory } from './shift-api'

/**
 * GET /user/shifts/:id/history — one shift's dated versions, newest first.
 *
 * This is what answers "why was this employee marked late on 12 August?": the
 * attendance engine reads a shift AS OF the day it stamps, so the rules that
 * judged a closed day are the ones on the version in force back then, not the
 * ones on screen today.
 *
 * Read only by the history panel, so it stays disabled until a shift is opened.
 */
export function useShiftHistory(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.shift.history(id ?? 0),
    queryFn: () => fetchShiftHistory(id as number),
    enabled: id !== undefined,
  })
}
