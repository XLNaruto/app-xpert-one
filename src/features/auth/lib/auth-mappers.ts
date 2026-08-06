import type { AuthUser } from '@/stores/auth-store'
import type { AuthUserResponse } from '../schemas'

/** Map the wire `user` object (snake_case) to the client `AuthUser`. */
export function toAuthUser(raw: AuthUserResponse): AuthUser {
  return {
    id: raw.id,
    accountId: raw.account_id,
    email: raw.email,
    name: raw.name,
    roleId: raw.role_id,
    companyId: raw.company_id,
    isOwner: raw.is_owner,
    lastSelectedCompanyId: raw.last_selected_company_id,
  }
}
