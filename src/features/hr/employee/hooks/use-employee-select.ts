import { usePagedSelect, type PagedSelect } from '@/hooks/use-paged-select'
import type { LazyOptionSource } from '@/hooks/use-lazy-options'
import { queryKeys } from '@/lib/query-keys'
import { fetchEmployee, fetchEmployees } from '../api/employee-api'
import { EMPLOYEE_SORT } from '../constants'
import { employeeOptions } from '../lib/employee-mappers'
import type { Employee } from '../types'

/** Everything a lazy-loading employee `<Combobox>` needs, ready to spread onto it. */
export type EmployeeSelect = PagedSelect

interface UseEmployeeSelectOptions {
  /** What the field currently holds — one id or several, as strings. */
  selected?: string | string[]
  /** The saved employee's label, when the record carries it. */
  selectedLabel?: string
  /** Hold the read back until the field is actually on screen. */
  enabled?: boolean
}

/** Reads the one employee behind a saved value the loaded pages don't cover. */
const EMPLOYEE_SOURCE: LazyOptionSource = {
  key: (value) => queryKeys.employee.detail(Number(value)),
  fetch: async (value) => employeeOptions([await fetchEmployee(Number(value))])[0],
}

const toOption = (employee: Employee) => employeeOptions([employee])[0]

/**
 * The active company's employees as a scroll-lazy, server-searched `<Combobox>`,
 * by name — so a filter or form never pulls the whole roster to render one field.
 */
export function useEmployeeSelect({
  selected,
  selectedLabel,
  enabled,
}: UseEmployeeSelectOptions = {}): EmployeeSelect {
  return usePagedSelect({
    queryKey: queryKeys.employee.infinite,
    fetchPage: fetchEmployees,
    toOption,
    sort: { sort: EMPLOYEE_SORT.name, sortBy: 'asc' },
    selected,
    selectedLabel,
    source: EMPLOYEE_SOURCE,
    enabled,
  })
}
