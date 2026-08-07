import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { deleteSalaries, saveSalaries } from './salary-api'
import type { SalarySavePayload } from '../schemas'

/**
 * Process the month for the rows sent — one request, whichever button sent it.
 *
 * Invalidates the whole salary feature rather than the page's own key: a save
 * moves rows from the pending side of the register to the processed one, so the
 * tab that wasn't looked at is exactly the one that went stale. The company's
 * `totals` move with it.
 */
export function useSaveSalaries() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SalarySavePayload) => saveSalaries(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.salary.all })
    },
  })
}

/**
 * Discard processed salaries so the month can be run again — the same
 * invalidation, in the other direction: the rows return to the pending side.
 */
export function useDeleteSalaries() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (salaryIds: number[]) => deleteSalaries(salaryIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.salary.all })
    },
  })
}
