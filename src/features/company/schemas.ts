import { z } from 'zod'

/**
 * One company (tenant) the caller belongs to — the shape returned by both
 * `GET /user/my/companies` (inside `items`) and `POST /user/auth/select-company`.
 */
export const myCompanySchema = z.object({
  id: z.number(),
  company_name: z.string(),
  company_code: z.string(),
  /** Logo storage path — resolve for rendering with `lib/media.mediaUrl`. */
  logo: z.string().nullish(),
})

/** `GET /user/my/companies` — the caller's tenants. */
export const myCompaniesResponseSchema = z.object({
  items: z.array(myCompanySchema),
})

/** `POST /user/auth/select-company` — the company now active on the session. */
export const selectCompanyResponseSchema = myCompanySchema

export type MyCompanyResponse = z.infer<typeof myCompanySchema>
export type MyCompaniesResponse = z.infer<typeof myCompaniesResponseSchema>
