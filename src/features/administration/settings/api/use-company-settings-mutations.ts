import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { CompanySettingsPayload } from '../schemas'
import { updateCompanySettings, withdrawSettingChange } from './company-settings-api'

/**
 * PATCH /user/company-settings. The answer is the settings after the booking,
 * so it's written straight into the cache; the history gains a row. Nothing is
 * in force yet, so My Tasks' own read is left alone.
 */
export function useUpdateCompanySettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CompanySettingsPayload) => updateCompanySettings(payload),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.companySettings.detail(settings.companyId), settings)
      void queryClient.invalidateQueries({ queryKey: queryKeys.companySettings.changesAll() })
    },
  })
}

/**
 * DELETE /user/company-settings/changes/:id. Refreshes the settings (the notice
 * goes) and the history (the row turns CANCELLED). Also on failure — a 409 means
 * what's on screen is stale.
 */
export function useWithdrawSettingChange() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => withdrawSettingChange(id),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.companySettings.all }),
  })
}
