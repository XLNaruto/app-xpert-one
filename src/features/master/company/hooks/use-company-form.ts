import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { ComboboxOption } from '@/components/ui/combobox'
import { useDistricts } from '@/features/master/district'
import { companySchema, type CompanyFormValues } from '../schemas'
import { EMPTY_COMPANY_FORM } from '../constants'
import { useCompany } from '../api/use-company'
import { useCreateCompany, useUpdateCompany } from '../api/use-company-mutations'
import { companyToFormValues } from '../lib/company-mappers'

/**
 * Owns the company form for both create and edit. In edit mode (`id` set) it
 * loads the record, seeds the form and saves via PUT; create mode POSTs a fresh
 * record. The page consumes this and only lays out fields.
 */
export function useCompanyForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = useCompany(id ?? Number.NaN)
  const createCompany = useCreateCompany()
  const updateCompany = useUpdateCompany(id ?? Number.NaN)

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: EMPTY_COMPANY_FORM,
  })

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) reset(companyToFormValues(detail.data))
  }, [detail.data, reset])

  // District choices come from the district master, narrowed to the chosen state.
  const { data: districts } = useDistricts()
  const state = watch('state')
  const districtOptions = useMemo<ComboboxOption[]>(
    () =>
      (districts ?? [])
        .filter((d) => d.state === state)
        .map((d) => ({ label: d.districtName, value: d.districtName })),
    [districts, state],
  )

  /** Pick a state and clear the district — it may not exist under the new state. */
  const changeState = (value: string, onChange: (value: string) => void) => {
    onChange(value)
    setValue('district', '')
  }

  const goToList = () => navigate({ to: '/master/company' })

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit ? updateCompany : createCompany
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(isEdit ? 'Company updated' : 'Company created')
        goToList()
      },
      onError: (err) =>
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to ${isEdit ? 'update' : 'create'} company`,
        ),
    })
  })

  return {
    register,
    control,
    errors,
    districtOptions,
    changeState,
    onSubmit,
    isEdit,
    isPending: isEdit ? updateCompany.isPending : createCompany.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && (detail.isError || (!detail.isLoading && !detail.data)),
    loadError: detail.error,
    goToList,
  }
}
