import { mockDelay } from '@/lib/utils'
import { useCompanyStore } from '@/stores/company-store'
import { myCompaniesResponseSchema } from '../schemas'
import type { MyCompaniesResponse } from '../schemas'
import type { MyCompaniesState } from '../types'

/**
 * Active-company (tenant) selection API. There's no backend yet, so the wire
 * payloads below are produced in-memory and the selection is held for the
 * session. The snake_case → camelCase mapping and zod validation are already in
 * place, so when the API lands each function only swaps its body for the real
 * `http` call:
 *
 *   const raw = await http.get<unknown>(endpoints.ME.COMPANIES)
 *   return toMyCompaniesState(myCompaniesResponseSchema.parse(raw))
 */

/** Map the validated wire shape to the camelCase client shape. */
function toMyCompaniesState(raw: MyCompaniesResponse): MyCompaniesState {
  return {
    companies: raw.companies,
    selectedCompanyId: raw.selected_company_id,
    requiresSelection: raw.requires_selection,
  }
}

/** Mock tenants — ids/names mirror the company master mock records. */
const MOCK_COMPANIES = [
  { id: 1, name: 'XpertLab Technologies', code: 'XPL001' },
  { id: 2, name: 'Rajani Group', code: 'RJG002' },
]

/** Session-scoped active selection (the server owns this once the API lands). */
let selectedCompanyId: number | null = null

/**
 * The persisted mirror stands in for the server's session-stored selection, so
 * a refresh doesn't re-open the select-company gate. Only the mock reads the
 * store like this — with the real API, `selected_company_id` comes back from
 * `GET /me/companies` and this whole helper goes away.
 */
function storedSelection(): number | null {
  const id = useCompanyStore.getState().selectedCompanyId
  return id != null && MOCK_COMPANIES.some((c) => c.id === id) ? id : null
}

/** Build the wire payload the two endpoints share. */
function mockResponse(): MyCompaniesResponse {
  // A single-company user never chooses — the server resolves it for them.
  const resolved =
    selectedCompanyId ??
    storedSelection() ??
    (MOCK_COMPANIES.length === 1 ? MOCK_COMPANIES[0].id : null)
  return {
    companies: MOCK_COMPANIES,
    selected_company_id: resolved,
    requires_selection: resolved == null && MOCK_COMPANIES.length > 1,
  }
}

/**
 * GET /me/companies — the companies (tenants) the signed-in user belongs to,
 * plus the active selection. `selected_company_id` resolves automatically for
 * single-company users.
 */
export async function fetchMyCompanies(): Promise<MyCompaniesState> {
  const raw = await mockDelay<unknown>(mockResponse())
  return toMyCompaniesState(myCompaniesResponseSchema.parse(raw))
}

/**
 * POST /me/company/select — switch which company (tenant) the caller operates
 * as. The selection is stored against the session server-side, so subsequent
 * requests are scoped to it. Returns the updated tenant state.
 */
export async function selectMyCompany(companyId: number): Promise<MyCompaniesState> {
  if (!MOCK_COMPANIES.some((c) => c.id === companyId)) {
    throw new Error('Company not found')
  }
  selectedCompanyId = companyId
  const raw = await mockDelay<unknown>(mockResponse())
  return toMyCompaniesState(myCompaniesResponseSchema.parse(raw))
}
