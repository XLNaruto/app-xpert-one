import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useStates } from '@/features/master/state'
import { districtSchema, type DistrictFormValues } from '../schemas'
import { EMPTY_DISTRICT_FORM } from '../constants'
import { useCreateDistrict, useUpdateDistrict } from '../api/use-district-mutations'
import { districtToFormValues } from '../lib/district-mappers'
import type { DistrictRecord } from '../types'

interface UseDistrictFormArgs {
  /** Dialog visibility — re-seeds the form each time it opens. */
  open: boolean
  /** The record being edited, or `null` to create a new one. */
  record: DistrictRecord | null
  /** Called after a successful save (usually closes the dialog). */
  onSaved: () => void
}

/**
 * Owns the district master form for both create and edit: validation, the
 * parent-state options, seeding from the edited record and the POST/PUT on
 * submit. The dialog only lays out fields.
 */
export function useDistrictForm({ open, record, onSaved }: UseDistrictFormArgs) {
  const isEdit = record !== null
  const { data: states } = useStates()
  const createDistrict = useCreateDistrict()
  const updateDistrict = useUpdateDistrict()

  // The State dropdown is fed by the state master, not a hard-coded list.
  const stateOptions = useMemo(
    () => (states ?? []).map((s) => ({ label: s.stateName, value: s.stateName })),
    [states],
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DistrictFormValues>({
    resolver: zodResolver(districtSchema),
    defaultValues: EMPTY_DISTRICT_FORM,
  })

  // Sync the form to the record whenever the dialog (re)opens.
  useEffect(() => {
    if (!open) return
    reset(record ? districtToFormValues(record) : EMPTY_DISTRICT_FORM)
  }, [open, record, reset])

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit
      ? updateDistrict.mutateAsync({ id: record.id, values })
      : createDistrict.mutateAsync(values)
    mutation
      .then(() => {
        toast.success(isEdit ? 'District updated' : 'District added')
        onSaved()
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : 'Something went wrong'),
      )
  })

  return {
    register,
    control,
    errors,
    stateOptions,
    onSubmit,
    isEdit,
    isPending: createDistrict.isPending || updateDistrict.isPending,
  }
}
