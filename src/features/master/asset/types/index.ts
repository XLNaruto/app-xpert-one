import type { AuditFields } from '@/types/audit'

/** An asset master record. */
export interface AssetRecord extends AuditFields {
  id: number
  /** The tenant the record belongs to — set by the API from the active company. */
  companyId: number
  assetName: string
  /**
   * The asset's OWN stock. An asset holds stock or its variants do, never both:
   * this is forced to 0 and frozen once the first variant exists, so it must
   * never be summed with the variants' quantities — the total on hand is theirs
   * alone.
   */
  quantity: number
  isReturnable: boolean
  /**
   * How many variants hang off this asset — **list rows only**, and `0` on a
   * single-record read, which carries no such field. Zero means the asset is
   * countable and handed out in itself; anything else means the variants hold
   * the stock and the asset is never handed out alone.
   */
  variantCount: number
}

/**
 * One variant of an asset — the countable thing. The asset master carries no
 * number at all; quantity and returnability live here.
 *
 * `quantity` is a **balance**, not a purchase total: what's on the shelf right
 * now. `isReturnable` decides whether a unit ever comes back — a laptop does, a
 * SIM card is consumed on issue.
 */
export interface AssetVariant extends AuditFields {
  id: number
  /** The owning asset. A variant is only ever addressed through it. */
  assetId: number
  variantName: string
  quantity: number
  isReturnable: boolean
}

/** Why the balance moved. The API derives it; the UI only words it. */
export type StockMovementReason =
  | 'OPENING'
  | 'REFILL'
  | 'ADJUSTMENT'
  | 'ASSIGNED'
  | 'RETURNED'
  | 'UNASSIGNED'

/**
 * One line of a variant's stock ledger. `change` is signed and `balanceAfter` is
 * the balance the line left behind, so the history needs no running total.
 */
export interface StockMovement {
  id: number
  assetId: number | null
  /** `null` on a line about the asset itself rather than one of its variants. */
  variantId: number | null
  /** Resolved where the API sends it; the screen names it from the variants list otherwise. */
  variantName: string
  change: number
  balanceAfter: number
  reason: StockMovementReason | string
  /** Set only on handout-driven lines (ASSIGNED / RETURNED / UNASSIGNED). */
  employeeAssetId: number | null
  employeeId: number | null
  /** The name behind `employeeId` where the API sends it — blank otherwise. */
  employeeName: string
  note: string
  createdAt: string
  /**
   * Who wrote the line — null when a super-admin or an employee did, which is
   * true of every audit block in the product. Falls back to the raw id, then
   * "System".
   */
  createdBy: string
}

/**
 * What a stock dialog is pointed at.
 *
 * Stock lives at exactly one of two levels — the asset's own, or a variant's —
 * and the two are different things even when their ids match: asset 7 and
 * variant 7 are unrelated rows. So the level travels WITH the id rather than
 * being inferred from it, and one pair of dialogs serves both.
 */
export type StockTarget =
  | { level: 'asset'; assetId: number; name: string; quantity: number }
  | {
      level: 'variant'
      assetId: number
      variantId: number
      name: string
      quantity: number
    }
