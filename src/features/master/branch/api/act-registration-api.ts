import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import {
  actRegistrationResponseSchema,
} from '../schemas'
import { actsToPayload, toBranchActs } from '../lib/act-mappers'
import type {
  ActRegistrationPayload,
  ActRegistrationUpdatePayload,
  BranchFormValues,
} from '../schemas'
import type { BranchActs } from '../types'

/**
 * A branch's applicable acts — `/user/act-registrations`. One row per branch,
 * holding PF, ESIC, Factory, Professional Tax, LWF and Employment Exchange
 * side by side; every column is optional, so a branch carries only the acts it's
 * actually registered under.
 *
 * The row is a separate resource from the branch, which is why saving the
 * create screen is two calls: the branch first (it supplies the `branch_id`),
 * then the acts.
 */

/**
 * GET /user/act-registrations?branch_id= — the branch's acts, or `null` when
 * the tab has never been saved. Callers use that null to pick POST over PATCH.
 */
export async function fetchBranchActs(branchId: number): Promise<BranchActs | null> {
  try {
    const raw = await http.get<unknown>(endpoints.ACT_REGISTRATIONS.LIST, {
      params: { branch_id: branchId },
    })
    // The API may return either `{ act_registration: ... }` or the act
    // object directly. Accept both shapes and attempt a tolerant parse.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const asAny = raw as any

    // If the server answered the wrapped shape (`{ act_registration: ... }`)
    // operate on that raw object without parsing first: zod will reject when
    // keys are omitted, so normalize missing keys to `null` before parsing.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (asAny && typeof asAny === 'object' && 'act_registration' in asAny) {
      const act = (asAny as any).act_registration as Record<string, any>
      if (!act) return null
      const expectedKeys = [
        'id',
        'branch_id',
        'pf_code',
        'epf_act_date',
        'fpf_act_date',
        'pf_state_id',
        'pf_district_id',
        'pf_office_address_id',
        'pf_username',
        'pf_password',
        'esic_code',
        'esic_deducts_on',
        'esic_registration_date',
        'esic_state_id',
        'esic_district_id',
        'esic_office_address_id',
        'esic_username',
        'esic_password',
        'factory_act_date',
        'factory_license_number',
        'factory_fin_number',
        'no_of_employees',
        'electric_horse_power',
        'license_expiry_date',
        'stability_expiry_date',
        'factory_office_address_id',
        'pt_registration_date',
        'pt_pec_registration_number',
        'pt_prc_registration_number',
        'pt_corporation_name',
        'pt_state_id',
        'pt_district_id',
        'lwf_registration_date',
        'lwf_registration_number',
        'lwf_office_address_id',
        'lwf_username',
        'lwf_password',
        'ex_registration_date',
        'ex_registration_number',
        'ex_office_address_id',
        'created_at',
      ]
      for (const k of expectedKeys) {
        if (act[k] === undefined) act[k] = null
      }
      return toBranchActs(act as any)
    }

    // Try parsing the response as the act object directly. Normalize missing
    // keys to `null` the same way we did above.
    try {
      const expectedKeysDirect = [
        'id',
        'branch_id',
        'pf_code',
        'epf_act_date',
        'fpf_act_date',
        'pf_state_id',
        'pf_district_id',
        'pf_office_address_id',
        'pf_username',
        'pf_password',
        'esic_code',
        'esic_deducts_on',
        'esic_registration_date',
        'esic_state_id',
        'esic_district_id',
        'esic_office_address_id',
        'esic_username',
        'esic_password',
        'factory_act_date',
        'factory_license_number',
        'factory_fin_number',
        'no_of_employees',
        'electric_horse_power',
        'license_expiry_date',
        'stability_expiry_date',
        'factory_office_address_id',
        'pt_registration_date',
        'pt_pec_registration_number',
        'pt_prc_registration_number',
        'pt_corporation_name',
        'pt_state_id',
        'pt_district_id',
        'lwf_registration_date',
        'lwf_registration_number',
        'lwf_office_address_id',
        'lwf_username',
        'lwf_password',
        'ex_registration_date',
        'ex_registration_number',
        'ex_office_address_id',
        'created_at',
      ]
      for (const k of expectedKeysDirect) {
        if ((asAny as any)[k] === undefined) (asAny as any)[k] = null
      }
      return toBranchActs(actRegistrationResponseSchema.parse(asAny))
    } catch (err) {
      // direct parse failed; attempting camel->snake fallback
      const camelToSnake = (obj: any): any => {
        if (obj === null || obj === undefined) return obj
        if (Array.isArray(obj)) return obj.map(camelToSnake)
        if (typeof obj !== 'object') return obj
        const out: Record<string, any> = {}
        for (const [k, v] of Object.entries(obj)) {
          const snake = k.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase()
          out[snake] = camelToSnake(v)
        }
        return out
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalized = camelToSnake(asAny as any)
      // Ensure missing keys are null after normalization too.
      const expectedKeys2 = [
        'id',
        'branch_id',
        'pf_code',
        'epf_act_date',
        'fpf_act_date',
        'pf_state_id',
        'pf_district_id',
        'pf_office_address_id',
        'pf_username',
        'pf_password',
        'esic_code',
        'esic_deducts_on',
        'esic_registration_date',
        'esic_state_id',
        'esic_district_id',
        'esic_office_address_id',
        'esic_username',
        'esic_password',
        'factory_act_date',
        'factory_license_number',
        'factory_fin_number',
        'no_of_employees',
        'electric_horse_power',
        'license_expiry_date',
        'stability_expiry_date',
        'factory_office_address_id',
        'pt_registration_date',
        'pt_pec_registration_number',
        'pt_prc_registration_number',
        'pt_corporation_name',
        'pt_state_id',
        'pt_district_id',
        'lwf_registration_date',
        'lwf_registration_number',
        'lwf_office_address_id',
        'lwf_username',
        'lwf_password',
        'ex_registration_date',
        'ex_registration_number',
        'ex_office_address_id',
        'created_at',
      ]
      for (const k of expectedKeys2) {
        if (normalized[k] === undefined) normalized[k] = null
      }
      return toBranchActs(actRegistrationResponseSchema.parse(normalized))
    }
  } catch (error) {
    throw toApiError(error, "Couldn't load this branch's applicable acts.")
  }
}

/**
 * POST /user/act-registrations — write the branch's first acts row.
 *
 * A branch holds exactly one row, so this is a 409 if one already exists; the
 * caller reads the row first and PATCHes when it finds one.
 */
export async function createBranchActs(
  branchId: number,
  values: BranchFormValues,
): Promise<BranchActs> {
  try {
    const raw = await http.post<unknown, ActRegistrationPayload>(
      endpoints.ACT_REGISTRATIONS.POST,
      { branch_id: branchId, ...actsToPayload(values) },
    )

    // Raw response received from create.

    // Some APIs return the created object directly, others wrap it under
    // `act_registration`. Prefer the wrapped value when present. If the
    // response has no body (some backends return 201 with an empty body),
    // re-fetch the saved row by branch id so the client gets a consistent
    // object to parse.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let payload = (raw as any)?.act_registration ?? raw

    if (!payload) {
      // Response had no useful body — fetch the created row by branch id.
      const fetched = await fetchBranchActs(branchId)
      if (!fetched) throw toApiError(new Error('Created but no act row found'), "Couldn't save the applicable acts.")
      return fetched
    }

    // Try parsing the payload; if it doesn't match the schema, attempt a
    // tolerant camelCase→snake_case normalization before failing.
    try {
      return toBranchActs(actRegistrationResponseSchema.parse(payload))
    } catch (err) {
      // parse failed; attempting camel->snake fallback
      const camelToSnake = (obj: any): any => {
        if (obj === null || obj === undefined) return obj
        if (Array.isArray(obj)) return obj.map(camelToSnake)
        if (typeof obj !== 'object') return obj
        const out: Record<string, any> = {}
        for (const [k, v] of Object.entries(obj)) {
          const snake = k.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase()
          out[snake] = camelToSnake(v)
        }
        return out
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const normalized = camelToSnake(payload as any)
        return toBranchActs(actRegistrationResponseSchema.parse(normalized))
      } catch (err2) {
        // camel->snake fallback also failed
        throw toApiError(err2, "Couldn't save the applicable acts.")
      }
    }
  } catch (error) {
    throw toApiError(error, "Couldn't save the applicable acts.")
  }
}

/**
 * PATCH /user/act-registrations/:id — update the branch's acts.
 *
 * The whole tab is sent, blanks included as `null`: a partial body leaves an
 * omitted column untouched, so anything the user cleared has to travel as an
 * explicit null to actually clear.
 */
export async function updateBranchActs(
  id: number,
  values: BranchFormValues,
): Promise<BranchActs> {
  try {
    const raw = await http.patch<unknown, ActRegistrationUpdatePayload>(
      endpoints.ACT_REGISTRATIONS.PATCH(id),
      actsToPayload(values),
    )

    // Raw response received from update.

    // Accept either the direct response or a wrapper object. If the response
    // body is empty, fetch the saved row by id; otherwise try parsing and
    // fall back to a camel->snake normalization on mismatch.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let payload = (raw as any)?.act_registration ?? raw

    if (!payload) {
      // Response had no body — re-fetch the record by its id endpoint.
      const fetched = await http.get<unknown>(endpoints.ACT_REGISTRATIONS.GET(id))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload = (fetched as any)?.act_registration ?? fetched
      if (!payload) throw toApiError(new Error('Updated but no act row found'), "Couldn't update the applicable acts.")
    }

    // Normalize missing optional keys to `null` before parsing so zod's
    // nullable() accepts omitted columns.
    if (payload && typeof payload === 'object') {
      const expectedKeys = [
        'id',
        'branch_id',
        'pf_code',
        'epf_act_date',
        'fpf_act_date',
        'pf_state_id',
        'pf_district_id',
        'pf_office_address_id',
        'pf_username',
        'pf_password',
        'esic_code',
        'esic_deducts_on',
        'esic_registration_date',
        'esic_state_id',
        'esic_district_id',
        'esic_office_address_id',
        'esic_username',
        'esic_password',
        'factory_act_date',
        'factory_license_number',
        'factory_fin_number',
        'no_of_employees',
        'electric_horse_power',
        'license_expiry_date',
        'stability_expiry_date',
        'factory_office_address_id',
        'pt_registration_date',
        'pt_pec_registration_number',
        'pt_prc_registration_number',
        'pt_corporation_name',
        'pt_state_id',
        'pt_district_id',
        'lwf_registration_date',
        'lwf_registration_number',
        'lwf_office_address_id',
        'lwf_username',
        'lwf_password',
        'ex_registration_date',
        'ex_registration_number',
        'ex_office_address_id',
        'created_at',
      ]
      for (const k of expectedKeys) {
        if ((payload as any)[k] === undefined) (payload as any)[k] = null
      }
    }

    try {
      return toBranchActs(actRegistrationResponseSchema.parse(payload))
    } catch (err) {
      // parse failed; attempting camel->snake fallback
      const camelToSnake = (obj: any): any => {
        if (obj === null || obj === undefined) return obj
        if (Array.isArray(obj)) return obj.map(camelToSnake)
        if (typeof obj !== 'object') return obj
        const out: Record<string, any> = {}
        for (const [k, v] of Object.entries(obj)) {
          const snake = k.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase()
          out[snake] = camelToSnake(v)
        }
        return out
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const normalized = camelToSnake(payload as any)
        return toBranchActs(actRegistrationResponseSchema.parse(normalized))
      } catch (err2) {
        // camel->snake fallback also failed
        throw toApiError(err2, "Couldn't update the applicable acts.")
      }
    }
  } catch (error) {
    throw toApiError(error, "Couldn't update the applicable acts.")
  }
}
