import { useMemo, useState } from 'react'
import type { ComboboxOption } from '@/components/ui/combobox'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useLazyOptions, type LazyOptionSource } from '@/hooks/use-lazy-options'
import { queryKeys } from '@/lib/query-keys'
import { fetchDistrict } from '../api/district-api'
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
   *
   * `label` is optional: without one the district is read by id in the
   * background, which is the common case here — the master runs to ~800 rows, so
   * a saved district is rarely on the first page.
   */
  selected?: { value: string; label?: string }
}

/** Reads the one district behind a selection the loaded pages don't cover. */
const DISTRICT_SOURCE: LazyOptionSource = {
  key: (value) => queryKeys.district.detail(Number(value)),
  fetch: async (value) => {
    const district = await fetchDistrict(Number(value))
    return { value: String(district.id), label: district.districtName }
  },
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

  const loaded = useMemo<ComboboxOption[]>(() => {
    // No state chosen yet — the field reads "Select a state first", not an
    // option list, so don't surface a stale page from the previous state.
    if (stateId == null) return []

    return (query.data?.pages ?? []).flatMap((page) =>
      page.items.map((district) => ({
        label: district.districtName,
        value: String(district.id),
      })),
    )
  }, [query.data, stateId])

  const options = useLazyOptions({
    loaded,
    // With no state there's no list to belong to, so nothing to resolve either.
    value: stateId == null ? undefined : selected?.value,
    label: selected?.label,
    source: DISTRICT_SOURCE,
  })

  return {
    options,
    loading: stateId != null && query.isFetching,
    onScrollEnd: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage()
    },
    onSearchChange: setSearch,
  }
}
