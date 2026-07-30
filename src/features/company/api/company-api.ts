import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { getApiErrorMessage } from '@/lib/api-error'
import { myCompaniesResponseSchema, selectCompanyResponseSchema } from '../schemas'
import { toMyCompany } from '../lib/company-mappers'
import type { MyCompany } from '../types'

/**
 * Session endpoints for the active company (tenant). The *list* is a plain read;
 * the *selection* is session state the server stores against the token, which is
 * why selecting only echoes back the chosen company — the caller's own
 * `company_id` is refreshed out of the database on the next token rotation (see
 * `useSelectCompany`).
 */

/**
 * GET /user/my/companies — the companies the signed-in user belongs to. Does not
 * report which one is active; that lives on the session (`AuthUser.companyId`).
 */
export async function fetchMyCompanies(): Promise<MyCompany[]> {
  try {
    const raw = await http.get<unknown>(endpoints.ME.COMPANIES)
    return myCompaniesResponseSchema.parse(raw).items.map(toMyCompany)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Couldn't load your companies."))
  }
}

/**
 * POST /user/auth/select-company — make `companyId` the active company for the
 * session, so every subsequent request is scoped to it. Returns the company that
 * is now active.
 */
export async function selectMyCompany(companyId: number): Promise<MyCompany> {
  try {
    const raw = await http.post<unknown, { company_id: number }>(
      endpoints.AUTH.SELECT_COMPANY,
      { company_id: companyId },
    )
    return toMyCompany(selectCompanyResponseSchema.parse(raw))
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Couldn't switch company."))
  }
}
