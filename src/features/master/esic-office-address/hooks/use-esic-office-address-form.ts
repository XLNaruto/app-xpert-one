import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { ComboboxOption } from '@/components/ui/combobox'
import { useStates } from '@/features/master/state'
import { useDistricts } from '@/features/master/district'
import { esicOfficeAddressSchema, type EsicOfficeAddressFormValues } from '../schemas'
import { EMPTY_ESIC_OFFICE_ADDRESS_FORM } from '../constants'
import { useEsicOfficeAddress } from '../api/use-esic-office-address'
import {
  useCreateEsicOfficeAddress,
  useUpdateEsicOfficeAddress,
} from '../api/use-esic-office-address-mutations'
import { esicOfficeAddressToFormValues } from '../lib/esic-office-address-mappers'

/**
 * Owns the ESIC office address form for both create and edit. In edit mode
 * (`id` set) it loads the record, seeds the form and saves via PUT; create mode
 * POSTs a fresh record. Also feeds the state/district dropdowns from their
 * masters, with district cascading off the chosen state. The page only lays out
 * fields.
 */
export function useEsicOfficeAddressForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = useEsicOfficeAddress(id ?? Number.NaN)
  const createAddress = useCreateEsicOfficeAddress()
  const updateAddress = useUpdateEsicOfficeAddress(id ?? Number.NaN)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<EsicOfficeAddressFormValues>({
    resolver: zodResolver(esicOfficeAddressSchema),
    defaultValues: EMPTY_ESIC_OFFICE_ADDRESS_FORM,
  })

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) reset(esicOfficeAddressToFormValues(detail.data))
  }, [detail.data, reset])

  // State + district dropdowns come from their own masters.
  const { data: states, isLoading: isStatesLoading } = useStates()
  const { data: districts, isLoading: isDistrictsLoading } = useDistricts()

  const stateOptions = useMemo<ComboboxOption[]>(
    () => (states ?? []).map((s) => ({ label: s.stateName, value: s.stateName })),
    [states],
  )

  /** Districts belonging to the chosen state — empty until one is picked. */
  const selectedState = useWatch({ control, name: 'state' })
  const districtOptions = useMemo<ComboboxOption[]>(
    () =>
      (districts ?? [])
        .filter((d) => d.state === selectedState)
        .map((d) => ({ label: d.districtName, value: d.districtName })),
    [districts, selectedState],
  )

  /** Pick a state and clear its district — it may not exist under the new state. */
  const changeState = (value: string, onChange: (value: string) => void) => {
    onChange(value)
    setValue('district', '')
  }

  const goToList = () => navigate({ to: '/master/esic-office-address' })

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit ? updateAddress : createAddress
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(
          isEdit ? 'ESIC office address updated' : 'ESIC office address created',
        )
        goToList()
      },
      onError: (err) =>
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to ${isEdit ? 'update' : 'create'} ESIC office address`,
        ),
    })
  })

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
    goToList,
    stateOptions,
    isStatesLoading,
    districtOptions,
    isDistrictsLoading,
    hasState: Boolean(selectedState),
    changeState,
  }
}
