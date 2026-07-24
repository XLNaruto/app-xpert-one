import type { ComboboxOption } from '@/components/ui/combobox'
import type { DepartmentFormValues } from './schemas'

/**
 * Branch choices for the Branch dropdown. Static for now — swap for a branch
 * master query once that feature exists.
 */
export const BRANCH_OPTIONS: ComboboxOption[] = [
  'Head Office',
  'Surat Branch',
  'Mumbai Branch',
  'Ahmedabad Branch',
  'Delhi Branch',
].map((b) => ({ label: b, value: b }))

/** Day-of-month choices (1–31) for the Month Start Date dropdown. */
export const MONTH_DAY_OPTIONS: ComboboxOption[] = Array.from({ length: 31 }, (_, i) => {
  const day = String(i + 1)
  return { label: day, value: day }
})

/** Blank form values for a new department. */
export const EMPTY_DEPARTMENT_FORM: DepartmentFormValues = {
  branch: '',
  departmentName: '',
  departmentCode: '',
  monthStartDate: '1',
}
