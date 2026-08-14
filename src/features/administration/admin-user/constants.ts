import type { ComboboxOption } from '@/components/ui/combobox'
import type { AdminUserFormValues } from './schemas'

/**
 * The `sort` values `/user/admin-users` accepts. Sorting is server-side, so a
 * column is sortable only if it appears here — the list gives each of these
 * columns the API's field name as its column id, and marks the rest unsortable.
 */
export const ADMIN_USER_SORT = {
  name: 'name',
  email: 'email',
  createdAt: 'created_at',
} as const

/**
 * Newest user first. The endpoint's own default is name A→Z, but an order is
 * still sent explicitly: an unpinned order can repeat or skip rows between
 * pages, and "who was added recently" is the question this screen opens on.
 */
export const ADMIN_USER_DEFAULT_SORT = {
  id: ADMIN_USER_SORT.createdAt,
  desc: true,
}

/** The company filter's "no filter" value — every user of the account. */
export const ALL_COMPANIES = ''

/** The two states a login can be in, as the form's dropdown spells them. */
export const ADMIN_USER_STATUS_OPTIONS: ComboboxOption[] = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
]

/**
 * A fresh user: active, with no role picked and no reach beyond the companies
 * that get ticked. Nothing is granted by default — the role decides what they
 * may do and the scope below decides where, so both are chosen deliberately.
 */
export const EMPTY_ADMIN_USER_FORM: AdminUserFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  mobileNumber: '',
  roleId: '',
  password: '',
  confirmPassword: '',
  status: 'active',
  accessLevel: 'COMPANY',
  companyIds: [],
  talkEnabled: false,
  talkAccess: [],
}

/** The two reaches a user can have, as the scope selector spells them. */
export const ACCESS_LEVEL_OPTIONS = [
  {
    value: 'COMPANY' as const,
    label: 'Selected companies',
    description: 'Only the companies ticked below.',
  },
  {
    value: 'GLOBAL' as const,
    label: 'All companies',
    description: 'Every company of the account, including ones added later.',
  },
]

/**
 * What an empty department selection on a Talk grant means — the whole company,
 * every department present and future, which is how the endpoint reads it too.
 */
export const WHOLE_COMPANY_LABEL = 'Whole company'
