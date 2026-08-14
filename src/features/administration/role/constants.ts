import type { RoleFormValues } from './schemas'

/**
 * The `sort` values `/user/roles` accepts. Sorting is server-side, so a column is
 * sortable only if it appears here — the list gives each of these columns the
 * API's field name as its column id, and marks the rest unsortable.
 */
export const ROLE_SORT = {
  name: 'name',
  createdAt: 'created_at',
} as const

/** Newest role first — the order the list opens in and reverts to. */
export const ROLE_DEFAULT_SORT = {
  id: ROLE_SORT.createdAt,
  desc: true,
}

/**
 * A fresh role: scoped to the company it's authored under, no permissions.
 * Nothing is granted by default — a role starts at zero and the author ticks up
 * from there.
 *
 * There is no scope or Talk here: how far a login reaches is a property of the
 * PERSON, set on the Admin User form.
 */
export const EMPTY_ROLE_FORM: RoleFormValues = {
  name: '',
  permissionCodes: [],
}
