import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { DEFAULT_TASK_SUBMISSION_MODE } from '@/features/office-task/common'
import { useCompanySettings } from '../api/use-company-settings'
import { useUpdateCompanySettings } from '../api/use-company-settings-mutations'
import {
  companySettingsFormSchema,
  type CompanySettingsFormValues,
} from '../schemas'
import {
  companySettingsToFormValues,
  companySettingsToPayload,
} from '../lib/company-settings-mappers'

const EMPTY_FORM: CompanySettingsFormValues = {
  sopTaskSubmission: DEFAULT_TASK_SUBMISSION_MODE,
  projectTaskSubmission: DEFAULT_TASK_SUBMISSION_MODE,
}

/**
 * Administration → Settings: the active company's switches, saved as a partial
 * PATCH of only what moved. The company is the session's active one — the same
 * picker the IP Access Control screen follows — so switching company re-reads
 * the form for that company.
 */
export function useCompanySettingsForm() {
  const companyId = useAuthStore((s) => s.user?.companyId ?? null)
  const settings = useCompanySettings(companyId)
  const save = useUpdateCompanySettings()
  // `settings:update` is what Save hangs off; reading is the route's gate.
  const { canUpdate } = useResourceAccess(PERMISSIONS.settings)

  const form = useForm<CompanySettingsFormValues>({
    resolver: zodResolver(companySettingsFormSchema),
    defaultValues: EMPTY_FORM,
  })

  // Seed from the server, and re-seed after each save or company switch.
  useEffect(() => {
    if (settings.data) form.reset(companySettingsToFormValues(settings.data))
  }, [settings.data, form])

  const values = useWatch({ control: form.control })
  const initial = settings.data ? companySettingsToFormValues(settings.data) : EMPTY_FORM
  const isDirty =
    !!settings.data &&
    (values.sopTaskSubmission !== initial.sopTaskSubmission ||
      values.projectTaskSubmission !== initial.projectTaskSubmission)

  const onSubmit = form.handleSubmit((next) => {
    if (companyId === null || !settings.data) return
    const payload = companySettingsToPayload(companyId, next, initial)
    if (!payload) return
    save.mutate(payload, {
      onSuccess: () => toast.success('Settings saved'),
      onError: (error) => toast.error(getApiErrorMessage(error, "Couldn't save the settings.")),
    })
  })

  const isForbidden = isForbiddenError(settings.error)

  return {
    companyId,
    form,
    canUpdate,
    isLoading: settings.isLoading,
    isError: settings.isError && !isForbidden,
    error: settings.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(settings.error) : undefined,
    isDirty,
    discard: () => form.reset(initial),
    onSubmit,
    isSaving: save.isPending,
  }
}
