import { useMemo, useState } from 'react'
import type { ComboboxOption } from '@/components/ui/combobox'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useLazyOptions, type LazyOptionSource } from '@/hooks/use-lazy-options'
import { queryKeys } from '@/lib/query-keys'
import { fetchState } from '../api/state-api'
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
   * The state already on the record, as `{ value, label }` — the value being a
   * state id as a string. An edit form's saved state usually isn't in the first
   * page, and `<Combobox>` reads the trigger's label out of `options`, so the
   * selection is merged in to stay visible until the page holding it loads.
   *
   * `label` is optional: without one the state is read by id in the background,
   * so a caller that only has the id still gets a labelled trigger.
   */
  selected?: { value: string; label?: string }
}

/** Reads the one state behind a selection the loaded pages don't cover. */
const STATE_SOURCE: LazyOptionSource = {
  key: (value) => queryKeys.state.detail(Number(value)),
  fetch: async (value) => {
    const state = await fetchState(Number(value))
    return { value: String(state.id), label: state.stateName }
  },
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

  const loaded = useMemo<ComboboxOption[]>(
    () =>
      (query.data?.pages ?? []).flatMap((page) =>
        page.items.map((state) => ({
          label: state.stateName,
          value: String(state.id),
        })),
      ),
    [query.data],
  )

  const options = useLazyOptions({
    loaded,
    value: selected?.value,
    label: selected?.label,
    source: STATE_SOURCE,
  })

  return {
    options,
    loading: query.isFetching,
    onScrollEnd: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage()
    },
    onSearchChange: setSearch,
  }
}
