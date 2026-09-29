import type { ComboboxOption } from '@/components/ui/combobox'
import type { LazyOptionSource } from '@/hooks/use-lazy-options'
import {
  usePagedSelect,
  type MasterSelectOptions,
  type PagedSelect,
} from '@/hooks/use-paged-select'
import { queryKeys } from '@/lib/query-keys'
import { ROLE_SORT } from '../constants'
import { fetchRole, fetchRoles } from '../api/role-api'
import type { RoleListRow } from '../types'

/** A role as the option the dropdown shows. */
const toOption = (row: Pick<RoleListRow, 'id' | 'name'>): ComboboxOption => ({
  label: row.name,
  value: String(row.id),
})

/** Reads the one row behind a saved value the loaded pages don't cover. */
const SOURCE: LazyOptionSource = {
  key: (value) => queryKeys.role.detail(Number(value)),
  fetch: async (value) => toOption(await fetchRole(Number(value))),
}

/**
 * The session company's roles as a scroll-lazy, server-searched `<Combobox>` —
 * spread the result onto it.
 */
export function useRoleSelect({
  toOption: label = toOption,
  ...rest
}: MasterSelectOptions<RoleListRow> = {}): PagedSelect {
  return usePagedSelect({
    queryKey: (search) => queryKeys.role.infinite(search),
    fetchPage: (params) => fetchRoles(params),
    toOption: label,
    source: SOURCE,
    // A picker reads A–Z, not the list screen's newest-first.
    sort: { sort: ROLE_SORT.name, sortBy: 'asc' },
    ...rest,
  })
}
