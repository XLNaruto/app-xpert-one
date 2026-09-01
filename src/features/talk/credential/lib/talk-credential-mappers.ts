import type {
  DepartmentGrantFormValues,
  TalkCredentialFormValues,
  TalkCredentialPayload,
  TalkCredentialResponse,
  TalkCredentialStatus,
  TalkCredentialUpdatePayload,
} from '../schemas'
import type { TalkCredential } from '../types'

/** Anything the API doesn't call `inactive` is a working login. */
function toStatus(status: string): TalkCredentialStatus {
  return status === 'inactive' ? 'inactive' : 'active'
}

/**
 * One credential, snake_case → camelCase. The audit block comes back on the LIST
 * and the named reach on the DETAIL read, so each defaults where the other
 * answers — a missing half is a narrower record, not missing data.
 *
 * An empty `companies` / `departments` on a list row therefore never reads as
 * "reaches nothing"; only the detail read can say that.
 */
export function toTalkCredential(response: TalkCredentialResponse): TalkCredential {
  return {
    id: response.id,
    employeeId: response.employee_id ?? null,
    employeeName: response.employee_name ?? null,
    email: response.email,
    status: toStatus(response.status),
    isSameAsPanelCreds: response.is_same_as_panel_creds,
    lastLoginAt: response.last_login_at ?? null,
    companies: response.companies.map((company) => ({
      id: company.id,
      name: company.company_name,
    })),
    departments: response.departments.map((department) => ({
      id: department.id,
      name: department.department_name,
      companyId: department.company_id,
    })),
    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at ?? '',
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/**
 * The reach half of the body, shared by create and update.
 *
 * The form groups departments under the company whose picker they came from;
 * the endpoint takes a FLAT list and resolves each id to its own company, so the
 * grouping is flattened away here. Both lists are deduped — the endpoint
 * collapses duplicates anyway, and sending what comes back keeps the two equal.
 */
function reachPayload(values: TalkCredentialFormValues) {
  return {
    company_ids: [...new Set(values.companyIds)],
    department_ids: [
      ...new Set(
        values.departmentGrants.flatMap((grant) => grant.departmentIds.map(Number)),
      ),
    ],
  }
}

/**
 * Validated form values → the create body.
 *
 * With "same as panel credentials" ticked the endpoint copies the login from the
 * employee, so the address is left off entirely rather than sent empty — the
 * server discards anything sent there anyway, and an empty string would be a
 * 400 on the field. The PASSWORD still travels when one was typed: an employee
 * with no panel account has none to copy (they sign in by phone OTP), and that
 * is the one case this box can still answer.
 */
export function talkCredentialToPayload(
  values: TalkCredentialFormValues,
): TalkCredentialPayload {
  if (values.isSameAsPanelCreds) {
    return {
      employee_id: Number(values.employeeId),
      is_same_as_panel_creds: true,
      ...(values.password ? { password: values.password } : {}),
      ...reachPayload(values),
    }
  }

  return {
    employee_id: Number(values.employeeId),
    is_same_as_panel_creds: false,
    email: values.email.trim(),
    password: values.password,
    ...reachPayload(values),
  }
}

/**
 * Validated form values → the PATCH body.
 *
 * `password` is omitted when the box was left blank — that's "keep the current
 * credential", and sending an empty string would be a rotation to nothing.
 * Everything else always travels: the two reach lists are re-validated together
 * whatever arrives, and `status` is the suspend/restore switch.
 *
 * `is_same_as_panel_creds` is sent EVERY time rather than omitted, so the switch
 * on screen is what the credential reads afterwards. Left off, the endpoint
 * decides for itself — clearing the flag if and only if this save moves the
 * address or rotates the password — and the form would be showing a value it
 * didn't actually write.
 *
 * ON, the endpoint RE-SEEDS from the panel credential as it stands now and
 * ignores `email`, so the address is left off exactly as it is on create. A
 * password still travels when one was typed, but only as the fallback for an
 * employee with no panel account — which is why the form hides that box while
 * the switch is on, and rotating a seeded credential means turning it off.
 *
 * There is no `employee_id`: a credential cannot be re-pointed at someone else.
 */
export function talkCredentialToUpdatePayload(
  values: TalkCredentialFormValues,
): TalkCredentialUpdatePayload {
  if (values.isSameAsPanelCreds) {
    return {
      is_same_as_panel_creds: true,
      status: values.status,
      ...reachPayload(values),
      ...(values.password ? { password: values.password } : {}),
    }
  }

  return {
    is_same_as_panel_creds: false,
    email: values.email.trim(),
    status: values.status,
    ...reachPayload(values),
    ...(values.password ? { password: values.password } : {}),
  }
}

/**
 * The stored department grants, grouped into the form's per-company rows.
 *
 * The API answers a flat list because that's how it stores them; the form asks
 * per company because the department picker is per company. Each response
 * department carries its own `company_id`, so the grouping needs no extra read.
 */
export function toDepartmentGrants(
  departments: TalkCredential['departments'],
): DepartmentGrantFormValues[] {
  const byCompany = new Map<number, string[]>()
  for (const department of departments) {
    const current = byCompany.get(department.companyId) ?? []
    current.push(String(department.id))
    byCompany.set(department.companyId, current)
  }
  return [...byCompany].map(([companyId, departmentIds]) => ({
    companyId: String(companyId),
    departmentIds,
  }))
}

/** Hydrate the edit form from a stored record. The password boxes start empty. */
export function talkCredentialToFormValues(
  credential: TalkCredential,
): TalkCredentialFormValues {
  return {
    // Never editable — the field is a read-only statement of who this is for.
    employeeId: credential.employeeId ? String(credential.employeeId) : '',
    // Editable on both forms: PATCH takes the flag too, where `true` re-seeds
    // from the panel credential and `false` takes it down.
    isSameAsPanelCreds: credential.isSameAsPanelCreds,
    email: credential.email,
    password: '',
    confirmPassword: '',
    status: credential.status,
    companyIds: credential.companies.map((company) => company.id),
    departmentGrants: toDepartmentGrants(credential.departments),
  }
}

/** Who a credential belongs to, as the list column says it. */
export function employeeLabel(
  credential: Pick<TalkCredential, 'employeeName' | 'employeeId'>,
): string {
  if (credential.employeeName) return credential.employeeName
  // The employee was deleted; the credential outlives them and still has to be
  // named well enough to be revoked.
  return credential.employeeId ? `Employee #${credential.employeeId}` : 'Deleted employee'
}
