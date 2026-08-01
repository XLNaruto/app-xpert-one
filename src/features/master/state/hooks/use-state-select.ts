import { useMemo, useState } from 'react'
import type { ComboboxOption } from '@/components/ui/combobox'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useStatesInfinite } from '../api/use-states-infinite'

/** Everything a lazy-loading `<Combobox>` needs, ready to spread onto it. */
export interface StateSelect {
  options: ComboboxOption[]
  loading: boolean
  onScrollEnd: () => void
  onSearchChange: (query: string) => void
}

interface UseStateSelectOptions {
  /**
   * The state already on the record, as `{ value, label }`. An edit form's saved
   * state usually isn't in the first page, and `<Combobox>` reads the trigger's
   * label out of `options` — so it's merged in to keep the selection visible
   * until the page holding it loads.
   */
  selected?: { value: string; label: string }
}

/**
 * Adapts the paged, server-searched state master into `<Combobox>` props. The
 * search box value is debounced and sent to the API, and the next page loads when
 * the option list is scrolled to its end — so a form never pulls all ~36 states
 * (nor the district master's ~800 rows) just to render a dropdown.
 */
export function useStateSelect({ selected }: UseStateSelectOptions = {}): StateSelect {
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search, 300)
  const query = useStatesInfinite(debounced.trim() || undefined)

  const selectedValue = selected?.value
  const selectedLabel = selected?.label

  const options = useMemo<ComboboxOption[]>(() => {
    const loaded = (query.data?.pages ?? []).flatMap((page) =>
      page.items.map((state) => ({
        label: state.stateName,
        value: String(state.id),
      })),
    )
    if (!selectedValue || !selectedLabel) return loaded
    if (loaded.some((option) => option.value === selectedValue)) return loaded
    return [{ value: selectedValue, label: selectedLabel }, ...loaded]
  }, [query.data, selectedValue, selectedLabel])

  return {
    options,
    loading: query.isFetching,
    onScrollEnd: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage()
    },
    onSearchChange: setSearch,
  }
}
