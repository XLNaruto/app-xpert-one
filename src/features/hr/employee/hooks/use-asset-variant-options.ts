import { useMemo } from 'react'
import type { ComboboxOption } from '@/components/ui/combobox'
import { useAssetVariants } from '@/features/master/asset'

/**
 * The variant choices for one picked asset — the second half of step 7's
 * dependent dropdowns.
 *
 * The remaining balance rides along on each row and a variant at zero is offered
 * but refused: the server rejects it anyway, and a greyed option with its count
 * beside it explains itself better than an error toast. The variant currently
 * saved on the row stays selectable even at zero, so an existing handout can be
 * edited without being forced to change what it holds.
 *
 * A variant already handed to this employee on another row is offered greyed
 * too: one physical unit can't sit on two rows of the same form, and the second
 * row would only fail on save.
 *
 * `assetId` is a form string; an empty one leaves the query disabled, which is
 * exactly what "no asset picked yet" should do.
 */
export function useAssetVariantOptions(
  assetId: string,
  keepValue = '',
  /** Variant ids the form's other rows already hold for this asset. */
  takenIds: string[] = [],
) {
  const id = Number(assetId)
  const query = useAssetVariants(Number.isFinite(id) && id > 0 ? id : NaN)

  // Joined, so a fresh array from the caller each render doesn't rebuild the
  // list — the ids are short numeric strings.
  const takenKey = takenIds.join(',')

  const options = useMemo<ComboboxOption[]>(() => {
    const taken = new Set(takenKey ? takenKey.split(',') : [])

    return (query.data?.items ?? []).map((variant) => {
      const value = String(variant.id)
      const isTaken = taken.has(value) && value !== keepValue

      return {
        label: variant.variantName,
        value,
        hint: isTaken
          ? 'Already on this employee'
          : variant.quantity === 0
            ? 'Out of stock'
            : `${variant.quantity} left`,
        disabled: isTaken || (variant.quantity === 0 && value !== keepValue),
      }
    })
  }, [query.data, keepValue, takenKey])

  // `isFetching`, not `isLoading`: switching back to an asset seen earlier hits
  // the cache and refetches, and the counts on those cached options are exactly
  // what shouldn't be picked from until the fresh page lands.
  const isLoading = query.isFetching

  return {
    options,
    isLoading,
    /** True once the asset is known to carry no variants at all. */
    isEmpty: !isLoading && (query.data?.items.length ?? 0) === 0,
  }
}
