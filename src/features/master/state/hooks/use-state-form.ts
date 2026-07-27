import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { stateSchema, type StateFormValues } from '../schemas'
import { EMPTY_STATE_FORM } from '../constants'
import { useCreateState, useUpdateState } from '../api/use-state-mutations'
import type { StateRecord } from '../types'
import { stateToFormValues } from '../lib/state-mappers'

interface UseStateFormArgs {
  /** Dialog visibility — re-seeds the form each time it opens. */
  open: boolean
  /** The record being edited, or `null` to create a new one. */
  record: StateRecord | null
  /** Called after a successful save (usually closes the dialog). */
  onSaved: () => void
}

/**
 * Owns the state master form for both create and edit: validation, seeding
 * from the edited record and the POST/PUT on submit. The dialog consumes this
 * and only lays out fields.
 */
export function useStateForm({ open, record, onSaved }: UseStateFormArgs) {
  const isEdit = record !== null
  const createState = useCreateState()
  const updateState = useUpdateState()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StateFormValues>({
    resolver: zodResolver(stateSchema),
    defaultValues: EMPTY_STATE_FORM,
  })

  // Sync the form to the record whenever the dialog (re)opens.
  useEffect(() => {
    if (!open) return
    reset(record ? stateToFormValues(record) : EMPTY_STATE_FORM)
  }, [open, record, reset])

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit
      ? updateState.mutateAsync({ id: record.id, values })
      : createState.mutateAsync(values)
    mutation
      .then(() => {
        toast.success(isEdit ? 'State updated' : 'State added')
        onSaved()
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : 'Something went wrong'),
      )
  })

  return {
    register,
    errors,
    onSubmit,
    isEdit,
    isPending: createState.isPending || updateState.isPending,
  }
}
