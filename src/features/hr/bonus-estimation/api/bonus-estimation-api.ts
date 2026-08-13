import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import type { PageParams } from '@/lib/pagination'
import {
  bonusEstimateResponseSchema,
  savedBonusResponseSchema,
  saveBonusResponseSchema,
  type BonusEstimateFilters,
  type SaveBonusPayload,
  type SavedBonusFilters,
} from '../schemas'
import {
  toBonusEstimateList,
  toSavedBonusList,
  toSaveBonusResult,
} from '../lib/bonus-mappers'
import type { BonusEstimateList, SaveBonusResult, SavedBonusList } from '../types'

/**
 * The range is sent as the two `YYYY-MM` periods the pickers hold, because a
 * salary row carries a month and a year and no date at all. `search` matches the
 * name, code or primary mobile — the same three fields as every payroll screen —
 * and neither endpoint takes a `sort`, so no order is sent and the screen's
 * columns aren't sortable.
 */
function toParams(
  filters: BonusEstimateFilters,
  { limit, offset, search }: PageParams,
) {
  return {
    company_id: filters.companyId,
    from: filters.from,
    to: filters.to,
    ...(filters.departmentId ? { department_id: filters.departmentId } : {}),
    ...(filters.designationId ? { designation_id: filters.designationId } : {}),
    ...(search?.trim() ? { search: search.trim() } : {}),
    limit,
    offset,
  }
}

/**
 * `GET /user/bonus-estimation/estimate` — one page of what a bonus would cost.
 *
 * Writes nothing. Every line carries all four bases summed over the range, so
 * switching the CALCULATION BASE dropdown re-fills the column from this answer
 * rather than asking again — and they are the same sums the save apportions
 * against, so the amount authorised and the rows it lands on are figured from the
 * same numbers.
 *
 * Read off PROCESSED months only: an employee the register never priced for any
 * month of the range is absent, and `total` counts employees rather than months.
 */
export async function fetchBonusEstimate(
  filters: BonusEstimateFilters,
  params: PageParams,
): Promise<BonusEstimateList> {
  try {
    const raw = await http.get<unknown>(endpoints.BONUS_ESTIMATION.ESTIMATE, {
      params: toParams(filters, params),
    })
    return toBonusEstimateList(bonusEstimateResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the bonus estimate.")
  }
}

/**
 * `GET /user/bonus-estimation/saved` — what has been COMMITTED for the range.
 *
 * Paged over employees, each carrying its months whole, so an employee's total
 * and the months under it are one answer rather than two that could disagree.
 */
export async function fetchSavedBonuses(
  filters: SavedBonusFilters,
  params: PageParams,
): Promise<SavedBonusList> {
  try {
    const raw = await http.get<unknown>(endpoints.BONUS_ESTIMATION.SAVED, {
      params: toParams(filters, params),
    })
    return toSavedBonusList(savedBonusResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the saved bonuses.")
  }
}

/**
 * `POST /user/bonus-estimation` — commit one bonus per ticked employee.
 *
 * Each employee sends ONE amount for the whole range plus the percentage that
 * produced it; the server splits the amount across their processed months in
 * proportion to each month's `calculation_field`, in whole paise, so the stored
 * rows sum exactly to what was authorised.
 *
 * `percentage` is omitted for a hand-keyed amount with no usable base — there is
 * no percentage to claim, and inventing one would misdescribe the figure.
 *
 * A 201 is **not** "every employee was committed": a month already carrying a
 * bonus is skipped rather than overwritten, and an employee with no processed
 * months is reported in `employees[]` while the rest of the request lands. Only a
 * selection where nothing at all could be written is a 400, and a concurrent save
 * that took part of the range is a 409 with nothing landed.
 */
export async function saveBonuses(payload: SaveBonusPayload): Promise<SaveBonusResult> {
  try {
    const raw = await http.post<unknown>(endpoints.BONUS_ESTIMATION.BASE, {
      company_id: payload.companyId,
      from: payload.from,
      to: payload.to,
      ...(payload.departmentId ? { department_id: payload.departmentId } : {}),
      ...(payload.designationId ? { designation_id: payload.designationId } : {}),
      calculation_field: payload.calculationField,
      employees: payload.employees.map((employee) => ({
        employee_id: employee.employeeId,
        amount: employee.amount,
        ...(employee.percentage === undefined ? {} : { percentage: employee.percentage }),
      })),
    })
    return toSaveBonusResult(saveBonusResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't save the bonus.")
  }
}
