import { useEffect } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { weekoffPolicySchema, type WeekoffPolicyFormValues } from '../schemas'
import { EMPTY_WEEKOFF_POLICY_FORM, WEEKOFF_PRESETS } from '../constants'
import { useWeekoffPolicy } from '../api/use-weekoff-policies'
import {
  useCreateWeekoffPolicy,
  useUpdateWeekoffPolicy,
} from '../api/use-weekoff-policy-mutations'
import {
  weekoffPolicyToFormValues,
  weekoffSummary,
} from '../lib/weekoff-policy-mappers'
import type { WeekoffDay } from '../types'

/**
 * Owns the week-off policy form for both create and edit.
 *
 * **The whole pattern is one field.** The API replaces every rule when `days` is
 * sent, so the editor holds the complete rule set rather than a diff — there is no
 * per-rule save and nothing to reconcile.
 *
 * **Two halves, one array.** The ticks capture "off every week" and the rows
 * capture the occurrence-specific rules; `weekoffPolicyToPayload` folds them into
 * the API's single `days` list. Keeping them apart on screen is what makes
 * alternate Saturdays and working-day exceptions comprehensible.
 */
export function useWeekoffPolicyForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = useWeekoffPolicy(id ?? Number.NaN)
  const createPolicy = useCreateWeekoffPolicy()
  const updatePolicy = useUpdateWeekoffPolicy(id ?? Number.NaN)

  const form = useForm<WeekoffPolicyFormValues>({
    resolver: zodResolver(weekoffPolicySchema),
    defaultValues: EMPTY_WEEKOFF_POLICY_FORM,
  })
  const { control, setValue, reset, handleSubmit } = form

  const rules = useFieldArray({ control, name: 'rules' })

  const everyWeekDays = useWatch({ control, name: 'everyWeekDays' }) ?? []
  const watchedRules = useWatch({ control, name: 'rules' }) ?? []

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) reset(weekoffPolicyToFormValues(detail.data))
  }, [detail.data, reset])

  /** Tick / untick one weekday's "off every week" rule. */
  const toggleWeekDay = (weekDay: number) => {
    const next = everyWeekDays.includes(weekDay)
      ? everyWeekDays.filter((day) => day !== weekDay)
      : [...everyWeekDays, weekDay].sort((a, b) => a - b)
    setValue('everyWeekDays', next, { shouldValidate: true })
  }

  const addRule = () =>
    rules.append({ weekDay: '6', weekNumber: '2', isOff: true })

  /**
   * Drop a preset in wholesale. A preset replaces the current selection rather
   * than merging with it — merging two of them would produce a pattern nobody
   * asked for, and the name is left alone since that's the user's own.
   */
  const applyPreset = (index: number) => {
    const preset = WEEKOFF_PRESETS[index]
    if (!preset) return
    setValue('everyWeekDays', preset.apply.everyWeekDays, { shouldValidate: true })
    rules.replace(preset.apply.rules)
  }

  /**
   * The pattern as the list screen will read it — shown live under the editor, so
   * the consequence of thirty ticks and rows is legible before saving.
   */
  const summary = weekoffSummary([
    ...everyWeekDays.map(
      (weekDay, index): WeekoffDay => ({
        id: -index - 1,
        weekDay,
        weekNumber: null,
        isOff: true,
      }),
    ),
    ...watchedRules.map(
      (rule, index): WeekoffDay => ({
        id: -1000 - index,
        weekDay: Number(rule.weekDay),
        weekNumber: rule.weekNumber ? Number(rule.weekNumber) : null,
        isOff: rule.isOff,
      }),
    ),
  ])

  const goToList = () => navigate({ to: '/master/weekoff-policy' })

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit ? updatePolicy : createPolicy
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(isEdit ? 'Week-off policy updated' : 'Week-off policy created')
        goToList()
      },
      onError: (err) =>
        toast.error(getApiErrorMessage(err, "Couldn't save the week-off policy.")),
    })
  })

  return {
    form,
    errors: form.formState.errors,
    onSubmit,
    isEdit,
    everyWeekDays,
    toggleWeekDay,
    rules,
    addRule,
    applyPreset,
    summary,
    isPending: isEdit ? updatePolicy.isPending : createPolicy.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && (detail.isError || (!detail.isLoading && !detail.data)),
    loadError: detail.error,
    goToList,
  }
}
