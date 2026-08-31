import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field } from '@/components/common/form-field'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useStockChangeForm } from '../hooks/use-stock-change-form'
import type { StockTarget } from '../types'

interface StockChangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Which record's balance is moving — an asset's own, or one variant's. */
  target: StockTarget | null
}

/**
 * Add / remove stock, at either level — an asset's own stock, or a variant's.
 *
 * The direction is a choice rather than a minus sign the user has to remember:
 * the API takes a signed delta, and getting the sign wrong is the difference
 * between buying five in and scrapping five. The ledger still words the two as
 * REFILL and ADJUSTMENT — that vocabulary is the server's, not the button's.
 */
export function StockChangeDialog({
  open,
  onOpenChange,
  target,
}: StockChangeDialogProps) {
  const {
    register,
    errors,
    onSubmit,
    direction,
    setDirection,
    isWriteOff,
    projected,
    isPending,
  } = useStockChangeForm({
    open,
    target,
    onSaved: () => onOpenChange(false),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle className="pr-10">
            {target ? `Stock — ${target.name}` : 'Stock'}
          </DialogTitle>
        </DialogHeader>

        <p className="mt-1 text-sm text-muted-foreground">
          {target ? (
            <>
              <span className="font-medium text-foreground">{target.quantity}</span> on
              the shelf right now.
            </>
          ) : null}
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection('in')}
              className={cn(
                'flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                direction === 'in'
                  ? 'border-success bg-success/10 text-success'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              <Plus className="size-4" />
              Add Stock
            </button>
            <button
              type="button"
              onClick={() => setDirection('out')}
              className={cn(
                'flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                direction === 'out'
                  ? 'border-destructive bg-destructive/10 text-destructive'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              <Minus className="size-4" />
              Remove Stock
            </button>
          </div>

          <Field
            label={isWriteOff ? 'Units to remove' : 'Units to add'}
            required
            error={errors.quantity?.message}
            hint={
              projected !== undefined
                ? `The balance would read ${Math.max(projected, 0)} after this.`
                : undefined
            }
          >
            <Input type="text" inputMode="numeric" placeholder="0" {...register('quantity')} />
          </Field>

          <Field
            label="Note"
            error={errors.note?.message}
            hint={
              isWriteOff
                ? 'Say what happened to them — a write-off with no reason is hard to answer for later.'
                : 'A PO number or supplier, so the line explains itself in the history.'
            }
          >
            <Textarea
              rows={2}
              placeholder={isWriteOff ? 'Damaged in transit' : 'PO-4471, five units received'}
              {...register('note')}
            />
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
              {isPending ? 'Saving…' : isWriteOff ? 'Remove Stock' : 'Add Stock'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
