import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import type { PageParams } from '@/lib/pagination'
import { toReportParams, toReportPeriod, type ReportFilters } from '@/features/reports/common'
import { ptReportResponseSchema } from '../schemas'
import { toPtHeader, toPtReportRow } from '../lib/pt-report-mappers'
import type { PtReport } from '../types'

/**
 * `GET /user/pt-reports/pt-report` — one page of the Professional Tax statement.
 *
 * The only PT type, so nothing is tagged: there is no second shape to narrow
 * against.
 */
export async function fetchPtReport(
  filters: ReportFilters,
  params: PageParams,
): Promise<PtReport> {
  try {
    const raw = await http.get<unknown>(endpoints.PT_REPORTS.STATEMENT, {
      params: toReportParams(filters, params),
    })
    const parsed = ptReportResponseSchema.parse(raw)
    return {
      period: toReportPeriod(parsed.period),
      header: toPtHeader(parsed.header),
      items: parsed.items.map(toPtReportRow),
      total: parsed.total,
    }
  } catch (error) {
    throw toApiError(error, "Couldn't load the PT report.")
  }
}
