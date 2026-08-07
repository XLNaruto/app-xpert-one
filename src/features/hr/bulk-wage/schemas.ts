import { z } from 'zod'
import {
  salaryComponentResponseSchema,
  wageStructureResponseSchema,
  wageStructureRowBaseSchema,
  type WageStructurePayload,
} from '@/features/master/designation'

/* ── The form ───────────────────────────────────────────────────────────── */

/**
 * One designation's row on the bulk grid — the wage structure's own fields, less
 * the two the designation's history owns:
 *
 * - `wageStructureId` — nothing is patched by id here. The API versions each row
 *   itself off the screen's month: already effective from it → updated, any
 *   other month → a new version with the earlier ones kept as history.
 * - `effectiveFrom` — one month for the whole screen, held on the form rather
 *   than on each row.
 *
 * What it adds is the designation the row configures, and enough of its record
 * to label the row without a second lookup.
 *
 * No cross-field refinement: every designation of the company is on this grid,
 * configured or not, so a blank row is a legitimate resting state — only the
 * rows actually being saved are held to `missingWageField`, at submit time.
 */
export const bulkWageRowSchema = wageStructureRowBaseSchema
  .omit({ wageStructureId: true, effectiveFrom: true })
  .extend({
    designationId: z.number(),
    designationName: z.string(),
    /**
     * Month the version in force takes effect from, as `yyyy-MM` — shown beside
     * the designation so the row says what it's about to supersede. `''` on a
     * designation that has never been configured.
     */
    inForceFrom: z.string(),
  })

/**
 * The whole screen: the month every row takes effect from, and a row per
 * designation. The month is demanded — it's the one thing the save can't infer —
 * and the rows carry no required field of their own.
 */
export const bulkWageFormSchema = z.object({
  effectiveFrom: z
    .string()
    .trim()
    .min(1, 'Pick the month these wages take effect from'),
  rows: z.array(bulkWageRowSchema),
})

export type BulkWageFormValues = z.infer<typeof bulkWageFormSchema>
export type BulkWageRow = BulkWageFormValues['rows'][number]

/* ── API shapes ─────────────────────────────────────────────────────────── */

/**
 * `GET /user/designations/wage-structures` — every designation of the company
 * with the version of its structure in force. Unpaginated by design: the grid is
 * read and saved as a whole, so `total` is only ever the row count.
 *
 * Note the shape: `salary_components` sits *beside* `wage_structure` rather than
 * inside it, unlike every other read of a wage structure. The mapper puts the
 * two back together so the shared `toWageStructure` can take it from there.
 */
export const bulkWageGridResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.number(),
      company_id: z.number(),
      name: z.string(),
      created_at: z.string().optional(),
      wage_structure: wageStructureResponseSchema.nullable(),
      salary_components: z.array(salaryComponentResponseSchema),
    }),
  ),
  total: z.number(),
})

/**
 * `GET /user/designations/wage-structures/history` — the same set of
 * designations as the grid above, each carrying **every** version ever saved for
 * it rather than only the one in force, newest effective month first.
 *
 * Here the heads sit *inside* each version, the way every other read of a wage
 * structure carries them, so a history entry maps straight through the shared
 * `toWageStructure`. `limit`/`offset` page the designations, so a title's
 * versions are never split across two pages and `total` counts designations.
 */
export const bulkWageHistoryResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.number(),
      company_id: z.number(),
      name: z.string(),
      created_at: z.string().optional(),
      /** Empty on a designation that has never been given a wage structure. */
      history: z.array(wageStructureResponseSchema),
    }),
  ),
  total: z.number(),
})

/** One row of the save body — a wage structure's fields, against a designation. */
export interface BulkWageRowPayload extends WageStructurePayload {
  designation_id: number
}

/**
 * `POST /user/designations/bulk-update` — one effective month applied across
 * many designations in a single transaction: either every row lands or none
 * does. Sending one row is how a single row's Save works.
 */
export interface BulkWageUpdatePayload {
  company_id: number
  /** `YYYY-MM` — one value for the whole screen. */
  effective_from: string
  rows: BulkWageRowPayload[]
}
