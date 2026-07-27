import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/common/form-field'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useStateForm } from '../hooks/use-state-form'
import type { StateRecord } from '../types'

interface StateFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The record being edited, or `null` to create a new one. */
  record: StateRecord | null
}

/** Add/edit dialog for a state master record — layout only. */
export function StateFormDialog({ open, onOpenChange, record }: StateFormDialogProps) {
  const { register, errors, onSubmit, isEdit, isPending } = useStateForm({
    open,
    record,
    onSaved: () => onOpenChange(false),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit State' : 'Add State'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
          <Field label="State Name" required error={errors.stateName?.message}>
            <Input placeholder="State Name" {...register('stateName')} />
          </Field>

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
