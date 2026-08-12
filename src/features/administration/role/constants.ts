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
 * A fresh role: scoped to the company it's authored under, no permissions, no
 * Talk. Nothing is granted by default — a role starts at zero and the author
 * ticks up from there.
 */
export const EMPTY_ROLE_FORM: RoleFormValues = {
  name: '',
  permissionCodes: [],
  accessLevel: 'COMPANY',
  companyIds: [],
  talkEnabled: false,
  talkAccess: [],
}

/** The two reaches a role can have, as the scope selector spells them. */
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
