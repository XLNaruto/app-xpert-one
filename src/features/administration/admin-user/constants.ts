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
 * A fresh user: active, with no role picked. Nothing is granted by default —
 * the role decides everything, so it has to be chosen deliberately.
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
}
