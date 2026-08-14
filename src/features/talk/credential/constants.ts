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
  email: '',
  password: '',
  confirmPassword: '',
  status: 'active',
  companyIds: [],
  departmentGrants: [],
}
