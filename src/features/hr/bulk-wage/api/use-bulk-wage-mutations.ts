import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { useWageHeads } from '@/features/master/designation'
import { saveBulkWage } from './bulk-wage-api'
import type { BulkWageUpdatePayload } from '../schemas'

/**
 * Save rows of the bulk wage grid — one request, whichever button sent it.
 *
 * The endpoint is transactional, so there's no partial success to unpick: the
 * whole grid comes back as stored and the caller seeds the form from it.
 *
 * A save writes wage structure versions, which the designation master reads too
 * (its detail carries the version in force, its tab the history), so it
 * invalidates the whole designation feature rather than this screen's key alone.
 */
export function useSaveBulkWage() {
  const queryClient = useQueryClient()
  const { heads } = useWageHeads()

  return useMutation({
    mutationFn: (payload: BulkWageUpdatePayload) => saveBulkWage(payload, heads),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.designation.all })
    },
  })
}
