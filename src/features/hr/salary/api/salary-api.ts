import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import type { PageParams } from '@/lib/pagination'
import { toSalaryRegister } from '../lib/salary-mappers'
import {
  salaryDeleteResponseSchema,
  salaryRegisterResponseSchema,
  salarySaveResponseSchema,
  type SalaryRegisterFilters,
  type SalarySavePayload,
} from '../schemas'
import type {
  SalaryDeleteResult,
  SalaryRegister,
  SalarySaveResult,
} from '../types'

/**
 * The payroll calls — the register, and the two writes that process or discard a
 * month.
 *
 * The division of labour is the whole reason this screen is small: the register
 * hands over the attendance, the wage structure in force and a full preview of
 * the pay, and the save takes back only the days each posting is paid for. No
 * amount ever travels from the client, so a screen left open through a wage
 * revision cannot write pay from the structure it was opened with.
 */

/**
 * GET /user/salary/register — one page of the month's register.
 *
 * `status` splits it in SQL: `pending` is the postings with no salary row for
 * the period, `complete` the ones already processed, whose stored figures come
 * back filled in. `total` counts the side being read, while `totals` always
 * describes the whole company.
 *
 * `designation_id` is the screen's own filter — the grid's allowance and
 * deduction columns are the designation's heads, so a register is read one
 * designation at a time. The company is passed in rather than read from the
 * session here because the query key needs the same value.
 */
export async function fetchSalaryRegister(
  filters: SalaryRegisterFilters,
  { limit, offset, search }: PageParams,
): Promise<SalaryRegister> {
  try {
    const raw = await http.get<unknown>(endpoints.SALARY.REGISTER, {
      params: {
        company_id: filters.companyId,
        month: filters.month,
        year: filters.year,
        status: filters.status,
        ...(filters.designationId ? { designation_id: filters.designationId } : {}),
        ...(search?.trim() ? { term: search.trim() } : {}),
        limit,
        offset,
      },
    })
    return toSalaryRegister(salaryRegisterResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the salary register.")
  }
}

/**
 * POST /user/salary/bulk-save — commit the run for many postings at once, in one
 * transaction.
 *
 * A row is upserted on `(employee_service_id, year, month)`: never processed is
 * created, already processed is revised. A paid month, and a posting with no wage
 * structure in force, are refused into `skipped` — the rest of the batch still
 * lands, so the caller has to report what didn't rather than assume it all did.
 */
export async function saveSalaries(
  payload: SalarySavePayload,
): Promise<SalarySaveResult> {
  try {
    const raw = await http.post<unknown, SalarySavePayload>(
      endpoints.SALARY.BULK_SAVE,
      payload,
    )
    const { saved, skipped } = salarySaveResponseSchema.parse(raw)
    return {
      saved: saved.map((row) => ({
        employeeServiceId: row.employee_service_id,
        salaryId: row.salary_id,
        action: row.action,
      })),
      skipped: skipped.map((row) => ({
        employeeServiceId: row.employee_service_id,
        reason: row.reason,
      })),
    }
  } catch (error) {
    throw toApiError(error, "Couldn't save the salary register.")
  }
}

/**
 * POST /user/salary/bulk-delete — discard processed salaries so the month can be
 * run again. A POST rather than a DELETE because the ids travel in a body: this
 * is the register's "discard selected", not the removal of one addressed row.
 *
 * The rows are soft-deleted, which is what makes re-processing possible. A paid
 * salary is refused into `skipped`; a partly-refused selection is still a
 * success, and only a request where nothing could be deleted fails outright.
 */
export async function deleteSalaries(
  salaryIds: number[],
): Promise<SalaryDeleteResult> {
  try {
    const raw = await http.post<unknown, { salary_ids: number[] }>(
      endpoints.SALARY.BULK_DELETE,
      { salary_ids: salaryIds },
    )
    const { deleted, skipped } = salaryDeleteResponseSchema.parse(raw)
    return {
      deleted,
      skipped: skipped.map((row) => ({ salaryId: row.salary_id, reason: row.reason })),
    }
  } catch (error) {
    throw toApiError(error, "Couldn't discard the processed salaries.")
  }
}
