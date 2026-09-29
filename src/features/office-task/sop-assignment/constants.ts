import type { ComboboxOption } from '@/components/ui/combobox'

export const SOP_ASSIGNMENT_SORT = {
  employeeName: 'employee_name',
  templateName: 'template_name',
  effectiveFrom: 'effective_from',
  createdAt: 'created_at',
} as const

export const SOP_ASSIGNMENT_DEFAULT_SORT = { id: SOP_ASSIGNMENT_SORT.createdAt, desc: true }

export const ASSIGNMENT_STATUS_OPTIONS: ComboboxOption[] = [
  { label: 'All statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Stopped', value: 'stopped' },
]
