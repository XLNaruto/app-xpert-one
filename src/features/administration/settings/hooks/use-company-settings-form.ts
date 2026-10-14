import { useEffect, useRef } from 'react'
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
  companySettingsSeedKey,
  companySettingsToFormValues,
  companySettingsToPayload,
} from '../lib/company-settings-mappers'
import { formatIst, fromIstFields, isBeforeMinute, toIstFields } from '../lib/ist'

const EMPTY_FORM: CompanySettingsFormValues = {
  sopTaskSubmission: DEFAULT_TASK_SUBMISSION_MODE,
  projectTaskSubmission: DEFAULT_TASK_SUBMISSION_MODE,
  effectiveDate: '',
  effectiveTime: '',
}

/** "Too early" wording — the same sentence the server would answer with. */
function tooEarlyMessage(earliest: string) {
  return `Settings changes take effect at least 7 days ahead. Choose ${formatIst(earliest)} or later.`
}

/**
 * Administration → Settings: the active company's switches. A save BOOKS the
 * changed modes for an effective date/time — nothing changes right away — and
 * travels as a partial PATCH of only the modes that differ from the ones in
 * force. The company is the session's active one, so switching company re-reads
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

  const data = settings.data
  const earliest = data?.earliestEffectiveFrom

  // Seed from the server, and re-seed when the company, the modes in force or
  // the bookings change (a save, a withdrawal, a booking applied). The minute
  // refresh moving `earliest` alone must not wipe what the user has picked.
  const seedKey = data ? companySettingsSeedKey(data) : null
  const seededKey = useRef<string | null>(null)
  useEffect(() => {
    if (!data || seedKey === seededKey.current) return
    seededKey.current = seedKey
    form.reset(companySettingsToFormValues(data))
  }, [data, seedKey, form])

  // Read during render so react-hook-form tracks it.
  const { dirtyFields } = form.formState
  const pickedOwnTime = !!(dirtyFields.effectiveDate || dirtyFields.effectiveTime)

  // Until the user picks a time of their own, the default keeps following the
  // minimum as it moves forward.
  useEffect(() => {
    if (!earliest || pickedOwnTime) return
    const { date, time } = toIstFields(earliest)
    form.resetField('effectiveDate', { defaultValue: date })
    form.resetField('effectiveTime', { defaultValue: time })
  }, [earliest, pickedOwnTime, form])

  const values = useWatch({ control: form.control })
  const isDirty =
    !!data &&
    (values.sopTaskSubmission !== data.sopTaskSubmission ||
      values.projectTaskSubmission !== data.projectTaskSubmission)

  const effectiveFrom =
    values.effectiveDate && values.effectiveTime
      ? fromIstFields(values.effectiveDate, values.effectiveTime)
      : null
  // Checked live so the field says why before Save is pressed. An untouched
  // default IS the minimum — it's re-seeded in an effect after `earliest` moves,
  // so checking it would flash the error for that one render.
  const effectiveError =
    form.formState.errors.effectiveDate?.message ??
    form.formState.errors.effectiveTime?.message ??
    (pickedOwnTime && effectiveFrom && earliest && isBeforeMinute(effectiveFrom, earliest)
      ? tooEarlyMessage(earliest)
      : undefined)

  const onSubmit = form.handleSubmit(async (next) => {
    if (companyId === null || !data) return
    // The minimum moves with the clock — re-read it before validating against it.
    const fresh = (await settings.refetch()).data ?? data
    const picked = pickedOwnTime
      ? fromIstFields(next.effectiveDate, next.effectiveTime)
      : // Never touched: it's "as soon as allowed", i.e. the fresh minimum.
        fresh.earliestEffectiveFrom
    if (isBeforeMinute(picked, fresh.earliestEffectiveFrom)) {
      toast.error(tooEarlyMessage(fresh.earliestEffectiveFrom))
      return
    }
    const payload = companySettingsToPayload(companyId, picked, next, fresh)
    if (!payload) return
    save.mutate(payload, {
      onSuccess: () => toast.success(`Settings will change on ${formatIst(picked)}.`),
      // The server's 400s are already worded (and dated in IST) — show them as-is.
      onError: (error) =>
        toast.error(getApiErrorMessage(error, "Couldn't schedule the change.")),
    })
  })

  const isForbidden = isForbiddenError(settings.error)

  return {
    companyId,
    form,
    canUpdate,
    settings: data,
    /** The picker's floor, shown in IST. */
    earliestEffectiveFrom: earliest,
    effectiveError,
    isLoading: settings.isLoading,
    isError: settings.isError && !isForbidden,
    error: settings.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(settings.error) : undefined,
    isDirty,
    discard: () => {
      if (data) form.reset(companySettingsToFormValues(data))
    },
    onSubmit,
    isSaving: save.isPending || (settings.isFetching && form.formState.isSubmitting),
  }
}
