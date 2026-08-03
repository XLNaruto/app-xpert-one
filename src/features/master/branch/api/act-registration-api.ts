import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import {
  actRegistrationResponseSchema,
  branchActRegistrationSchema,
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
    const { act_registration } = branchActRegistrationSchema.parse(raw)
    return act_registration ? toBranchActs(act_registration) : null
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
    return toBranchActs(actRegistrationResponseSchema.parse(raw))
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
    return toBranchActs(actRegistrationResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the applicable acts.")
  }
}
