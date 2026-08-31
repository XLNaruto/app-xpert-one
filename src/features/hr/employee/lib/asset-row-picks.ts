import type { ComboboxOption } from '@/components/ui/combobox'
import type { AssetRecord } from '@/features/master/asset'
import type { EmployeeAssetFormValues } from '../schemas'

/**
 * What step 7's other rows have already taken.
 *
 * One physical unit can't sit on two rows of the same handout list, so a pick
 * made on one card is offered greyed on the rest rather than left to fail on
 * save. Two shapes of "one unit", matching the two shapes of stock:
 *
 * - an asset that carries variants is claimed **per variant** — Mobile /
 *   Smart Phone on row 1 leaves Mobile / Feature Phone free on row 2;
 * - an asset with no variants has nothing under it to tell two rows apart, so
 *   the asset itself is claimed.
 *
 * Pure by design (rule 12): the tab passes the watched rows straight in.
 */

/** Variant ids the other rows hold for `assetId`. */
export function takenVariantIds(
  rows: EmployeeAssetFormValues[],
  index: number,
  assetId: string,
): string[] {
  if (!assetId) return []

  return rows
    .filter((row, i) => i !== index && row?.assetId === assetId && row?.variantId)
    .map((row) => row.variantId)
}

/**
 * The asset list with every variant-less asset another row already holds greyed
 * out. An asset WITH variants stays open — its rows are told apart by variant.
 */
export function withTakenAssetsDisabled(
  options: ComboboxOption[],
  rows: EmployeeAssetFormValues[],
  index: number,
  assetsById: Map<string, AssetRecord>,
): ComboboxOption[] {
  const keepValue = rows[index]?.assetId ?? ''

  const taken = new Set(
    rows
      .filter((row, i) => i !== index && row?.assetId)
      .map((row) => row.assetId)
      .filter((assetId) => (assetsById.get(assetId)?.variantCount ?? 0) === 0),
  )

  if (taken.size === 0) return options

  return options.map((option) =>
    taken.has(option.value) && option.value !== keepValue
      ? { ...option, hint: 'Already on this employee', disabled: true }
      : option,
  )
}
