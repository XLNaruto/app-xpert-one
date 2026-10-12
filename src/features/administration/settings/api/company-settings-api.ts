import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import type { PageParams, Paginated } from '@/lib/pagination'
import { SETTING_CHANGES_MAX_LIMIT } from '../constants'
import {
  companySettingsResponseSchema,
  settingChangesResponseSchema,
  type CompanySettingsPayload,
} from '../schemas'
import {
  toCompanySettings,
  toSettingChangeHistoryItem,
} from '../lib/company-settings-mappers'
import type { CompanySettings, SettingChangeFilters, SettingChangeHistoryItem } from '../types'

/**
 * `/user/company-settings` — the company's behaviour switches. Guarded by
 * `settings:read` (reads) and `settings:update` (PATCH, withdraw).
 *
 * A save no longer applies right away: it BOOKS the change for an effective
 * date at least 7 days ahead, and every booking is kept as history. The server
 * applies a booking when its time arrives.
 */

/** GET /user/company-settings?company_id= — the modes in force, bookings and the picker minimum. */
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

/** PATCH /user/company-settings — books the changed keys; answers the settings after it. */
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
    throw toApiError(error, "Couldn't schedule the change.")
  }
}

/**
 * GET /user/company-settings/changes — one page of the history, newest
 * `effective_from` first (the endpoint's fixed order; it takes no sort or
 * search). A negative limit asks for the most one page serves.
 */
export async function fetchSettingChanges(
  companyId: number,
  params: PageParams,
  filters: SettingChangeFilters = {},
): Promise<Paginated<SettingChangeHistoryItem>> {
  try {
    const raw = await http.get<unknown>(endpoints.COMPANY_SETTING_CHANGES.LIST, {
      params: {
        company_id: companyId,
        limit:
          params.limit > 0
            ? Math.min(params.limit, SETTING_CHANGES_MAX_LIMIT)
            : SETTING_CHANGES_MAX_LIMIT,
        offset: params.offset,
        ...(filters.settingKey ? { setting_key: filters.settingKey } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
    })
    const { items, total } = settingChangesResponseSchema.parse(raw)
    return { items: items.map(toSettingChangeHistoryItem), total }
  } catch (error) {
    throw toApiError(error, "Couldn't load the settings history.")
  }
}

/**
 * DELETE /user/company-settings/changes/:id — withdraws a booking. The row stays
 * in the history as CANCELLED. Answers 409 once it's in effect or already withdrawn.
 */
export async function withdrawSettingChange(id: number): Promise<string> {
  try {
    const raw = await http.delete<{ message?: string }>(
      endpoints.COMPANY_SETTING_CHANGES.DELETE(id),
    )
    return raw?.message ?? 'Scheduled change withdrawn.'
  } catch (error) {
    throw toApiError(error, "Couldn't withdraw the change.")
  }
}
