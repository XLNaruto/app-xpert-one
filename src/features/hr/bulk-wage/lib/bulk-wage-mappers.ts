import {
  blankWageStructureRow,
  toWageStructure,
  wageRowToPayload,
  wageStructureToRow,
  type WageHeads,
} from '@/features/master/designation'
import type {
  BulkWageRow,
  BulkWageRowPayload,
  bulkWageGridResponseSchema,
  bulkWageHistoryResponseSchema,
} from '../schemas'
import type { BulkWageDesignation, BulkWageHistoryDesignation } from '../types'
import type { z } from 'zod'

type GridResponse = z.infer<typeof bulkWageGridResponseSchema>
type HistoryResponse = z.infer<typeof bulkWageHistoryResponseSchema>

/**
 * One item of the bulk grid read → the designation and its structure in force.
 *
 * The response splits a wage structure in two — the version's own columns under
 * `wage_structure`, its heads beside it under `salary_components` — where every
 * other read nests the heads inside. They're put back together here so the one
 * shared `toWageStructure` maps it, rather than this screen growing a second
 * mapper for the same thirty columns.
 */
export function toBulkWageDesignation(
  item: GridResponse['items'][number],
  heads: WageHeads,
): BulkWageDesignation {
  return {
    id: item.id,
    designationName: item.name,
    wageStructure: item.wage_structure
      ? toWageStructure(
          { ...item.wage_structure, salary_components: item.salary_components },
          item.id,
          heads,
        )
      : null,
  }
}

/**
 * One item of the history read → the designation and every version behind it.
 *
 * Unlike the grid above, a history entry carries its own heads nested inside it,
 * so each version goes straight through the shared `toWageStructure` — the same
 * mapper the designation master's own history uses, which is what makes the two
 * screens show a stored version identically.
 */
export function toBulkWageHistoryDesignation(
  item: HistoryResponse['items'][number],
  heads: WageHeads,
): BulkWageHistoryDesignation {
  return {
    id: item.id,
    designationName: item.name,
    versions: item.history.map((version) => toWageStructure(version, item.id, heads)),
  }
}

/**
 * A designation → its editable row on the grid.
 *
 * A configured designation opens on the version in force, so the grid reads as
 * "what is being paid today" and an edit is a change to it. One never configured
 * opens on a blank row — every head of the master present and nothing valued —
 * which is the same row the designation master would draft.
 *
 * The version's own month is dropped from the row and kept beside it as
 * `inForceFrom`: what the row saves as is the screen's month, not the month it
 * was read from.
 */
export function toBulkWageRow(
  designation: BulkWageDesignation,
  heads: WageHeads,
): BulkWageRow {
  const base = designation.wageStructure
    ? wageStructureToRow(designation.wageStructure)
    : blankWageStructureRow(heads)

  const { wageStructureId: _id, effectiveFrom: _from, ...fields } = base

  return {
    ...fields,
    designationId: designation.id,
    designationName: designation.designationName,
    inForceFrom: designation.wageStructure?.effectiveFrom ?? '',
  }
}

/**
 * One row → its entry in the save body. The screen's month is folded in so the
 * shared `wageRowToPayload` can do the work — every derivation (the wage the
 * salary type leaves implicit, an overtime rate left blank) and every "act is
 * off, so send its settings as null" rule is the designation master's, and this
 * screen writes the same columns through the same endpoint semantics.
 *
 * `effective_from` then comes straight back out: on this endpoint it's a body
 * field for the whole screen rather than a per-row one.
 */
export function bulkRowToPayload(
  row: BulkWageRow,
  effectiveFrom: string,
): BulkWageRowPayload {
  const { effective_from: _month, ...payload } = wageRowToPayload({
    ...row,
    effectiveFrom,
  })
  return { designation_id: row.designationId, ...payload }
}
