import { z } from 'zod'

/** One company (tenant) entry. `code` is tolerated if the server sends it. */
export const myCompanySchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string().nullish(),
})

/**
 * Response shape shared by `GET /me/companies` and `POST /me/company/select`.
 * Validated then mapped to the camelCase `MyCompaniesState` client shape.
 */
export const myCompaniesResponseSchema = z.object({
  companies: z.array(myCompanySchema),
  selected_company_id: z.number().nullable(),
  requires_selection: z.boolean(),
})

export type MyCompaniesResponse = z.infer<typeof myCompaniesResponseSchema>
