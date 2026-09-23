import type { ComboboxOption } from '@/components/ui/combobox'
import type { LazyOptionSource } from '@/hooks/use-lazy-options'
import {
  usePagedSelect,
  type MasterSelectOptions,
  type PagedSelect,
} from '@/hooks/use-paged-select'
import { queryKeys } from '@/lib/query-keys'
import { DESIGNATION_SORT } from '../constants'
import { fetchDesignations, fetchDesignation } from '../api/designation-api'
import type { Designation } from '../types'

/** A designation as the option the dropdown shows. */
const toOption = (row: Designation): ComboboxOption => ({ label: row.designationName, value: String(row.id) })

/** Reads the one row behind a saved value the loaded pages don't cover. */
const SOURCE: LazyOptionSource = {
  key: (value) => queryKeys.designation.detail(Number(value)),
  fetch: async (value) => toOption(await fetchDesignation(Number(value))),
}

export interface DesignationSelectOptions extends MasterSelectOptions<Designation> {
  /** The tenant to list — the session's own company when left out. */
  companyId?: number
}

/**
 * The designations as a scroll-lazy, server-searched `<Combobox>` — spread the result
 * onto it. Pages load as the list is scrolled, so a form never pulls the whole
 * master to render one field.
 */
export function useDesignationSelect({
  companyId,
  toOption: label = toOption,
  ...rest
}: DesignationSelectOptions = {}): PagedSelect {
  return usePagedSelect({
    queryKey: (search) => queryKeys.designation.infinite(search, companyId),
    fetchPage: (params) => fetchDesignations(params, companyId),
    toOption: label,
    source: SOURCE,
    // A picker reads A–Z, not the list screen's newest-first.
    sort: { sort: DESIGNATION_SORT.designationName, sortBy: 'asc' },
    ...rest,
  })
}
