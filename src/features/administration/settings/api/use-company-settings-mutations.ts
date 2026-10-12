import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { CompanySettingsPayload } from '../schemas'
import { updateCompanySettings } from './company-settings-api'

/**
 * PATCH /user/company-settings. The answer is the saved row, so it's written
 * straight into the cache. My Tasks reads the same modes from its own endpoint,
 * so that read is refreshed too — the board's buttons follow the switch.
 */
export function useUpdateCompanySettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CompanySettingsPayload) => updateCompanySettings(payload),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.companySettings.detail(settings.companyId), settings)
      void queryClient.invalidateQueries({ queryKey: queryKeys.officeTask.myTaskSettings() })
    },
  })
}
