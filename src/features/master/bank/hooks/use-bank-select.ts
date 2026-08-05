import { useMemo, useState } from 'react'
import type { ComboboxOption } from '@/components/ui/combobox'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useLazyOptions, type LazyOptionSource } from '@/hooks/use-lazy-options'
import { queryKeys } from '@/lib/query-keys'
import { fetchBank } from '../api/bank-api'
import { useBanksInfinite } from '../api/use-banks-infinite'

/** Everything a lazy-loading `<Combobox>` needs, ready to spread onto it. */
export interface BankSelect {
  options: ComboboxOption[]
  loading: boolean
  onScrollEnd: () => void
  onSearchChange: (query: string) => void
}

interface UseBankSelectOptions {
  /**
   * The bank already on the record, as `{ value, label }` — the value being a
   * bank id as a string. A saved bank is rarely on the first page, and
   * `<Combobox>` reads its trigger label out of `options`, so the selection is
   * merged in until the page holding it loads. Without a `label` the one row is
   * read by id in the background.
   */
  selected?: { value: string; label?: string }
}

/** Reads the one bank behind a selection the loaded pages don't cover. */
const BANK_SOURCE: LazyOptionSource = {
  key: (value) => queryKeys.bank.detail(Number(value)),
  fetch: async (value) => {
    const bank = await fetchBank(Number(value))
    return { value: String(bank.id), label: bank.bankName }
  },
}

/**
 * Adapts the paged, server-searched bank master into `<Combobox>` props. The
 * search box value is debounced and sent to the API, and the next page loads when
 * the option list is scrolled to its end — so the KYC form never pulls the whole
 * master just to render one field.
 */
export function useBankSelect({ selected }: UseBankSelectOptions = {}): BankSelect {
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search, 300)
  const query = useBanksInfinite(debounced.trim() || undefined)

  const loaded = useMemo<ComboboxOption[]>(
    () =>
      (query.data?.pages ?? []).flatMap((page) =>
        page.items.map((bank) => ({ label: bank.bankName, value: String(bank.id) })),
      ),
    [query.data],
  )

  const options = useLazyOptions({
    loaded,
    value: selected?.value,
    label: selected?.label,
    source: BANK_SOURCE,
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
