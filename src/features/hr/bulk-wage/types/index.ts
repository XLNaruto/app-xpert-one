import type { DesignationWageStructure } from '@/features/master/designation'

/**
 * One row of the bulk wage grid as it's read back: a designation of the company,
 * and the version of its wage structure **in force** — the latest effective
 * month, with the allowance / deduction heads that version was saved with.
 *
 * `wageStructure` is `null` on a designation that has never been configured. The
 * grid still shows it, as a blank row waiting to be filled in — that's the point
 * of the screen.
 */
export interface BulkWageDesignation {
  /** The designation's own id — `designation_id` in the save body. */
  id: number
  designationName: string
  wageStructure: DesignationWageStructure | null
}

/**
 * One designation on the history screen: the same row of the grid, opened out
 * into **every** version it has ever been paid on rather than only the one in
 * force — newest effective month first, as the API orders them.
 *
 * `versions` is empty on a designation that has never been configured. It still
 * appears: "this title has no wage structure at all" is part of what the history
 * is read for.
 */
export interface BulkWageHistoryDesignation {
  id: number
  designationName: string
  versions: DesignationWageStructure[]
}
