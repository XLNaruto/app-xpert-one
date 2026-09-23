import type { ComboboxOption } from '@/components/ui/combobox'
import type { LazyOptionSource } from '@/hooks/use-lazy-options'
import {
  usePagedSelect,
  type MasterSelectOptions,
  type PagedSelect,
} from '@/hooks/use-paged-select'
import { queryKeys } from '@/lib/query-keys'
import { BRANCH_SORT } from '../constants'
import { fetchBranches, fetchBranch } from '../api/branch-api'
import type { Branch } from '../types'

/** A branch as the option the dropdown shows. */
const toOption = (row: Branch): ComboboxOption => ({ label: row.branchName, value: String(row.id) })

/** Reads the one row behind a saved value the loaded pages don't cover. */
const SOURCE: LazyOptionSource = {
  key: (value) => queryKeys.branch.detail(Number(value)),
  fetch: async (value) => toOption(await fetchBranch(Number(value))),
}

export interface BranchSelectOptions extends MasterSelectOptions<Branch> {
  /** The tenant to list — the session's own company when left out. */
  companyId?: number
}

/**
 * The branches as a scroll-lazy, server-searched `<Combobox>` — spread the result
 * onto it. Pages load as the list is scrolled, so a form never pulls the whole
 * master to render one field.
 */
export function useBranchSelect({
  companyId,
  toOption: label = toOption,
  ...rest
}: BranchSelectOptions = {}): PagedSelect {
  return usePagedSelect({
    queryKey: (search) => queryKeys.branch.infinite(search, companyId),
    fetchPage: (params) => fetchBranches(params, companyId),
    toOption: label,
    source: SOURCE,
    // A picker reads A–Z, not the list screen's newest-first.
    sort: { sort: BRANCH_SORT.branchName, sortBy: 'asc' },
    ...rest,
  })
}
