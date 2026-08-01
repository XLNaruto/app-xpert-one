import { useMemo, useState } from 'react'
import type { ComboboxOption } from '@/components/ui/combobox'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useDistrictsInfinite } from '../api/use-districts-infinite'

/** Everything a lazy-loading `<Combobox>` needs, ready to spread onto it. */
export interface DistrictSelect {
  options: ComboboxOption[]
  loading: boolean
  onScrollEnd: () => void
  onSearchChange: (query: string) => void
}

interface UseDistrictSelectOptions {
  /** The chosen state — districts cascade off it, and the API filters by it. */
  stateId?: number
  /**
   * The district already on the record, as `{ value, label }`, merged in so an
   * edit form shows its saved selection before the page holding it loads.
   */
  selected?: { value: string; label: string }
}

/**
 * Adapts the paged, server-searched district master into `<Combobox>` props,
 * scoped to one state. The search box value is debounced and sent to the API, and
 * the next page loads when the option list is scrolled to its end.
 */
export function useDistrictSelect({
  stateId,
  selected,
}: UseDistrictSelectOptions = {}): DistrictSelect {
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search, 300)
  const query = useDistrictsInfinite(stateId, debounced.trim() || undefined)

  const selectedValue = selected?.value
  const selectedLabel = selected?.label

  const options = useMemo<ComboboxOption[]>(() => {
    // No state chosen yet — the field reads "Select a state first", not an
    // option list, so don't surface a stale page from the previous state.
    if (stateId == null) return []

    const loaded = (query.data?.pages ?? []).flatMap((page) =>
      page.items.map((district) => ({
        label: district.districtName,
        value: String(district.id),
      })),
    )
    if (!selectedValue || !selectedLabel) return loaded
    if (loaded.some((option) => option.value === selectedValue)) return loaded
    return [{ value: selectedValue, label: selectedLabel }, ...loaded]
  }, [query.data, stateId, selectedValue, selectedLabel])

  return {
    options,
    loading: stateId != null && query.isFetching,
    onScrollEnd: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage()
    },
    onSearchChange: setSearch,
  }
}
