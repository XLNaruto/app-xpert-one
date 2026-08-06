import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { useBankSelect } from '@/features/master/bank'
import { employeeKycSchema, type EmployeeKycFormValues } from '../schemas'
import { EMPTY_EMPLOYEE_KYC_FORM } from '../constants'
import { useEmployeeKyc } from '../api/use-employee-steps'
import { useSaveEmployeeKyc } from '../api/use-employee-step-mutations'
import { isKycEmpty, kycToFormValues } from '../lib/employee-step-mappers'

/**
 * Step 2 — KYC.
 *
 * Every KYC field is a column on the employee, so there's no row to insert and no
 * flag saying whether the step has been filled: an untouched step reads back as a
 * record of nulls. That's what decides the verb — the first save is a
 * full-overwrite `POST` so the record ends up matching exactly what the form
 * showed, and every save after it is a partial `PATCH`.
 *
 * `isKycEmpty()` on the loaded record is how we tell those two apart, which is why
 * the form waits for the read before it can save.
 */
export function useEmployeeKycForm({
  employeeId,
  onSaved,
}: {
  employeeId: number
  onSaved: () => void
}) {
  const detail = useEmployeeKyc(employeeId)
  const isFirstSave = detail.data ? isKycEmpty(detail.data) : true
  const saveKyc = useSaveEmployeeKyc(employeeId, isFirstSave)

  const form = useForm<EmployeeKycFormValues>({
    resolver: zodResolver(employeeKycSchema),
    defaultValues: EMPTY_EMPLOYEE_KYC_FORM,
  })
  const { control, reset, handleSubmit } = form

  useEffect(() => {
    if (detail.data) reset(kycToFormValues(detail.data, EMPTY_EMPLOYEE_KYC_FORM))
  }, [detail.data, reset])

  const bankId = useWatch({ control, name: 'bankId' })

  /**
   * The bank master runs to a few hundred rows, so the dropdown pages in as it's
   * scrolled and searches server-side. The KYC response carries only `bank_id`, so
   * a saved bank is labelled by a background read of that one row.
   */
  const bank = useBankSelect({ selected: bankId ? { value: bankId } : undefined })

  const submit = handleSubmit((values) => {
    saveKyc.mutate(values, {
      onSuccess: () => {
        toast.success('KYC detail saved')
        onSaved()
      },
      onError: (error) =>
        toast.error(getApiErrorMessage(error, "Couldn't save the KYC detail.")),
    })
  })

  const isForbidden = isForbiddenError(detail.error)

  return {
    register: form.register,
    control,
    errors: form.formState.errors,
    bank,
    isPending: saveKyc.isPending,
    isLoading: detail.isLoading,
    isError: detail.isError && !isForbidden,
    loadError: detail.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(detail.error) : undefined,
    onSubmit: submit,
  }
}
