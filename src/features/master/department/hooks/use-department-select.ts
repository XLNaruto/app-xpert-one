import type { ComboboxOption } from '@/components/ui/combobox'
import type { LazyOptionSource } from '@/hooks/use-lazy-options'
import {
  usePagedSelect,
  type MasterSelectOptions,
  type PagedSelect,
} from '@/hooks/use-paged-select'
import { queryKeys } from '@/lib/query-keys'
import { DEPARTMENT_SORT } from '../constants'
import { fetchDepartments, fetchDepartment } from '../api/department-api'
import type { Department } from '../types'

/** A department as the option the dropdown shows. */
const toOption = (row: Department): ComboboxOption => ({ label: row.departmentName, value: String(row.id) })

/** Reads the one row behind a saved value the loaded pages don't cover. */
const SOURCE: LazyOptionSource = {
  key: (value) => queryKeys.department.detail(Number(value)),
  fetch: async (value) => toOption(await fetchDepartment(Number(value))),
}

export interface DepartmentSelectOptions extends MasterSelectOptions<Department> {
  /** The tenant to list — the session's own company when left out. */
  companyId?: number
}

/**
 * The departments as a scroll-lazy, server-searched `<Combobox>` — spread the result
 * onto it. Pages load as the list is scrolled, so a form never pulls the whole
 * master to render one field.
 */
export function useDepartmentSelect({
  companyId,
  toOption: label = toOption,
  ...rest
}: DepartmentSelectOptions = {}): PagedSelect {
  return usePagedSelect({
    queryKey: (search) => queryKeys.department.infinite(search, companyId),
    fetchPage: (params) => fetchDepartments(params, companyId),
    toOption: label,
    source: SOURCE,
    // A picker reads A–Z, not the list screen's newest-first.
    sort: { sort: DEPARTMENT_SORT.departmentName, sortBy: 'asc' },
    ...rest,
  })
}
