import type { ComboboxOption } from '@/components/ui/combobox'
import type { LazyOptionSource } from '@/hooks/use-lazy-options'
import {
  usePagedSelect,
  type MasterSelectOptions,
  type PagedSelect,
} from '@/hooks/use-paged-select'
import { queryKeys } from '@/lib/query-keys'
import { WEEKOFF_POLICY_SORT } from '../constants'
import { fetchWeekoffPolicies, fetchWeekoffPolicy } from '../api/weekoff-policy-api'
import { weekoffPolicyOptions } from '../lib/weekoff-policy-mappers'
import type { WeekoffPolicy } from '../types'

/** A weekoff policy as the option the dropdown shows. */
const toOption = (row: WeekoffPolicy): ComboboxOption => weekoffPolicyOptions([row])[0]

/** Reads the one row behind a saved value the loaded pages don't cover. */
const SOURCE: LazyOptionSource = {
  key: (value) => queryKeys.weekoffPolicy.detail(Number(value)),
  fetch: async (value) => toOption(await fetchWeekoffPolicy(Number(value))),
}

export interface WeekoffPolicySelectOptions extends MasterSelectOptions<WeekoffPolicy> {
  /** The tenant to list — the session's own company when left out. */
  companyId?: number
}

/**
 * The week-off policies as a scroll-lazy, server-searched `<Combobox>` — spread the result
 * onto it. Pages load as the list is scrolled, so a form never pulls the whole
 * master to render one field.
 */
export function useWeekoffPolicySelect({
  companyId,
  toOption: label = toOption,
  ...rest
}: WeekoffPolicySelectOptions = {}): PagedSelect {
  return usePagedSelect({
    queryKey: (search) => queryKeys.weekoffPolicy.infinite(search, companyId),
    fetchPage: (params) => fetchWeekoffPolicies(params, companyId),
    toOption: label,
    source: SOURCE,
    // A picker reads A–Z, not the list screen's newest-first.
    sort: { sort: WEEKOFF_POLICY_SORT.name, sortBy: 'asc' },
    ...rest,
  })
}
