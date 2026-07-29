import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { WageStructureInput } from '../lib/wage-structure-mappers'
import { createDesignationWageStructures } from './designation-wage-api'

/**
 * POST /designations/:id/wage-structures — append the drafted rows to the
 * history, then seed the cache from the refreshed list the save returns.
 */
export function useCreateDesignationWageStructures(designationId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rows: WageStructureInput[]) =>
      createDesignationWageStructures(designationId, rows),
    onSuccess: (history) => {
      queryClient.setQueryData(
        queryKeys.designation.wageStructures(designationId),
        history,
      )
    },
  })
}
