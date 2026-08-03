import type { ComboboxOption } from '@/components/ui/combobox'
import type { DepartmentFormValues } from './schemas'

/**
 * The `sort` values `/user/departments` accepts. Sorting is server-side, so a
 * column is sortable only if it appears here — the list gives each of these
 * columns the API's field name as its column id, and marks the rest unsortable.
 */
export const DEPARTMENT_SORT = {
  departmentName: 'name',
  departmentCode: 'code',
  createdAt: 'created_at',
} as const

/**
 * Newest department first — the order the list opens in and reverts to. This is
 * not the endpoint's own default (name A→Z), so it's always sent.
 */
export const DEPARTMENT_DEFAULT_SORT = { id: DEPARTMENT_SORT.createdAt, desc: true }

/** Day-of-month choices (1–31) for the Month Start Date dropdown. */
export const MONTH_DAY_OPTIONS: ComboboxOption[] = Array.from({ length: 31 }, (_, i) => {
  const day = String(i + 1)
  return { label: day, value: day }
})

/** Blank form values for a new department. */
export const EMPTY_DEPARTMENT_FORM: DepartmentFormValues = {
  branchId: '',
  departmentName: '',
  monthStartDay: '1',
}
