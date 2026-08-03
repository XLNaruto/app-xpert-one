import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { useStateSelect } from '@/features/master/state'
import { useDistrictSelect } from '@/features/master/district'
import { companySchema, type CompanyFormValues } from '../schemas'
import { EMPTY_COMPANY_FORM } from '../constants'
import { useCompany } from '../api/use-company'
import { useCreateCompany, useUpdateCompany } from '../api/use-company-mutations'
import { companyToFormValues } from '../lib/company-mappers'

/**
 * Owns the company form for both create and edit. In edit mode (`id` set) it
 * loads the record, seeds the form and saves via PATCH; create mode POSTs a
 * fresh record. Also feeds the state/district dropdowns, with district cascading
 * off the chosen state. The page consumes this and only lays out fields.
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

  const selectedStateId = useWatch({ control, name: 'stateId' })
  const selectedDistrictId = useWatch({ control, name: 'districtId' })

  /**
   * What the form currently holds, plus the record's own name for it when there
   * is one. The dropdowns page in from the server, and a saved selection is
   * usually further down the master than the first page reaches — handed the
   * value, the select keeps that option visible either way: labelled from the
   * record when the API sent a name, or read by id in the background when it
   * didn't. A name the API couldn't resolve reads as a dash, which is no use as
   * a label, so it's dropped and the by-id read fills in instead.
   */
  const chosen = (value: string, recordId: number | null, name: string) => {
    if (!value) return undefined
    const isSaved = recordId !== null && String(recordId) === value
    const label = isSaved && name && name !== '—' ? name : undefined
    return { value, label }
  }

  // Both dropdowns page in as they're scrolled and search server-side, so the
  // form never pulls all ~36 states or the district master's ~800 rows up front.
  const state = useStateSelect({
    selected: chosen(
      selectedStateId,
      detail.data?.stateId ?? null,
      detail.data?.stateName ?? '',
    ),
  })

  // Districts cascade off the state, and the API narrows them by `state_id`.
  const district = useDistrictSelect({
    stateId: selectedStateId ? Number(selectedStateId) : undefined,
    selected: chosen(
      selectedDistrictId,
      detail.data?.districtId ?? null,
      detail.data?.districtName ?? '',
    ),
  })

  /** Pick a state and clear its district — it won't exist under the new state. */
  const changeState = (value: string, onChange: (value: string) => void) => {
    onChange(value)
    setValue('districtId', '')
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

  // Reading this record was refused — not a broken screen, so the page shows the
  // 403 screen with the server's reason rather than the form.
  const isForbidden = isEdit && isForbiddenError(detail.error)

  return {
    register,
    control,
    errors,
    onSubmit,
    isEdit,
    isPending: isEdit ? updateCompany.isPending : createCompany.isPending,
    isLoading: isEdit && detail.isLoading,
    isError: isEdit && (detail.isError || (!detail.isLoading && !detail.data)),
    loadError: detail.error,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(detail.error) : undefined,
    goToList,
    /** Scroll-lazy dropdown props — spread straight onto `<Combobox>`. */
    state,
    district,
    hasState: Boolean(selectedStateId),
    changeState,
  }
}
