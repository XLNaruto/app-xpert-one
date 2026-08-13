import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import type { PageParams } from '@/lib/pagination'
import { toReportParams, toReportPeriod, type ReportFilters } from '@/features/reports/common'
import { esicChallanResponseSchema, esicStatementResponseSchema } from '../schemas'
import {
  toEsicChallanRow,
  toEsicHeader,
  toEsicStatementRow,
} from '../lib/esic-report-mappers'
import type { EsicReportType } from '../constants'
import type { EsicChallanRow, EsicReportPage, EsicStatementRow } from '../types'

/**
 * The two ESIC reads, each tagged with the type that produced it.
 *
 * They are the same month seen twice: the statement carries the contributions,
 * the challan deliberately doesn't. Printing our own figures beside the portal's
 * computation would invite a reconciliation that has no meaning, which is why
 * the challan stops at the wage and the days.
 */
export type EsicReportData =
  | ({ type: 'esic-statement' } & EsicReportPage<EsicStatementRow>)
  | ({ type: 'esic-challan' } & EsicReportPage<EsicChallanRow>)

const ERROR_MESSAGE = "Couldn't load the ESIC report."

export async function fetchEsicStatement(
  filters: ReportFilters,
  params: PageParams,
): Promise<EsicReportData> {
  try {
    const raw = await http.get<unknown>(endpoints.ESIC_REPORTS.STATEMENT, {
      params: toReportParams(filters, params),
    })
    const parsed = esicStatementResponseSchema.parse(raw)
    return {
      type: 'esic-statement',
      period: toReportPeriod(parsed.period),
      header: toEsicHeader(parsed.header),
      items: parsed.items.map(toEsicStatementRow),
      total: parsed.total,
    }
  } catch (error) {
    throw toApiError(error, ERROR_MESSAGE)
  }
}

export async function fetchEsicChallan(
  filters: ReportFilters,
  params: PageParams,
): Promise<EsicReportData> {
  try {
    const raw = await http.get<unknown>(endpoints.ESIC_REPORTS.CHALLAN, {
      params: toReportParams(filters, params),
    })
    const parsed = esicChallanResponseSchema.parse(raw)
    return {
      type: 'esic-challan',
      period: toReportPeriod(parsed.period),
      header: toEsicHeader(parsed.header),
      items: parsed.items.map(toEsicChallanRow),
      total: parsed.total,
    }
  } catch (error) {
    throw toApiError(error, ERROR_MESSAGE)
  }
}

export function fetchEsicReport(
  type: EsicReportType,
  filters: ReportFilters,
  params: PageParams,
): Promise<EsicReportData> {
  return type === 'esic-statement'
    ? fetchEsicStatement(filters, params)
    : fetchEsicChallan(filters, params)
}
