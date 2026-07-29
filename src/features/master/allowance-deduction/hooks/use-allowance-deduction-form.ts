import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  allowanceDeductionSchema,
  type AllowanceDeductionFormValues,
} from '../schemas'
import { EMPTY_ALLOWANCE_DEDUCTION_FORM } from '../constants'
import { useAllowanceDeduction } from '../api/use-allowance-deduction'
import {
  useCreateAllowanceDeduction,
  useUpdateAllowanceDeduction,
} from '../api/use-allowance-deduction-mutations'
import { allowanceDeductionToFormValues } from '../lib/allowance-deduction-mappers'

/**
 * Owns the allowance / deduction form for both create and edit. In edit mode
 * (`id` set) it loads the record, seeds the form and saves via PUT; create mode
 * POSTs a fresh record. The page consumes this and only lays out fields.
 */
export function useAllowanceDeductionForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = useAllowanceDeduction(id ?? Number.NaN)
  const createRecord = useCreateAllowanceDeduction()
  const updateRecord = useUpdateAllowanceDeduction(id ?? Number.NaN)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AllowanceDeductionFormValues>({
    resolver: zodResolver(allowanceDeductionSchema),
    defaultValues: EMPTY_ALLOWANCE_DEDUCTION_FORM,
  })

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) reset(allowanceDeductionToFormValues(detail.data))
  }, [detail.data, reset])

  const goToList = () => navigate({ to: '/master/allowance-deduction' })

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit ? updateRecord : createRecord
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(isEdit ? 'Record updated' : 'Record created')
        goToList()
      },
      onError: (err) =>
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to ${isEdit ? 'update' : 'create'} record`,
        ),
    })
  })

  return {
    register,
    control,
    errors,
    onSubmit,
    isEdit,
    isPending: isEdit ? updateRecord.isPending : createRecord.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && (detail.isError || (!detail.isLoading && !detail.data)),
    loadError: detail.error,
    goToList,
  }
}
