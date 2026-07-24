import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { stateSchema, type StateFormValues } from '../schemas'
import { EMPTY_STATE_FORM } from '../constants'
import { useCreateState, useUpdateState } from '../api/use-state-mutations'
import type { StateRecord } from '../types'

interface StateFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The record being edited, or `null` to create a new one. */
  record: StateRecord | null
}

/** Add/edit dialog for a state master record. */
export function StateFormDialog({ open, onOpenChange, record }: StateFormDialogProps) {
  const isEdit = record !== null
  const createState = useCreateState()
  const updateState = useUpdateState()
  const isPending = createState.isPending || updateState.isPending

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
    reset(record ? { stateName: record.stateName } : EMPTY_STATE_FORM)
  }, [open, record, reset])

  const onSubmit = handleSubmit((values) => {
    const mutation = isEdit
      ? updateState.mutateAsync({ id: record.id, values })
      : createState.mutateAsync(values)
    mutation
      .then(() => {
        toast.success(isEdit ? 'State updated' : 'State added')
        onOpenChange(false)
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : 'Something went wrong'),
      )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit State' : 'Add State'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="stateName">
              State Name<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input id="stateName" placeholder="State Name" {...register('stateName')} />
            {errors.stateName && (
              <p className="text-xs text-destructive">{errors.stateName.message}</p>
            )}
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add State'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
