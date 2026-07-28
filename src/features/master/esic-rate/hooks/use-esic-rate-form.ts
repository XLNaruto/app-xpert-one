import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { esicRateSchema, type EsicRateFormValues } from '../schemas'
import { EMPTY_ESIC_RATE_FORM } from '../constants'
import { useEsicRate } from '../api/use-esic-rate'
import { useEsicRates } from '../api/use-esic-rates'
import { useCreateEsicRate, useUpdateEsicRate } from '../api/use-esic-rate-mutations'
import { esicRateToFormValues } from '../lib/esic-rate-mappers'

/**
 * Owns the ESIC rate form for both create and edit, plus the history rows shown
 * under it. In edit mode (`id` set) it loads the slab, seeds the form and saves
 * via PUT; create mode POSTs a fresh slab. The page only lays out fields.
 */
export function useEsicRateForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = useEsicRate(id ?? Number.NaN)
  const history = useEsicRates()
  const createEsicRate = useCreateEsicRate()
  const updateEsicRate = useUpdateEsicRate(id ?? Number.NaN)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EsicRateFormValues>({
    resolver: zodResolver(esicRateSchema),
    defaultValues: EMPTY_ESIC_RATE_FORM,
  })

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) reset(esicRateToFormValues(detail.data))
  }, [detail.data, reset])

  const goToList = () => navigate({ to: '/master/esic-rate' })

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit ? updateEsicRate : createEsicRate
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(isEdit ? 'ESIC rate updated' : 'ESIC rate created')
        goToList()
      },
      onError: (err) =>
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to ${isEdit ? 'update' : 'create'} ESIC rate`,
        ),
    })
  })

  return {
    register,
    control,
    errors,
    onSubmit,
    isEdit,
    isPending: isEdit ? updateEsicRate.isPending : createEsicRate.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && (detail.isError || (!detail.isLoading && !detail.data)),
    loadError: detail.error,
    goToList,
    /** Previously saved slabs, rendered as the history table under the form. */
    historyRows: history.data ?? [],
    isHistoryLoading: history.isLoading,
  }
}
