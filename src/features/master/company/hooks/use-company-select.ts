import type { ComboboxOption } from '@/components/ui/combobox'
import type { LazyOptionSource } from '@/hooks/use-lazy-options'
import {
  usePagedSelect,
  type MasterSelectOptions,
  type PagedSelect,
} from '@/hooks/use-paged-select'
import { queryKeys } from '@/lib/query-keys'
import { COMPANY_SORT } from '../constants'
import { fetchCompanies, fetchCompany } from '../api/company-api'
import type { Company } from '../types'

/** A company as the option the dropdown shows. */
const toOption = (row: Company): ComboboxOption => ({ label: row.companyName, value: String(row.id) })

/** Reads the one row behind a saved value the loaded pages don't cover. */
const SOURCE: LazyOptionSource = {
  key: (value) => queryKeys.company.detail(Number(value)),
  fetch: async (value) => toOption(await fetchCompany(Number(value))),
}

/**
 * The companies as a scroll-lazy, server-searched `<Combobox>` — spread the result
 * onto it. Pages load as the list is scrolled, so a form never pulls the whole
 * master to render one field.
 */
export function useCompanySelect({
  toOption: label = toOption,
  ...rest
}: MasterSelectOptions<Company> = {}): PagedSelect {
  return usePagedSelect({
    queryKey: (search) => queryKeys.company.infinite(search),
    fetchPage: (params) => fetchCompanies(params),
    toOption: label,
    source: SOURCE,
    // A picker reads A–Z, not the list screen's newest-first.
    sort: { sort: COMPANY_SORT.companyName, sortBy: 'asc' },
    ...rest,
  })
}
