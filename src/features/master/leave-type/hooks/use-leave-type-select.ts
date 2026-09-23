import type { ComboboxOption } from '@/components/ui/combobox'
import type { LazyOptionSource } from '@/hooks/use-lazy-options'
import {
  usePagedSelect,
  type MasterSelectOptions,
  type PagedSelect,
} from '@/hooks/use-paged-select'
import { queryKeys } from '@/lib/query-keys'
import { LEAVE_TYPE_SORT } from '../constants'
import { fetchLeaveTypes, fetchLeaveType } from '../api/leave-type-api'
import type { LeaveType } from '../types'

/** A leave type as the option the dropdown shows. */
const toOption = (row: LeaveType): ComboboxOption => ({ label: `${row.leaveName} (${row.shortName})`, value: String(row.id) })

/** Reads the one row behind a saved value the loaded pages don't cover. */
const SOURCE: LazyOptionSource = {
  key: (value) => queryKeys.leaveType.detail(Number(value)),
  fetch: async (value) => toOption(await fetchLeaveType(Number(value))),
}

/**
 * The leave types as a scroll-lazy, server-searched `<Combobox>` — spread the result
 * onto it. Pages load as the list is scrolled, so a form never pulls the whole
 * master to render one field.
 */
export function useLeaveTypeSelect({
  toOption: label = toOption,
  ...rest
}: MasterSelectOptions<LeaveType> = {}): PagedSelect {
  return usePagedSelect({
    queryKey: (search) => queryKeys.leaveType.infinite(search),
    fetchPage: (params) => fetchLeaveTypes(params),
    toOption: label,
    source: SOURCE,
    // A picker reads A–Z, not the list screen's newest-first.
    sort: { sort: LEAVE_TYPE_SORT.leaveName, sortBy: 'asc' },
    ...rest,
  })
}
