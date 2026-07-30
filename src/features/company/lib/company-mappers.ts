import type { MyCompanyResponse } from '../schemas'
import type { MyCompany } from '../types'

/** Map a wire company (snake_case) to the camelCase client shape. */
export function toMyCompany(raw: MyCompanyResponse): MyCompany {
  return {
    id: raw.id,
    name: raw.company_name,
    code: raw.company_code,
    logo: raw.logo ?? null,
  }
}
