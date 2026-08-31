import type {
  AssetVariantFormValues,
  AssetVariantPayload,
  AssetVariantResponse,
  StockChangeFormValues,
  StockChangePayload,
  StockMovementResponse,
} from '../schemas'
import { STOCK_REASON_META, type StockReasonTone } from '../constants'
import type { AssetVariant, StockMovement } from '../types'

/**
 * Mappers for the variant + stock layer: the API record into the UI type, and
 * the validated form back into the request body. No React here.
 */

/** API record → the UI variant. */
export function toAssetVariant(response: AssetVariantResponse): AssetVariant {
  return {
    id: response.id,
    assetId: response.asset_id,
    variantName: response.name,
    quantity: response.quantity,
    isReturnable: response.is_returnable,
    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at ?? '',
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/**
 * Validated form → the variant body. `quantity` travels as the absolute level
 * the box shows: the server turns the difference into an `ADJUSTMENT` line, so
 * the form never computes a delta.
 */
export function variantToPayload(values: AssetVariantFormValues): AssetVariantPayload {
  return {
    name: values.variantName.trim(),
    quantity: Number(values.quantity),
    is_returnable: values.isReturnable,
  }
}

/** Hydrate the edit form from a stored variant. */
export function variantToFormValues(variant: AssetVariant): AssetVariantFormValues {
  return {
    variantName: variant.variantName,
    quantity: String(variant.quantity),
    isReturnable: variant.isReturnable,
  }
}

/** API record → one ledger line. */
export function toStockMovement(response: StockMovementResponse): StockMovement {
  return {
    id: response.id,
    assetId: response.asset_id ?? null,
    variantId: response.variant_id ?? null,
    variantName: response.variant_name ?? '',
    change: response.change,
    balanceAfter: response.balance_after,
    reason: response.reason,
    employeeAssetId: response.employee_asset_id ?? null,
    employeeId: response.employee_id ?? null,
    employeeName: response.employee_name ?? '',
    note: response.note ?? '',
    createdAt: response.created_at ?? '',
    // Null when a super-admin or an employee wrote the line — fall back to the
    // raw id, and let the screen say "System" when there is neither.
    createdBy: response.created_by_name ?? response.created_by ?? '',
  }
}

/**
 * Validated form → the refill / write-off body. The direction and the magnitude
 * are composed into the signed delta the API wants; the reason is derived from
 * that sign server-side, so none is sent.
 */
export function stockChangeToPayload(values: StockChangeFormValues): StockChangePayload {
  const magnitude = Number(values.quantity)
  const note = values.note.trim()
  return {
    change: values.direction === 'out' ? -magnitude : magnitude,
    ...(note ? { note } : {}),
  }
}

/** A signed change as the ledger reads it — `+5`, `−1`. */
export function formatStockChange(change: number): string {
  return change < 0 ? `−${Math.abs(change)}` : `+${change}`
}

/**
 * How one ledger line is worded and coloured.
 *
 * Most reasons word themselves, but `ADJUSTMENT` covers both a manual write-off
 * and an edit to the quantity box — it can go either way — so it takes its
 * wording from the sign of the change, matching the Add / Remove Stock buttons
 * that produced it.
 */
export function stockReasonMeta(
  reason: string,
  change: number,
): { label: string; variant: StockReasonTone } {
  const known = STOCK_REASON_META[reason]
  if (known) return { label: known.label, variant: known.variant }

  if (reason === 'ADJUSTMENT') {
    return change < 0
      ? { label: 'Stock Removed', variant: 'destructive' }
      : { label: 'Stock Added', variant: 'success' }
  }

  // An unrecognised reason still reads as itself rather than as a blank.
  return { label: reason, variant: 'secondary' }
}
