import { useEffect, useMemo } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useStates } from '@/features/master/state'
import { ptRateSchema, type PtRateFormValues } from '../schemas'
import { EMPTY_PT_RATE_FORM, EMPTY_PT_SLAB } from '../constants'
import { usePtRate } from '../api/use-pt-rate'
import { usePtRates } from '../api/use-pt-rates'
import { useCreatePtRate, useUpdatePtRate } from '../api/use-pt-rate-mutations'
import { ptRateToFormValues, toSlabRows } from '../lib/pt-rate-mappers'

/**
 * Owns the PT rate form for both create and edit, its repeatable slab rows and
 * the state's rate history shown under it. In edit mode (`id` set) it loads the
 * rate, seeds the form and saves via PUT; create mode POSTs a fresh rate. The
 * page only lays out fields.
 */
export function usePtRateForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = usePtRate(id ?? Number.NaN)
  const history = usePtRates()
  const { data: states, isLoading: isStatesLoading } = useStates()
  const createPtRate = useCreatePtRate()
  const updatePtRate = useUpdatePtRate(id ?? Number.NaN)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PtRateFormValues>({
    resolver: zodResolver(ptRateSchema),
    defaultValues: EMPTY_PT_RATE_FORM,
  })

  const slabs = useFieldArray({ control, name: 'slabs' })

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) reset(ptRateToFormValues(detail.data))
  }, [detail.data, reset])

  // The State dropdown is fed by the state master, not a hard-coded list.
  const stateOptions = useMemo(
    () => (states ?? []).map((s) => ({ label: s.stateName, value: String(s.id) })),
    [states],
  )

  // PT is state-specific, so the history under the form only makes sense once a
  // state is chosen — and then only for that state, minus the rate being edited.
  const selectedStateId = useWatch({ control, name: 'stateId' })
  const historyRows = useMemo(() => {
    if (!selectedStateId) return []
    const forState = (history.data ?? []).filter(
      (rate) => rate.stateId === Number(selectedStateId) && rate.id !== id,
    )
    return toSlabRows(forState)
  }, [history.data, selectedStateId, id])

  const selectedStateName = useMemo(
    () => stateOptions.find((option) => option.value === selectedStateId)?.label,
    [stateOptions, selectedStateId],
  )

  const goToList = () => navigate({ to: '/master/pt-rate' })

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit ? updatePtRate : createPtRate
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(isEdit ? 'PT rate updated' : 'PT rate created')
        goToList()
      },
      onError: (err) =>
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to ${isEdit ? 'update' : 'create'} PT rate`,
        ),
    })
  })

  return {
    register,
    control,
    errors,
    onSubmit,
    isEdit,
    isPending: isEdit ? updatePtRate.isPending : createPtRate.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && (detail.isError || (!detail.isLoading && !detail.data)),
    loadError: detail.error,
    goToList,
    stateOptions,
    isStatesLoading,
    /** Repeatable slab rows — at least one always stays on the form. */
    slabFields: slabs.fields,
    addSlab: () => slabs.append(EMPTY_PT_SLAB),
    removeSlab: (index: number) => {
      if (slabs.fields.length > 1) slabs.remove(index)
    },
    /** Superseded slabs for the selected state, shown as history under the form. */
    historyRows,
    isHistoryLoading: history.isLoading,
    selectedStateName,
  }
}
