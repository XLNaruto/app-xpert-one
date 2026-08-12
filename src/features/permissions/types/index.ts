/**
 * A permission code in `<resource>:<action>` form — `employees:read`,
 * `pf-rates:create`. Kept as a plain string so the API can add codes without a
 * client release.
 */
export type Permission = string

/**
 * What a screen declares it needs. Either an exact code (`employees:create`)
 * or a bare resource (`employees`), which matches any action the user holds on
 * that resource — see `holdsPermission` in `lib/permission-match.ts`. An array
 * is an ANY-of: holding one of them is enough.
 */
export type PermissionSpec = Permission | readonly Permission[]

/** One checkbox on a menu node — a single code with its display metadata. */
export interface PermissionAction {
  permission: Permission
  label: string
  /** Lucide icon name; absent when the catalog defines none. */
  icon?: string
  description?: string
  granted: boolean
  /**
   * The other codes this one does not work without — `Edit` needs the same row's
   * `View` (and its `List` where the row has one), a screen needs the `read` of
   * every section above it. Already transitive where it matters, so ticking
   * exactly this list is enough.
   *
   * The role builder maintains the closure itself: the API does NOT repair a
   * selection, it rejects an incomplete one with a 400 naming what's missing.
   */
  requires: Permission[]
}

/**
 * A node of the server-rendered menu tree (`modules`), pruned to what the user
 * holds. A node kept with no `actions` of its own is a heading, not a
 * navigable screen. Depth is open-ended — always walk `children`.
 */
export interface PermissionModule {
  /** Stable node key — `hr`, `calculate-salary`, `employee-leave`. */
  key: string
  label: string
  panel: 'employee' | 'user' | 'admin'
  panelLabel: string
  icon?: string
  /** Every code at or below this node, flattened. */
  permissions: Permission[]
  /** True only when EVERY code in `permissions` is held. */
  granted: boolean
  actions: PermissionAction[]
  children: PermissionModule[]
}

/** The application rights the account holds, resolved. */
export interface RoleAccess {
  web: boolean
  app: boolean
  talk: boolean
  attendance: boolean
}

/**
 * A company named on a role's reach. The API answers `{ id, company_name }`
 * rather than a bare id, so a chip is labelled without a second call.
 */
export interface CompanyRef {
  id: number
  name: string
}

/** One department a Talk grant reaches. */
export interface TalkDepartment {
  id: number
  name: string
}

/**
 * One Talk grant — a COMPANY, optionally narrowed to some of its departments.
 * There is one entry per company; an EMPTY `departments` means the WHOLE
 * company, every department present and future, never "none".
 */
export interface TalkGrant {
  companyId: number
  companyName: string
  departments: TalkDepartment[]
}

/** `GET /user/my-role` — the signed-in user's role, codes and menu. */
export interface MyRole {
  userId: number
  /** Null for the account owner, who holds no role row. */
  roleId: number | null
  roleName: string
  isOwner: boolean
  /**
   * Every code this login carries — the exact set the API's route policies
   * check, so anything absent here answers 403.
   */
  permissionCodes: Permission[]
  /** The same set as the sidebar tree. */
  modules: PermissionModule[]
  accessLevel: 'GLOBAL' | 'COMPANY'
  /** Named. Empty on `GLOBAL`, which means every company of the account. */
  companies: CompanyRef[]
  talkEnabled: boolean
  talkAccess: TalkGrant[]
  access: RoleAccess
}
