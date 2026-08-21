import type { ComboboxOption } from '@/components/ui/combobox'
import type { LeaveFormValues } from './schemas'

/**
 * The `sort` values `/user/employee-leaves` accepts. Sorting is server-side, so a
 * column is sortable only if it appears here: the list gives each of these the
 * API's field name as its column id and marks every other column unsortable.
 */
export const LEAVE_SORT = {
  employeeName: 'employee_name',
  fromDate: 'from_date',
  toDate: 'to_date',
  fromTime: 'from_time',
  toTime: 'to_time',
  payType: 'pay_type',
  leaveType: 'leave_type',
  duration: 'duration',
  status: 'status',
} as const

/** Newest leave first — the order the register opens in. */
export const LEAVE_DEFAULT_SORT = { id: LEAVE_SORT.fromDate, desc: true }

export const LEAVE_DURATION_OPTIONS: ComboboxOption[] = [
  { label: 'Full Day', value: 'FULL_DAY' },
  { label: 'Half Day', value: 'HALF_DAY' },
]

export const LEAVE_PAY_TYPE_OPTIONS: ComboboxOption[] = [
  { label: 'Paid', value: 'PAID' },
  { label: 'Unpaid', value: 'UNPAID' },
]

/** Status filter on the leave register — `''` is every status. */
export const LEAVE_STATUS_FILTER_OPTIONS: ComboboxOption[] = [
  { label: 'All statuses', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
]

/**
 * The register's tabs. `MINE` is `pending_with_me=true`, which implies
 * `status=PENDING` — the leaves this user is the one to answer.
 *
 * It sits BESIDE the status tabs rather than replacing them, because visibility
 * is not routing: the plain list is unchanged, and an owner goes on seeing every
 * company's rows whether or not any hierarchy user can.
 */
export const LEAVE_TABS = [
  { value: '', label: 'All statuses' },
  { value: 'MINE', label: 'Pending with me' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
] as const

/** The tab value that means "my own queue" rather than a status. */
export const LEAVE_TAB_MINE = 'MINE'

export const EMPTY_LEAVE_FORM: LeaveFormValues = {
  employeeId: '',
  leaveTypeId: '',
  fromDate: '',
  toDate: '',
  duration: 'FULL_DAY',
  fromTime: '',
  toTime: '',
  payType: 'PAID',
  status: 'APPROVED',
  leaveReason: '',
}
