import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { companySettingsResponseSchema, type CompanySettingsPayload } from '../schemas'
import { toCompanySettings } from '../lib/company-settings-mappers'
import type { CompanySettings } from '../types'

/**
 * `/user/company-settings` — the company's behaviour switches. Guarded by
 * `settings:read` (GET) and `settings:update` (PATCH).
 *
 * A save takes effect on the NEXT action, on the panel, the employee app and
 * offline sync alike — no task is changed by it.
 */

/** GET /user/company-settings?company_id= — the company's full settings. */
export async function fetchCompanySettings(companyId: number): Promise<CompanySettings> {
  try {
    const raw = await http.get<unknown>(endpoints.COMPANY_SETTINGS, {
      params: { company_id: companyId },
    })
    return toCompanySettings(companySettingsResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the settings.")
  }
}

/** PATCH /user/company-settings — a partial save; answers the full settings after it. */
export async function updateCompanySettings(
  payload: CompanySettingsPayload,
): Promise<CompanySettings> {
  try {
    const raw = await http.patch<unknown, CompanySettingsPayload>(
      endpoints.COMPANY_SETTINGS,
      payload,
    )
    return toCompanySettings(companySettingsResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't save the settings.")
  }
}
