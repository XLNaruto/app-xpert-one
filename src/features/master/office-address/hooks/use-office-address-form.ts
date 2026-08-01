import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { useStateSelect } from '@/features/master/state'
import { useDistrictSelect } from '@/features/master/district'
import { officeAddressSchema, type OfficeAddressFormValues } from '../schemas'
import { EMPTY_OFFICE_ADDRESS_FORM } from '../constants'
import { useOfficeAddress } from '../api/use-office-address'
import {
  useCreateOfficeAddress,
  useUpdateOfficeAddress,
} from '../api/use-office-address-mutations'
import { officeAddressToFormValues } from '../lib/office-address-mappers'
import type { OfficeAddressScreen } from '../types'

/**
 * Owns the office address form for both create and edit, on any of the five
 * screens. In edit mode (`id` set) it loads the record, seeds the form and saves
 * via PATCH; create mode POSTs a fresh record under the screen's `office_for`.
 * Also feeds the state/district dropdowns, with district cascading off the
 * chosen state. The page only lays out fields.
 */
export function useOfficeAddressForm(screen: OfficeAddressScreen, id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = useOfficeAddress(id ?? Number.NaN)
  const createAddress = useCreateOfficeAddress(screen.officeFor)
  const updateAddress = useUpdateOfficeAddress(id ?? Number.NaN, screen.officeFor)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<OfficeAddressFormValues>({
    resolver: zodResolver(officeAddressSchema),
    defaultValues: EMPTY_OFFICE_ADDRESS_FORM,
  })

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) reset(officeAddressToFormValues(detail.data))
  }, [detail.data, reset])

  const selectedStateId = useWatch({ control, name: 'stateId' })
  const selectedDistrictId = useWatch({ control, name: 'districtId' })

  /**
   * The names already on the record, so an edit form's saved state and district
   * stay readable in their triggers before the page holding them loads. Only
   * meaningful while the form still holds what the record had — once the user
   * picks something else, that option came from a loaded page anyway. A name the
   * API couldn't resolve reads as a dash, which is no use as a label.
   */
  const savedName = (id: number | null, name: string, current: string) =>
    id !== null && String(id) === current && name && name !== '—'
      ? { value: current, label: name }
      : undefined

  // Both dropdowns page in as they're scrolled and search server-side, so the
  // form never pulls all ~36 states or the district master's ~800 rows up front.
  const state = useStateSelect({
    selected: detail.data
      ? savedName(detail.data.stateId, detail.data.stateName, selectedStateId)
      : undefined,
  })

  // Districts cascade off the state, and the API narrows them by `state_id`.
  const district = useDistrictSelect({
    stateId: selectedStateId ? Number(selectedStateId) : undefined,
    selected: detail.data
      ? savedName(
          detail.data.districtId,
          detail.data.districtName,
          selectedDistrictId,
        )
      : undefined,
  })

  /** Pick a state and clear its district — it won't exist under the new state. */
  const changeState = (value: string, onChange: (value: string) => void) => {
    onChange(value)
    setValue('districtId', '')
  }

  const goToList = () => navigate({ to: screen.listPath })

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit ? updateAddress : createAddress
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(`${screen.shortLabel} ${isEdit ? 'updated' : 'created'}`)
        goToList()
      },
      onError: (err) =>
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to ${isEdit ? 'update' : 'create'} ${screen.shortLabel}`,
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
    isPending: isEdit ? updateAddress.isPending : createAddress.isPending,
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
