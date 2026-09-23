import { useMemo, useRef, useState } from 'react'
import { keepPreviousData, useInfiniteQuery, useQueries } from '@tanstack/react-query'
import type { ComboboxOption } from '@/components/ui/combobox'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import type { LazyOptionSource } from '@/hooks/use-lazy-options'
import { LOOKUP_STALE_TIME } from '@/lib/lookup-cache'
import type { PageParams, Paginated } from '@/lib/pagination'

/** Rows per request — one comfortable panel-full of a dropdown. */
export const SELECT_PAGE_SIZE = 25

/** Everything a lazy-loading `<Combobox>` needs, ready to spread onto it. */
export interface PagedSelect {
  options: ComboboxOption[]
  loading: boolean
  onScrollEnd: () => void
  onSearchChange: (query: string) => void
}

/** What a master's `use<Thing>Select` hook takes from the screen using it. */
export interface MasterSelectOptions<T> {
  /** What the field currently holds — one id or several, as strings. */
  selected?: string | string[]
  /** The saved row's label, when the record already carries it. */
  selectedLabel?: string
  /** Hold the read back until the field can actually be used. */
  enabled?: boolean
  /** Overrides the master's default label — a code beside the name, a disabled row. */
  toOption?: (row: T) => ComboboxOption
}

export interface UsePagedSelectParams<T> {
  /** The query key for one search term — `queryKeys.<master>.infinite(search, …)`. */
  queryKey: (search: string | undefined) => readonly unknown[]
  /** One limit/offset page of the master, searched server-side. */
  fetchPage: (params: PageParams) => Promise<Paginated<T>>
  /** A row as the option the dropdown shows. */
  toOption: (row: T) => ComboboxOption
  /**
   * What the field currently holds — one id or several, as strings. A saved or
   * picked value is rarely on the loaded pages (and drops off them once another
   * term is searched), and `<Combobox>` reads its labels out of `options`, so the
   * selection is kept among them.
   */
  selected?: string | string[]
  /**
   * The label for a single `selected`, when the record already carries it (a
   * `department_name`, say) — no read is made for it then.
   */
  selectedLabel?: string
  /**
   * Reads one row by id, for a saved value whose label nobody has — an edit form
   * opening on an id further down the master than the first page reaches. Its
   * `key` may be the master's own detail key: the option is cached beside it.
   */
  source?: LazyOptionSource
  /** Order the pages are read in — pinned, so paging can't repeat or skip rows. */
  sort?: Pick<PageParams, 'sort' | 'sortBy'>
  /** Hold the read back until the field can actually be used. */
  enabled?: boolean
  pageSize?: number
}

/**
 * Adapts any paged, server-searched master into `<Combobox>` props: the search
 * box is debounced and sent to the API, and the next page loads when the option
 * list is scrolled to its end — so a form or filter never pulls a whole master
 * just to render one field.
 */
export function usePagedSelect<T>({
  queryKey,
  fetchPage,
  toOption,
  selected,
  selectedLabel,
  source,
  sort,
  enabled = true,
  pageSize = SELECT_PAGE_SIZE,
}: UsePagedSelectParams<T>): PagedSelect {
  const [search, setSearch] = useState('')
  const term = useDebouncedValue(search, 300).trim() || undefined

  const query = useInfiniteQuery({
    queryKey: queryKey(term),
    queryFn: ({ pageParam }) =>
      fetchPage({
        limit: pageSize,
        offset: pageParam,
        ...sort,
        ...(term ? { search: term } : {}),
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((count, page) => count + page.items.length, 0)
      // `undefined` is how TanStack Query is told there's no next page.
      return loaded < lastPage.total ? loaded : undefined
    },
    enabled,
    // A typed term shouldn't blank the list while its first page arrives.
    placeholderData: keepPreviousData,
    staleTime: LOOKUP_STALE_TIME,
  })

  const loaded = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.items.map(toOption)),
    // `toOption` is a mapper, not state — the pages are what change.
    [query.data],
  )

  // Every label this field has shown, so a selection outlives the page it came from.
  const seen = useRef(new Map<string, string>())
  for (const option of loaded) seen.current.set(option.value, option.label)

  const values = Array.isArray(selected) ? selected : selected ? [selected] : []
  const inLoaded = new Set(loaded.map((option) => option.value))
  const given = values.length === 1 && selectedLabel ? selectedLabel : undefined

  // Saved values nobody has a label for yet — each read once by id, in the background.
  const unresolved =
    source && !given ? values.filter((v) => !inLoaded.has(v) && !seen.current.has(v)) : []
  const lookups = useQueries({
    queries: unresolved.map((value) => ({
      // Suffixed, so an option never overwrites the full record cached at the detail key.
      queryKey: [...(source as LazyOptionSource).key(value), 'option'],
      queryFn: () => (source as LazyOptionSource).fetch(value),
      staleTime: LOOKUP_STALE_TIME,
      retry: false,
    })),
  })
  for (const { data } of lookups) if (data) seen.current.set(data.value, data.label)
  if (given) seen.current.set(values[0], given)

  // The selection, kept at the top until the page that holds it arrives.
  const keptKey = values
    .filter((value) => !inLoaded.has(value) && seen.current.has(value))
    .map((value) => `${value}\u0000${seen.current.get(value)}`)
    .join('\u0001')
  const options = useMemo(() => {
    if (!keptKey) return loaded
    const kept = keptKey.split('\u0001').map((entry) => {
      const [value, label] = entry.split('\u0000')
      return { value, label }
    })
    return [...kept, ...loaded]
  }, [loaded, keptKey])

  return {
    options,
    loading: enabled && query.isFetching,
    onScrollEnd: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage()
    },
    onSearchChange: setSearch,
  }
}
