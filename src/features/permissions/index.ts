export {
  useMyRole,
  usePermissions,
  useCan,
  useResourceAccess,
  type PermissionChecker,
  type ResourceAccess,
} from './api/use-permissions'
export { fetchMyRole } from './api/permissions-api'
export { Can } from './components/can'
export { requirePermission } from './lib/route-guard'
export { holdsPermission } from './lib/permission-match'
/**
 * The catalog node shape, shared with the role builder — `assignable-permissions`
 * and `GET /user/roles/:id` return the very same tree `my-role` does, so the
 * schema and its mapper are declared once, here.
 */
export { toPermissionModule } from './lib/permission-mappers'
export { permissionModuleSchema, permissionActionSchema } from './schemas'
export type {
  PermissionModuleResponse,
  PermissionActionResponse,
} from './schemas'
export { PERMISSIONS, ACCESS_CODES, ACTIONS } from './constants'
export type {
  MyRole,
  Permission,
  PermissionSpec,
  PermissionModule,
  PermissionAction,
  RoleAccess,
} from './types'
