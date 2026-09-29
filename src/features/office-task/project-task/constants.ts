import type { ComboboxOption } from '@/components/ui/combobox'
import { todayIso } from '@/features/office-task/common'
import type { BulkEditValues, ProjectTaskFormValues } from './schemas'

export const PROJECT_TASK_SORT = {
  task: 'task',
  startDate: 'start_date',
  deadline: 'deadline',
  createdAt: 'created_at',
} as const

export const PROJECT_TASK_DEFAULT_SORT = { id: PROJECT_TASK_SORT.deadline, desc: false }

/** The overall statuses a task can roll up to — the list's Status filter. */
export const PROJECT_STATUS_FILTER: ComboboxOption[] = [
  { label: 'All statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
]

export const PROJECT_PRIORITY_FILTER: ComboboxOption[] = [
  { label: 'All priorities', value: 'all' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
]

export const emptyProjectTaskForm = (): ProjectTaskFormValues => ({
  pickBy: 'designation',
  designationId: '',
  roleId: '',
  employeeIds: [],
  task: '',
  priority: 'medium',
  description: '',
  updatesPerDay: '1',
  startDate: todayIso(),
  deadline: '',
  photoRequired: false,
  needsVerification: false,
})

export const EMPTY_BULK_EDIT: BulkEditValues = { priority: '', startDate: '', deadline: '' }
