/**
 * Roles & Permissions — the module's public surface.
 *
 * Two screens: the role list, and the one create/edit builder behind it. The
 * reads are exported for whatever assigns a role to a user next; cross-feature
 * imports come through here, never through a deep path.
 */
export { RoleListPage } from './pages/role-list-page'
export { RoleCreatePage } from './pages/role-create-page'

export { useRoles, useRole, useAssignablePermissions } from './api/use-roles'
export { useCreateRole, useUpdateRole, useDeleteRole } from './api/use-role-mutations'

export { ROLE_SORT, ROLE_DEFAULT_SORT } from './constants'

export type { Role, RoleListRow } from './types'
