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
import { useAssetForm } from '../hooks/use-asset-form'
import type { AssetRecord } from '../types'

interface AssetFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The record being edited, or `null` to create a new one. */
  record: AssetRecord | null
}

/** Add/edit dialog for an asset master record — layout only. */
export function AssetFormDialog({ open, onOpenChange, record }: AssetFormDialogProps) {
  const { register, errors, onSubmit, isEdit, isPending } = useAssetForm({
    open,
    record,
    onSaved: () => onOpenChange(false),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
          <Field label="Asset Name" required error={errors.assetName?.message}>
            <Input placeholder="Asset Name" {...register('assetName')} />
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
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Asset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
