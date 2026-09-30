import { toCompanyRef, toTalkGrant } from '@/features/permissions'
import type { EmployeePickerEntry } from '@/features/hr/employee'
import type {
  AdminUserFormValues,
  AdminUserPayload,
  AdminUserResponse,
  AdminUserStatus,
  AdminUserUpdatePayload,
  AssignableRoleResponse,
  TalkAccessPayload,
} from '../schemas'
import type { AdminUser, AssignableRole } from '../types'

/** Anything the API doesn't call `inactive` is a working login. */
function toStatus(status: string): AdminUserStatus {
  return status === 'inactive' ? 'inactive' : 'active'
}

/**
 * One user, snake_case → camelCase. The audit block only comes back on the
 * list, so it defaults the house way and a detail read simply has none.
 *
 * The reach goes the other way: a LIST row carries `access_level` and
 * `talk_enabled` alone, so `companies` and `talkAccess` land empty there. Under
 * `GLOBAL` an empty `companies` means every company anyway — never read it as
 * "none" without checking `accessLevel` first.
 */
export function toAdminUser(response: AdminUserResponse): AdminUser {
  return {
    id: response.id,
    firstName: response.first_name,
    lastName: response.last_name,
    name: response.name,
    email: response.email,
    mobileNumber: response.mobile_number ?? null,
    employeeId: response.employee_id ?? null,
    roleId: response.role_id ?? null,
    roleName: response.role_name ?? null,
    companyId: response.company_id ?? null,
    isOwner: response.is_owner,
    status: toStatus(response.status),
    accessLevel: response.access_level,
    companies: response.company_ids.map(toCompanyRef),
    talkEnabled: response.talk_enabled,
    talkAccess: response.talk_access.map(toTalkGrant),
    sessionRevoked: response.session_revoked ?? undefined,
    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at ?? '',
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/**
 * The three identity fields the endpoint still requires, taken from the picked
 * employee instead of being typed.
 *
 * An employee carries ONE name, so it is split at the first space: the first
 * word is the first name and the rest the last name. A one-word name has
 * nothing to split and the endpoint refuses an empty last name, so the word is
 * used for both. The mobile goes up as digits only — how the endpoint compares
 * it against every other identity on the platform.
 */
export function employeeIdentity(employee: EmployeePickerEntry) {
  const [first = '', ...rest] = employee.name.trim().split(/\s+/)
  return {
    firstName: first,
    lastName: rest.join(' ') || first,
    mobileNumber: (employee.mobileNumber ?? '').replace(/\D/g, ''),
  }
}

/** One row of the role dropdown. */
export function toAssignableRole(response: AssignableRoleResponse): AssignableRole {
  return {
    id: response.id,
    name: response.name,
    companyId: response.company_id,
  }
}

/**
 * The reach half of the body, shared by create and update.
 *
 * The two switches decide what travels: under `GLOBAL` the companies are stored
 * empty whatever the form last held, and with Talk off so are the grants — so
 * they're cleared here rather than sent to be normalised away. What's posted is
 * then exactly what comes back.
 */
function reachPayload(values: AdminUserFormValues) {
  return {
    access_level: values.accessLevel,
    company_ids: values.accessLevel === 'GLOBAL' ? [] : [...new Set(values.companyIds)],
    talk_enabled: values.talkEnabled,
    // One entry per company, its departments nested — an empty list is "the
    // whole company", which is what a grant with nothing narrowed means.
    talk_access: values.talkEnabled
      ? values.talkAccess.map<TalkAccessPayload>((grant) => ({
          company_id: Number(grant.companyId),
          department_ids: [...new Set(grant.departmentIds.map(Number))],
        }))
      : [],
  }
}

/**
 * Validated form values → the create body.
 *
 * No `company_id`: the user's company is taken from the role, and sending one
 * is rejected. The mobile number goes up as digits only, which is how the
 * endpoint compares it against every other identity on the platform.
 */
export function adminUserToPayload(values: AdminUserFormValues): AdminUserPayload {
  return {
    employee_id: Number(values.employeeId),
    first_name: values.firstName.trim(),
    last_name: values.lastName.trim(),
    email: values.email.trim(),
    mobile_number: values.mobileNumber.trim(),
    role_id: Number(values.roleId),
    password: values.password,
    ...reachPayload(values),
  }
}

/**
 * Validated form values → the PATCH body, which is a genuine partial.
 *
 * Three keys are omitted rather than sent:
 *
 * - **`employee_id`** unless it was re-pointed — the link can't be cleared, so
 *   an unchanged (or absent) pick has nothing to say.
 * - **`password`** when the box was left blank — that's "keep the current
 *   credential", and sending an empty string would be a reset to nothing.
 * - **`role_id`** when the pick still matches what's stored. An unchanged role
 *   has nothing to say, and it keeps two refusals off the wire: an owner (who
 *   holds none) and the caller editing their OWN row, which the API rejects
 *   outright — see `useAdminUserForm`, where the field is locked for that case.
 *
 * The four reach keys always travel TOGETHER, because any one of them
 * re-validates all four server-side — sending a lone `talk_enabled` would have
 * the stored `access_level` and `company_ids` re-checked against it.
 */
export function adminUserToUpdatePayload(
  values: AdminUserFormValues,
  record: AdminUser,
): AdminUserUpdatePayload {
  const roleId = Number(values.roleId)
  const employeeId = Number(values.employeeId)

  return {
    first_name: values.firstName.trim(),
    last_name: values.lastName.trim(),
    email: values.email.trim(),
    mobile_number: values.mobileNumber.trim(),
    status: values.status,
    ...reachPayload(values),
    ...(employeeId && employeeId !== record.employeeId ? { employee_id: employeeId } : {}),
    ...(roleId && roleId !== record.roleId ? { role_id: roleId } : {}),
    ...(values.password ? { password: values.password } : {}),
  }
}

/** Hydrate the edit form from a stored record. The password boxes start empty. */
export function adminUserToFormValues(user: AdminUser): AdminUserFormValues {
  return {
    employeeId: user.employeeId ? String(user.employeeId) : '',
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    mobileNumber: user.mobileNumber ?? '',
    roleId: user.roleId ? String(user.roleId) : '',
    password: '',
    confirmPassword: '',
    status: user.status,
    accessLevel: user.accessLevel,
    companyIds: user.companies.map((company) => company.id),
    talkEnabled: user.talkEnabled,
    talkAccess: user.talkAccess.map((grant) => ({
      companyId: String(grant.companyId),
      departmentIds: grant.departments.map((department) => String(department.id)),
    })),
  }
}

/** What the Role column says — an owner holds none, and that's the point. */
export function roleLabel(user: Pick<AdminUser, 'isOwner' | 'roleName'>): string {
  if (user.isOwner) return 'Account owner'
  return user.roleName ?? '—'
}

/**
 * How far a user reaches, as the list column says it. `GLOBAL` is every company
 * of the account, present and future — which is why the empty company list that
 * comes with it never reads as "none".
 */
export function accessLevelLabel(user: Pick<AdminUser, 'accessLevel'>): string {
  return user.accessLevel === 'GLOBAL' ? 'All companies' : 'Selected companies'
}
