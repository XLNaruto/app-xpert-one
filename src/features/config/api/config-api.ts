import { z } from 'zod'
import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'

/** Shape of `GET /config` — client-safe settings only. */
const configResponseSchema = z.object({
  media_path: z.string(),
})

export interface AppConfig {
  /** Origin used to build media/asset URLs from API-returned storage paths. */
  mediaBaseUrl: string
}

/**
 * GET /config — client-facing application config. Public (no bearer), so it can
 * be read before a company is selected; the API answers a trailing-slashed
 * origin (`https://cdn.dev.xpertoneindia.com/`) which `mediaUrl()` normalises.
 */
export async function fetchAppConfig(): Promise<AppConfig> {
  try {
    const raw = await http.get<unknown>(endpoints.CONFIG.GET)
    const { media_path } = configResponseSchema.parse(raw)
    return { mediaBaseUrl: media_path }
  } catch (error) {
    throw toApiError(error, 'Failed to load application config.')
  }
}
