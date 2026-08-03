import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { wageRowToPayload } from '../lib/wage-structure-mappers'
import type { WageStructureRow } from '../schemas'
import type { DesignationWageStructure } from '../types'
import {
  createDesignationWageStructure,
  updateDesignationWageStructure,
} from './designation-wage-api'
import { useWageHeads } from './use-wage-heads'

/**
 * Save the wage structure tab — one request per row on the grid, told apart by
 * whether the row is a stored version being corrected or a new one:
 *
 * - a row carrying a `wageStructureId` was opened from the history → **PATCH** it
 * - a row drafted from scratch → **POST** a new version
 *
 * The rows go one at a time and in order, deliberately. A POST starts from the
 * version in force and applies its fields on top, so two revisions sent at once
 * would race over which one the second inherits from.
 *
 * The designation's detail read carries the version in force, so a save
 * invalidates the whole feature rather than just the history.
 */
export function useSaveDesignationWageStructures(designationId: number) {
  const queryClient = useQueryClient()
  const { heads } = useWageHeads()

  return useMutation({
    mutationFn: async (rows: WageStructureRow[]) => {
      const saved: DesignationWageStructure[] = []
      for (const row of rows) {
        const payload = wageRowToPayload(row, heads)
        saved.push(
          row.wageStructureId === undefined
            ? await createDesignationWageStructure(designationId, payload, heads)
            : await updateDesignationWageStructure(
                designationId,
                row.wageStructureId,
                payload,
                heads,
              ),
        )
      }
      return saved
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.designation.all })
    },
  })
}
