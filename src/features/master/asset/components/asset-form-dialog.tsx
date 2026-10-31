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
  const { register, control, errors, onSubmit, isEdit, hasVariants, isPending } = useAssetForm({
    open,
    record,
    onSaved: () => onOpenChange(false),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
          <Field label="Asset Name" required error={errors.assetName?.message}>
            <Input placeholder="Asset Name" {...register('assetName')} />
          </Field>

          {/* An asset holds stock, or its variants do — never both. Once the
              first variant exists these belong to the variants, and sending
              either for such an asset is refused, so they're not offered. */}
          {hasVariants ? (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              This asset has variants, so quantity and returnable are set per
              variant. Manage its stock from the variants table.
            </p>
          ) : (
            <>
              <Field
                label="Quantity"
                required
                error={errors.quantity?.message}
                hint={
                  isEdit
                    ? "The Number on the Shelf Right Now. Changing It Is Recorded as an Adjustment — Use Add / Remove Stock to Buy Units in or Scrap Them. Set It to 0 Before Giving This Asset Variants."
                    : 'How Many Are on the Shelf to Start With. Leave It at 0 If This Asset Will Have Variants — They Hold the Stock Instead.'
                }
              >
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  {...register('quantity')}
                />
              </Field>

              <Controller
                control={control}
                name="isReturnable"
                render={({ field }) => (
                  <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Returnable</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        A laptop comes back to the shelf when the employee returns
                        it. A SIM card or a uniform does not — issuing one consumes
                        it for good, and no status change puts it back.
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
            </>
          )}

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
