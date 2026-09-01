import type { ComboboxOption } from '@/components/ui/combobox'
import type { TalkCredentialFormValues } from './schemas'

/**
 * The `sort` values `/user/talk-credentials` accepts. Sorting is server-side, so
 * a column is sortable only if it appears here — the list gives each of these
 * columns the API's field name as its column id, and marks the rest unsortable.
 */
export const TALK_CREDENTIAL_SORT = {
  email: 'email',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const

/**
 * Newest credential first. The endpoint's own default is the same, but an order
 * is still sent explicitly: an unpinned order can repeat or skip rows between
 * pages, and "who was given Talk recently" is the question this screen opens on.
 */
export const TALK_CREDENTIAL_DEFAULT_SORT = {
  id: TALK_CREDENTIAL_SORT.createdAt,
  desc: true,
}

/**
 * The 409 that means "ticked, but this employee has no panel password to copy".
 *
 * Employees sign into the employee app by phone OTP, so only an employee who
 * ALSO holds a panel account has a password to seed from — and nothing on the
 * client can tell which of the two an employee is. The form therefore issues
 * optimistically and matches this on the way back, re-opening the password box
 * rather than making the user untick and start again.
 */
export const NO_PANEL_PASSWORD_ERROR = /no panel password/i

/** The company filter's "no filter" value — every credential of the account. */
export const ALL_COMPANIES = ''

/** The two states a Talk login can be in, as the form's dropdown spells them. */
export const TALK_CREDENTIAL_STATUS_OPTIONS: ComboboxOption[] = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
]

/**
 * A fresh credential: active, for nobody yet, reaching nothing. Both reach lists
 * start empty because they're granted deliberately — a Talk login that reaches
 * no one is useless but harmless, one that reaches the whole account by accident
 * is not.
 */
export const EMPTY_TALK_CREDENTIAL_FORM: TalkCredentialFormValues = {
  employeeId: '',
  // The login is typed by default — copying the panel one is the deliberate
  // choice, and it can only be made once the employee above is picked.
  isSameAsPanelCreds: false,
  email: '',
  password: '',
  confirmPassword: '',
  status: 'active',
  companyIds: [],
  departmentGrants: [],
}
