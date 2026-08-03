import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { useStates } from '@/features/master/state'
import { lwfRateSchema, type LwfRateFormValues } from '../schemas'
import { EMPTY_LWF_RATE_FORM } from '../constants'
import { useLwfRate } from '../api/use-lwf-rate'
import { useCreateLwfRate, useUpdateLwfRate } from '../api/use-lwf-rate-mutations'
import { lwfRateToFormValues } from '../lib/lwf-rate-mappers'

/**
 * Owns the LWF rate form for both create and edit. In edit mode (`id` set) it
 * loads the rate, seeds the form and saves via PATCH; create mode POSTs a fresh
 * rate. The page only lays out fields.
 */
export function useLwfRateForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = useLwfRate(id ?? Number.NaN)
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

  // Reading this rate was refused — not a broken screen, so the page shows the
  // 403 screen with the server's reason rather than the form.
  const isForbidden = isEdit && isForbiddenError(detail.error)

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
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(detail.error) : undefined,
    goToList,
    stateOptions,
    isStatesLoading,
  }
}
