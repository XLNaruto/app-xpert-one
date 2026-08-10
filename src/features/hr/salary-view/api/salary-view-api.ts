import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import type { PageParams } from '@/lib/pagination'
import { salaryReportResponseSchema, type SalaryViewFilters } from '../schemas'
import { toSalaryView } from '../lib/salary-view-mappers'
import type { SalaryView } from '../types'

/**
 * GET /user/salary/report — one page of the month already processed.
 *
 * Only *stored* salaries: a posting the month was never run for isn't here at
 * all, which is what separates this screen from the register's pending side.
 *
 * `employee_ids` narrows the read to specific people — the detail screen's own
 * way in, since the API addresses a salary through its employee and period
 * rather than by its id.
 *
 * The endpoint takes no `sort`, so the order is the server's and the screen's
 * columns aren't sortable. The company is passed in rather than read from the
 * session because the query key needs the same value.
 */
export async function fetchSalaryReport(
  filters: SalaryViewFilters,
  { limit, offset, search }: PageParams,
  employeeIds?: number[],
): Promise<SalaryView> {
  try {
    const raw = await http.get<unknown>(endpoints.SALARY.REPORT, {
      params: {
        company_id: filters.companyId,
        month: filters.month,
        year: filters.year,
        ...(filters.departmentId ? { department_id: filters.departmentId } : {}),
        /* Sent as a JSON array in one value — `employee_ids=[88]` — which is the
           shape this endpoint reads. Handing axios the array itself would give
           either `employee_ids[]=88` or a repeated bare key, and neither parses
           here. */
        ...(employeeIds?.length ? { employee_ids: JSON.stringify(employeeIds) } : {}),
        ...(search?.trim() ? { term: search.trim() } : {}),
        limit,
        offset,
      },
    })
    return toSalaryView(salaryReportResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't load the processed salaries.")
  }
}
