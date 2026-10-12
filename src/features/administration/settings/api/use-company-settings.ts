import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { isForbiddenError } from '@/lib/api-error'
import { fetchCompanySettings } from './company-settings-api'

/**
 * GET /user/company-settings — one company's switches. Disabled until a company
 * is picked; the company rides in the key, so switching it reads the other row.
 */
export function useCompanySettings(companyId: number | null) {
  return useQuery({
    queryKey: queryKeys.companySettings.detail(companyId ?? 0),
    queryFn: () => fetchCompanySettings(companyId as number),
    enabled: companyId !== null,
    // A 403 is the server's final answer — retrying only delays the screen.
    retry: (failureCount, error) => !isForbiddenError(error) && failureCount < 1,
  })
}
