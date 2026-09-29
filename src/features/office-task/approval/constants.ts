import { shiftIso, todayIso } from '@/features/office-task/common'
import type { ApprovalFilters, ApprovalTab } from './types'

export const APPROVAL_SORT = {
  date: 'date',
  employeeName: 'employee_name',
} as const

export const APPROVAL_DEFAULT_SORT = { id: APPROVAL_SORT.date, desc: true }

export const APPROVAL_TABS: { value: ApprovalTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'awaiting', label: 'Awaiting' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

/** The last seven days, awaiting first — where the work to answer sits. */
export const defaultApprovalFilters = (): ApprovalFilters => ({
  from: shiftIso(todayIso(), -6),
  to: todayIso(),
  departmentId: '',
  employeeId: '',
  userId: '',
  tab: 'awaiting',
})
