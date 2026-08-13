/**
 * Admin users — the module's public surface.
 *
 * Two screens: the user list, and the one create/edit form behind it. The reads
 * are exported for whatever needs to name a user next; cross-feature imports
 * come through here, never through a deep path.
 */
export { AdminUserListPage } from './pages/admin-user-list-page'
export { AdminUserCreatePage } from './pages/admin-user-create-page'

export { useAdminUsers, useAdminUser, useAssignableRoles } from './api/use-admin-users'
export {
  useCreateAdminUser,
  useUpdateAdminUser,
  useDeleteAdminUser,
} from './api/use-admin-user-mutations'

export { roleLabel } from './lib/admin-user-mappers'
export { ADMIN_USER_SORT, ADMIN_USER_DEFAULT_SORT } from './constants'

export type { AdminUser, AssignableRole } from './types'
export type { AdminUserStatus } from './schemas'
