import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import {
  contractPostingResponseSchema,
  expiringContractsResponseSchema,
  type ContractCompleteFormValues,
  type ContractCompletePayload,
  type ContractRenewFormValues,
  type ContractRenewPayload,
} from '../schemas'
import {
  completeToPayload,
  renewToPayload,
  toContractPosting,
  toExpiringContract,
} from '../lib/contract-mappers'
import type { ContractExpiryParams, ContractPosting } from '../types'
import type { Paginated } from '@/lib/pagination'
import type { ExpiringContract } from '../types'

/**
 * The three `employee-contracts` calls.
 *
 * The list is read LIVE — unlike `/user/dashboard/*`, which serves a nightly
 * cube and carries an `as_of`. There is none here and none is needed: refetch
 * after a renew or a complete and the row that was acted on is gone.
 *
 * The two actions are addressed by EMPLOYEE id. The API finds the employee's
 * current posting itself, so `service_id` is never sent — it is carried on the
 * row only for the step-8 transfer-history link.
 */

/** GET /user/employee-contracts/expiring — one page of the worklist. */
export async function fetchExpiringContracts(
  params: ContractExpiryParams,
  signal?: AbortSignal,
): Promise<Paginated<ExpiringContract>> {
  try {
    const raw = await http.get<unknown>(endpoints.EMPLOYEE_CONTRACTS.EXPIRING, {
      params,
      signal,
    })
    const { items, total } = expiringContractsResponseSchema.parse(raw)
    return { items: items.map(toExpiringContract), total }
  } catch (error) {
    throw toApiError(error, "Couldn't load expiring contracts.")
  }
}

/**
 * POST /user/employees/:id/contract/renew — replace the term on the current
 * posting.
 *
 * It writes three columns on the SAME posting: the period, its unit and the
 * renewal date. No new posting row, no transfer, joining date untouched — so
 * step 8's transfer history does not grow a row, which is correct: a renewal is
 * not a transfer.
 */
export async function renewEmployeeContract(
  employeeId: number,
  values: ContractRenewFormValues,
): Promise<ContractPosting> {
  try {
    const raw = await http.post<unknown, ContractRenewPayload>(
      endpoints.EMPLOYEE_CONTRACTS.RENEW(employeeId),
      renewToPayload(values),
    )
    return toContractPosting(contractPostingResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't renew the contract.")
  }
}

/**
 * POST /user/employees/:id/contract/complete — let the term end and close the
 * posting.
 *
 * This is LEAVE SERVICE reached from the panel, with both fields defaulted: same
 * effect as `…/transfers/:service_id/leave-service`. Every history row stays and
 * nothing else is flipped — "currently working" is the ABSENCE of a leaving
 * date, so there is no status column to move and the employee record is not
 * deactivated.
 */
export async function completeEmployeeContract(
  employeeId: number,
  values: ContractCompleteFormValues,
): Promise<ContractPosting> {
  try {
    const raw = await http.post<unknown, ContractCompletePayload>(
      endpoints.EMPLOYEE_CONTRACTS.COMPLETE(employeeId),
      completeToPayload(values),
    )
    return toContractPosting(contractPostingResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't complete the service.")
  }
}
