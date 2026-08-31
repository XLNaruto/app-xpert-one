import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { stockChangeSchema, type StockChangeFormValues } from '../schemas'
import { EMPTY_STOCK_CHANGE_FORM } from '../constants'
import { useChangeAssetStock } from '../api/use-asset-mutations'
import { useChangeVariantStock } from '../api/use-asset-variant-mutations'
import type { StockTarget } from '../types'

interface UseStockChangeFormArgs {
  /** Dialog visibility — re-seeds the form each time it opens. */
  open: boolean
  /** Which level's balance is moving, and which record at it. */
  target: StockTarget | null
  onSaved: () => void
}

/**
 * Add / remove stock, at either level.
 *
 * The form asks for a direction and a magnitude, and the mapper composes the
 * **signed delta** the API wants — the ledger reason is derived from that sign
 * (positive → `REFILL`, negative → `ADJUSTMENT`), never sent. A `409` means the
 * change would take the balance below zero and the count on screen was stale;
 * both mutations re-read either way, so it corrects itself.
 */
export function useStockChangeForm({ open, target, onSaved }: UseStockChangeFormArgs) {
  // Both are declared unconditionally — hooks can't be picked at call time — and
  // only the one matching the target is fired.
  const changeAssetStock = useChangeAssetStock()
  const changeVariantStock = useChangeVariantStock(target?.assetId ?? NaN)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StockChangeFormValues>({
    resolver: zodResolver(stockChangeSchema),
    defaultValues: EMPTY_STOCK_CHANGE_FORM,
  })

  useEffect(() => {
    if (!open) return
    reset(EMPTY_STOCK_CHANGE_FORM)
  }, [open, reset])

  const direction = watch('direction')
  const magnitude = Number(watch('quantity'))
  const isWriteOff = direction === 'out'

  /** What the balance would read after this line — the form's own preview. */
  const projected =
    target && Number.isFinite(magnitude) && magnitude > 0
      ? target.quantity + (isWriteOff ? -magnitude : magnitude)
      : undefined

  const setDirection = (next: StockChangeFormValues['direction']) =>
    setValue('direction', next, { shouldValidate: false })

  const onSubmit = handleSubmit((values) => {
    if (!target) return

    const saved =
      target.level === 'asset'
        ? changeAssetStock.mutateAsync({ id: target.assetId, values })
        : changeVariantStock.mutateAsync({ id: target.variantId, values })

    saved
      .then(({ movement }) => {
        toast.success(
          movement.change > 0
            ? `Added ${movement.change} — ${movement.balanceAfter} in stock`
            : `Removed ${Math.abs(movement.change)} — ${movement.balanceAfter} in stock`,
        )
        onSaved()
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't update the stock.")))
  })

  return {
    register,
    errors,
    onSubmit,
    direction,
    setDirection,
    isWriteOff,
    projected,
    isPending: changeAssetStock.isPending || changeVariantStock.isPending,
  }
}
