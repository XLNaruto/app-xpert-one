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
  flexibleWeekoffCaption,
  matchingPresetIndex,
  weekoffPolicyToFormValues,
  weekoffSummary,
} from '../lib/weekoff-policy-mappers'
import type { WeekoffDay, WeekoffOffType } from '../types'

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
 *
 * **A flexible policy has no rules at all.** It names a count — so many days off a
 * week, any days — and the weekday half is hidden rather than disabled, because a
 * named day would contradict the count and the API rejects the pair outright.
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

  const offType = useWatch({ control, name: 'offType' }) ?? 'FIXED'
  const weeklyOffDays = useWatch({ control, name: 'weeklyOffDays' }) ?? ''
  const everyWeekDays = useWatch({ control, name: 'everyWeekDays' }) ?? []
  const watchedRules = useWatch({ control, name: 'rules' }) ?? []

  /**
   * Switch between the two shapes. Moving to FLEXIBLE seeds one day a week — the
   * count is required, and an empty number input would read as an unanswered
   * question rather than a mode nobody has finished choosing.
   */
  const setOffType = (next: WeekoffOffType) => {
    setValue('offType', next, { shouldValidate: true })
    if (next === 'FLEXIBLE' && weeklyOffDays.trim() === '') {
      setValue('weeklyOffDays', '1', { shouldValidate: true })
    }
  }

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
   * The preset the current pattern already matches, so the chip can show it as
   * the one in force. Derived rather than remembered — editing a tick or a row
   * away from a preset drops the highlight on its own, and an edited policy
   * lights up the preset it happens to be.
   */
  const activePreset = matchingPresetIndex(everyWeekDays, watchedRules)

  /** The count as a number, or `null` while the input isn't one yet. */
  const flexibleCount = (() => {
    const count = Number(weeklyOffDays)
    return weeklyOffDays.trim() !== '' && Number.isInteger(count) && count >= 1 && count <= 6
      ? count
      : null
  })()

  /**
   * The pattern as the list screen will read it — shown live under the editor, so
   * the consequence of thirty ticks and rows is legible before saving. A flexible
   * pattern names no day, so it reads as its count instead of an empty list.
   */
  const summary =
    offType === 'FLEXIBLE'
      ? flexibleCount === null
        ? 'No rules'
        : flexibleWeekoffCaption(flexibleCount)
      : weekoffSummary([
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
    offType,
    setOffType,
    everyWeekDays,
    toggleWeekDay,
    rules,
    addRule,
    applyPreset,
    activePreset,
    summary,
    isPending: isEdit ? updatePolicy.isPending : createPolicy.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && (detail.isError || (!detail.isLoading && !detail.data)),
    loadError: detail.error,
    goToList,
  }
}
