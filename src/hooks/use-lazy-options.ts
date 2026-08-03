import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ComboboxOption } from '@/components/ui/combobox'
import { LOOKUP_STALE_TIME } from '@/lib/lookup-cache'

/** How a lazy dropdown reads one record by id when it needs that row's label. */
export interface LazyOptionSource {
  /** Query key for the by-id read — one cache entry per value. */
  key: (value: string) => readonly unknown[]
  /** Fetch that one record and shape it as the option the dropdown shows. */
  fetch: (value: string) => Promise<ComboboxOption>
}

interface UseLazyOptionsParams {
  /** The options loaded so far — the pages the dropdown has pulled in. */
  loaded: ComboboxOption[]
  /** What the form currently holds: an id as a string, or '' for nothing. */
  value?: string
  /**
   * The label for `value`, when the caller already knows it (the record carried
   * a `state_name`, say). Given one, no by-id read is made.
   */
  label?: string
  /** Where to read a label the caller doesn't have. */
  source: LazyOptionSource
}

/**
 * The dropdown's options with its current selection guaranteed to be among them.
 *
 * A scroll-lazy dropdown only holds the pages it has loaded, but an edit form
 * starts out holding whatever id the record was saved with — and that row is
 * usually further down the master than the first page reaches. `<Combobox>`
 * reads its trigger label out of `options`, so without the row the field opens
 * blank even though a value is set.
 *
 * So: if the selection is already in `loaded`, nothing happens. If the caller
 * knows its label, that's used. Otherwise the one record is read by id in the
 * background and merged in at the top — and dropped again as soon as the page
 * that actually contains it arrives, so it never shows twice.
 *
 * The read is cached per value for the lookup stale time and isn't retried: a
 * label that can't be resolved is a blank trigger, never a broken form.
 */
export function useLazyOptions({
  loaded,
  value,
  label,
  source,
}: UseLazyOptionsParams): ComboboxOption[] {
  const isLoaded = !value || loaded.some((option) => option.value === value)
  // Nothing to look up when there's no selection, the pages already hold it, or
  // the caller handed us its label.
  const missing = !isLoaded && !label ? value : undefined

  const { data } = useQuery({
    queryKey: source.key(missing ?? ''),
    queryFn: () => source.fetch(missing as string),
    enabled: missing !== undefined,
    staleTime: LOOKUP_STALE_TIME,
    retry: false,
  })

  return useMemo(() => {
    if (isLoaded || !value) return loaded
    if (label) return [{ value, label }, ...loaded]
    // Guard against a result left over from a previous selection.
    return data?.value === value ? [data, ...loaded] : loaded
  }, [loaded, value, label, data, isLoaded])
}
