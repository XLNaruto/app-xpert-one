import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { saveBonuses } from './bonus-estimation-api'
import type { SaveBonusPayload } from '../schemas'

/**
 * Save Bonus — commit the ticked employees' bonuses for the range.
 *
 * Invalidates the whole bonus family and nothing else. Both reads go stale at
 * once: the committed bonuses obviously, and the estimate too, because a month
 * that now carries a bonus would be *skipped* by a second save — so re-estimating
 * the same range has to reflect that rather than invite the same amounts again.
 *
 * It deliberately doesn't reach `salary` or `reports`: a bonus is written against
 * salary rows without changing any figure on them, so nothing those screens show
 * has moved. `advance_bonus` on this screen is the BONUS *pay component*, paid
 * through the register — a different thing from what is saved here.
 *
 * Invalidates on a **partly** refused save too: whatever did commit is already
 * stale on screen, and the refusals are the caller's to report.
 */
export function useSaveBonuses() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SaveBonusPayload) => saveBonuses(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bonusEstimation.all })
    },
  })
}
