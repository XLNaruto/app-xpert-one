import type { ComboboxOption } from '@/components/ui/combobox'
import type { LazyOptionSource } from '@/hooks/use-lazy-options'
import {
  usePagedSelect,
  type MasterSelectOptions,
  type PagedSelect,
} from '@/hooks/use-paged-select'
import { queryKeys } from '@/lib/query-keys'
import { OFFICE_ADDRESS_SORT } from '../constants'
import { fetchOfficeAddress, fetchOfficeAddresses } from '../api/office-address-api'
import { officeAddressLabel } from '../lib/office-address-mappers'
import type { OfficeAddress, OfficeFor } from '../types'

/** An office as the option the dropdown shows. */
const toOption = (row: OfficeAddress): ComboboxOption => ({
  label: officeAddressLabel(row),
  value: String(row.id),
})

/** Reads the one office behind a saved value the loaded pages don't cover. */
const SOURCE: LazyOptionSource = {
  key: (value) => queryKeys.officeAddress.detail(Number(value)),
  fetch: async (value) => toOption(await fetchOfficeAddress(Number(value))),
}

export interface OfficeAddressSelectOptions extends MasterSelectOptions<OfficeAddress> {
  /** The statutory body whose offices to list — the API's `office_for`. */
  officeFor: OfficeFor
}

/**
 * One body's offices as a scroll-lazy, server-searched `<Combobox>` — spread the
 * result onto it. Pages load as the list is scrolled, so a form never pulls the
 * whole master to render one field.
 */
export function useOfficeAddressSelect({
  officeFor,
  toOption: label = toOption,
  ...rest
}: OfficeAddressSelectOptions): PagedSelect {
  return usePagedSelect({
    queryKey: (search) => queryKeys.officeAddress.infinite(officeFor, search),
    fetchPage: (params) => fetchOfficeAddresses(officeFor, params),
    toOption: label,
    source: SOURCE,
    // A picker reads A–Z, not the list screen's newest-first.
    sort: { sort: OFFICE_ADDRESS_SORT.officeName, sortBy: 'asc' },
    ...rest,
  })
}
