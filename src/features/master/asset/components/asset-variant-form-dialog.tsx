import { Controller } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Field } from '@/components/common/form-field'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAssetVariantForm } from '../hooks/use-asset-variant-form'
import type { AssetVariant } from '../types'

interface AssetVariantFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The asset the variant belongs to — fixed for the life of the variant. */
  assetId: number
  /** The variant being edited, or `null` to create a new one. */
  record: AssetVariant | null
}

/** Add/edit dialog for one variant of an asset — layout only. */
export function AssetVariantFormDialog({
  open,
  onOpenChange,
  assetId,
  record,
}: AssetVariantFormDialogProps) {
  const { register, control, errors, onSubmit, isEdit, isPending } = useAssetVariantForm({
    assetId,
    open,
    record,
    onSaved: () => onOpenChange(false),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Variant' : 'Add Variant'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
          <Field label="Variant Name" required error={errors.variantName?.message}>
            <Input placeholder="Small, Medium, Large…" {...register('variantName')} />
          </Field>

          <Field
            label="Quantity"
            required
            error={errors.quantity?.message}
            hint={
              isEdit
                ? 'The number on the shelf right now. Changing it is recorded as an adjustment — use Add / Remove Stock to buy units in or scrap them.'
                : 'How many are on the shelf to start with. Leave it at 0 and refill later.'
            }
          >
            <Input type="text" inputMode="numeric" placeholder="0" {...register('quantity')} />
          </Field>

          <Controller
            control={control}
            name="isReturnable"
            render={({ field }) => (
              <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Returnable</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    A laptop comes back to the shelf when the employee returns it. A SIM
                    card or a uniform does not — issuing one consumes it for good, and no
                    status change puts it back.
                  </p>
                </div>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="Returnable"
                />
              </div>
            )}
          />

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
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Variant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
