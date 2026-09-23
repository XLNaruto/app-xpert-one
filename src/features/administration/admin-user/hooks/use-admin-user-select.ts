import type { ComboboxOption } from '@/components/ui/combobox'
import type { LazyOptionSource } from '@/hooks/use-lazy-options'
import {
  usePagedSelect,
  type MasterSelectOptions,
  type PagedSelect,
} from '@/hooks/use-paged-select'
import { queryKeys } from '@/lib/query-keys'
import { ADMIN_USER_SORT } from '../constants'
import { fetchAdminUsers, fetchAdminUser } from '../api/admin-user-api'
import type { AdminUser } from '../types'

/** A admin user as the option the dropdown shows. */
const toOption = (row: AdminUser): ComboboxOption => ({ label: row.name, value: String(row.id) })

/** Reads the one row behind a saved value the loaded pages don't cover. */
const SOURCE: LazyOptionSource = {
  key: (value) => queryKeys.adminUser.detail(Number(value)),
  fetch: async (value) => toOption(await fetchAdminUser(Number(value))),
}

export interface AdminUserSelectOptions extends MasterSelectOptions<AdminUser> {
  /** The tenant to list — the session's own company when left out. */
  companyId?: number
}

/**
 * The admin users as a scroll-lazy, server-searched `<Combobox>` — spread the result
 * onto it. Pages load as the list is scrolled, so a form never pulls the whole
 * master to render one field.
 */
export function useAdminUserSelect({
  companyId,
  toOption: label = toOption,
  ...rest
}: AdminUserSelectOptions = {}): PagedSelect {
  return usePagedSelect({
    queryKey: (search) => queryKeys.adminUser.infinite(search, companyId),
    fetchPage: (params) => fetchAdminUsers(params, companyId),
    toOption: label,
    source: SOURCE,
    // A picker reads A–Z, not the list screen's newest-first.
    sort: { sort: ADMIN_USER_SORT.name, sortBy: 'asc' },
    ...rest,
  })
}
