import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useStates } from '@/features/master/state'
import { lwfRateSchema, type LwfRateFormValues } from '../schemas'
import { EMPTY_LWF_RATE_FORM } from '../constants'
import { useLwfRate } from '../api/use-lwf-rate'
import { useLwfRates } from '../api/use-lwf-rates'
import { useCreateLwfRate, useUpdateLwfRate } from '../api/use-lwf-rate-mutations'
import { lwfRateToFormValues, sortByEffectiveDateDesc } from '../lib/lwf-rate-mappers'

/**
 * Owns the LWF rate form for both create and edit, plus the selected state's
 * rate history shown under it. In edit mode (`id` set) it loads the rate, seeds
 * the form and saves via PUT; create mode POSTs a fresh rate. The page only
 * lays out fields.
 */
export function useLwfRateForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = useLwfRate(id ?? Number.NaN)
  const history = useLwfRates()
  const { data: states, isLoading: isStatesLoading } = useStates()
  const createLwfRate = useCreateLwfRate()
  const updateLwfRate = useUpdateLwfRate(id ?? Number.NaN)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LwfRateFormValues>({
    resolver: zodResolver(lwfRateSchema),
    defaultValues: EMPTY_LWF_RATE_FORM,
  })

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) reset(lwfRateToFormValues(detail.data))
  }, [detail.data, reset])

  // The State dropdown is fed by the state master, not a hard-coded list.
  const stateOptions = useMemo(
    () => (states ?? []).map((s) => ({ label: s.stateName, value: String(s.id) })),
    [states],
  )

  // LWF is state-specific, so the history under the form only makes sense once
  // a state is chosen — and then only for that state, minus the rate being
  // edited (it's on the form above, not history).
  const selectedStateId = useWatch({ control, name: 'stateId' })
  const historyRows = useMemo(() => {
    if (!selectedStateId) return []
    const forState = (history.data ?? []).filter(
      (rate) => rate.stateId === Number(selectedStateId) && rate.id !== id,
    )
    return sortByEffectiveDateDesc(forState)
  }, [history.data, selectedStateId, id])

  const selectedStateName = useMemo(
    () => stateOptions.find((option) => option.value === selectedStateId)?.label,
    [stateOptions, selectedStateId],
  )

  const goToList = () => navigate({ to: '/master/lwf-rate' })

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit ? updateLwfRate : createLwfRate
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(isEdit ? 'LWF rate updated' : 'LWF rate created')
        goToList()
      },
      onError: (err) =>
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to ${isEdit ? 'update' : 'create'} LWF rate`,
        ),
    })
  })

  return {
    register,
    control,
    errors,
    onSubmit,
    isEdit,
    isPending: isEdit ? updateLwfRate.isPending : createLwfRate.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && (detail.isError || (!detail.isLoading && !detail.data)),
    loadError: detail.error,
    goToList,
    stateOptions,
    isStatesLoading,
    /** Superseded rates for the selected state, shown as history under the form. */
    historyRows,
    isHistoryLoading: history.isLoading,
    selectedStateName,
  }
}
