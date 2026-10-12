import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { isForbiddenError } from '@/lib/api-error'
import { COMPANY_SETTINGS_REFRESH_MS } from '../constants'
import { fetchCompanySettings } from './company-settings-api'

/**
 * GET /user/company-settings — one company's switches. Disabled until a company
 * is picked; the company rides in the key, so switching it reads the other row.
 *
 * Always re-read on open and once a minute while open: `earliest_effective_from`
 * moves forward with the clock, and the picker's minimum must follow it.
 */
export function useCompanySettings(companyId: number | null) {
  return useQuery({
    queryKey: queryKeys.companySettings.detail(companyId ?? 0),
    queryFn: () => fetchCompanySettings(companyId as number),
    enabled: companyId !== null,
    refetchOnMount: 'always',
    refetchInterval: COMPANY_SETTINGS_REFRESH_MS,
    // A 403 is the server's final answer — retrying only delays the screen.
    retry: (failureCount, error) => !isForbiddenError(error) && failureCount < 1,
  })
}
