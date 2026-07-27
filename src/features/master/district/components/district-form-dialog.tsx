import { Controller } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/common/form-field'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDistrictForm } from '../hooks/use-district-form'
import type { DistrictRecord } from '../types'

interface DistrictFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The record being edited, or `null` to create a new one. */
  record: DistrictRecord | null
}

/** Add/edit dialog for a district master record — layout only. */
export function DistrictFormDialog({ open, onOpenChange, record }: DistrictFormDialogProps) {
  const { register, control, errors, stateOptions, onSubmit, isEdit, isPending } =
    useDistrictForm({ open, record, onSaved: () => onOpenChange(false) })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit District' : 'Add District'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
          <Field label="State" required error={errors.state?.message}>
            <Controller
              control={control}
              name="state"
              render={({ field }) => (
                <Combobox
                  className="w-full"
                  value={field.value}
                  onChange={field.onChange}
                  options={stateOptions}
                  placeholder="Select State"
                  searchPlaceholder="Search state"
                />
              )}
            />
          </Field>

          <Field label="District Name" required error={errors.districtName?.message}>
            <Input placeholder="District Name" {...register('districtName')} />
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
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add District'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
