import type { ComboboxOption } from '@/components/ui/combobox'
import type { LazyOptionSource } from '@/hooks/use-lazy-options'
import {
  usePagedSelect,
  type MasterSelectOptions,
  type PagedSelect,
} from '@/hooks/use-paged-select'
import { queryKeys } from '@/lib/query-keys'
import { fetchShifts, fetchShift } from '../api/shift-api'
import { shiftOptions } from '../lib/shift-mappers'
import type { Shift } from '../types'

/** A shift as the option the dropdown shows. */
const toOption = (row: Shift): ComboboxOption => shiftOptions([row])[0]

/** Reads the one row behind a saved value the loaded pages don't cover. */
const SOURCE: LazyOptionSource = {
  key: (value) => queryKeys.shift.detail(Number(value)),
  fetch: async (value) => toOption(await fetchShift(Number(value))),
}

export interface ShiftSelectOptions extends MasterSelectOptions<Shift> {
  /** The tenant to list — the session's own company when left out. */
  companyId?: number
}

/**
 * The shifts as a scroll-lazy, server-searched `<Combobox>` — spread the result
 * onto it. Pages load as the list is scrolled, so a form never pulls the whole
 * master to render one field.
 */
export function useShiftSelect({
  companyId,
  toOption: label = toOption,
  ...rest
}: ShiftSelectOptions = {}): PagedSelect {
  return usePagedSelect({
    queryKey: (search) => queryKeys.shift.infinite(search, companyId),
    fetchPage: (params) => fetchShifts(params, companyId),
    toOption: label,
    source: SOURCE,
    ...rest,
  })
}
