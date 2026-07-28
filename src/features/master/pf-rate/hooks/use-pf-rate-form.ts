import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { pfRateSchema, type PfRateFormValues } from '../schemas'
import { EMPTY_PF_RATE_FORM } from '../constants'
import { usePfRate } from '../api/use-pf-rate'
import { usePfRates } from '../api/use-pf-rates'
import { useCreatePfRate, useUpdatePfRate } from '../api/use-pf-rate-mutations'
import {
  pfRateToFormValues,
  totalEmployerContribution,
} from '../lib/pf-rate-mappers'

/**
 * Owns the PF rate form for both create and edit, plus the history rows shown
 * under it. In edit mode (`id` set) it loads the slab, seeds the form and saves
 * via PUT; create mode POSTs a fresh slab. The page only lays out fields.
 */
export function usePfRateForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = usePfRate(id ?? Number.NaN)
  const history = usePfRates()
  const createPfRate = useCreatePfRate()
  const updatePfRate = useUpdatePfRate(id ?? Number.NaN)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PfRateFormValues>({
    resolver: zodResolver(pfRateSchema),
    defaultValues: EMPTY_PF_RATE_FORM,
  })

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) reset(pfRateToFormValues(detail.data))
  }, [detail.data, reset])

  // Deduction is the employer's total contribution — kept in step with the two
  // employer shares rather than keyed in, which is why its input is disabled.
  const employerPf = useWatch({ control, name: 'employerPfContribution' })
  const employerFpf = useWatch({ control, name: 'employerFpfContribution' })

  useEffect(() => {
    setValue('deduction', totalEmployerContribution(employerPf, employerFpf))
  }, [employerPf, employerFpf, setValue])

  const goToList = () => navigate({ to: '/master/pf-rate' })

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit ? updatePfRate : createPfRate
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(isEdit ? 'PF rate updated' : 'PF rate created')
        goToList()
      },
      onError: (err) =>
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to ${isEdit ? 'update' : 'create'} PF rate`,
        ),
    })
  })

  return {
    register,
    control,
    errors,
    onSubmit,
    isEdit,
    isPending: isEdit ? updatePfRate.isPending : createPfRate.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && (detail.isError || (!detail.isLoading && !detail.data)),
    loadError: detail.error,
    goToList,
    /** Previously saved slabs, rendered as the history table under the form. */
    historyRows: history.data ?? [],
    isHistoryLoading: history.isLoading,
  }
}
