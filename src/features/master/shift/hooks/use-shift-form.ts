import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { shiftSchema, type ShiftFormValues } from '../schemas'
import { EMPTY_SHIFT_FORM } from '../constants'
import { useCreateShift, useUpdateShift } from '../api/use-shift-mutations'
import { shiftToFormValues } from '../lib/shift-mappers'
import type { Shift } from '../types'

interface UseShiftFormOptions {
  /** The company the shift belongs to — the record the screen is editing. */
  companyId?: number
  /** The row picked for editing, or `null` while the form is adding. */
  editing: Shift | null
  /** Called once a save lands, so the list can clear its editing row. */
  onSaved: () => void
}

/**
 * The add/edit form above the shift list. One form serves both: picking a row
 * seeds it and turns Save into a PATCH, and clearing the selection puts it back
 * to a blank POST. The component consumes this and only lays out fields.
 */
export function useShiftForm({ companyId, editing, onSaved }: UseShiftFormOptions) {
  const isEdit = editing !== null

  const createShift = useCreateShift(companyId)
  const updateShift = useUpdateShift(editing?.id ?? Number.NaN)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftSchema),
    defaultValues: EMPTY_SHIFT_FORM,
  })

  // Follow the list's selection: a picked row seeds the form, clearing it blanks
  // the form back out for the next add.
  useEffect(() => {
    reset(editing ? shiftToFormValues(editing) : EMPTY_SHIFT_FORM)
  }, [editing, reset])

  /** Abandon an edit — back to a blank add. */
  const cancelEdit = () => {
    onSaved()
    reset(EMPTY_SHIFT_FORM)
  }

  const onSubmit = handleSubmit((values) => {
    if (companyId === undefined) {
      toast.error('Save the company first, then add its shifts.')
      return
    }

    const mutation = isEdit ? updateShift : createShift
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(isEdit ? 'Shift updated' : 'Shift added')
        // The list owns the selection, so clearing it is what blanks the form.
        onSaved()
        reset(EMPTY_SHIFT_FORM)
      },
      onError: (err) =>
        toast.error(
          getApiErrorMessage(err, `Failed to ${isEdit ? 'update' : 'add'} shift`),
        ),
    })
  })

  return {
    register,
    control,
    errors,
    onSubmit,
    isEdit,
    isPending: isEdit ? updateShift.isPending : createShift.isPending,
    cancelEdit,
  }
}
