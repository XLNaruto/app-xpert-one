import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import type { PageParams } from '@/lib/pagination'
import { toReportParams, toReportPeriod, type ReportFilters } from '@/features/reports/common'
import {
  pfChallanResponseSchema,
  pfEcrResponseSchema,
  pfNewJoiningResponseSchema,
  pfStatementResponseSchema,
} from '../schemas'
import {
  toPfBasis,
  toPfChallanRow,
  toPfEcrRow,
  toPfNewJoiningRow,
  toPfStatementRow,
} from '../lib/pf-report-mappers'
import type { PfReportType } from '../constants'
import type {
  PfChallanRow,
  PfEcrRow,
  PfNewJoiningRow,
  PfReportPage,
  PfStatementRow,
} from '../types'

/**
 * The four PF reads, each tagged with the type that produced it so the page can
 * narrow to the right sheet without casting rows it can't verify.
 *
 * All four take the same query and answer the same envelope — `period`, `basis`,
 * `items`, `total` — and differ only in their rows and in which `sort` values
 * they accept. Sorting on another type's column is a 400, so the page only ever
 * offers the applied type's own.
 */
export type PfReportData =
  | ({ type: 'pf-challan' } & PfReportPage<PfChallanRow>)
  | ({ type: 'pf-statement' } & PfReportPage<PfStatementRow>)
  | ({ type: 'new-joining' } & PfReportPage<PfNewJoiningRow>)
  | ({ type: 'ecr' } & PfReportPage<PfEcrRow>)

const ERROR_MESSAGE = "Couldn't load the PF report."

export async function fetchPfChallan(
  filters: ReportFilters,
  params: PageParams,
): Promise<PfReportData> {
  try {
    const raw = await http.get<unknown>(endpoints.PF_REPORTS.CHALLAN, {
      params: toReportParams(filters, params),
    })
    const parsed = pfChallanResponseSchema.parse(raw)
    return {
      type: 'pf-challan',
      period: toReportPeriod(parsed.period),
      basis: toPfBasis(parsed.basis),
      items: parsed.items.map(toPfChallanRow),
      total: parsed.total,
    }
  } catch (error) {
    throw toApiError(error, ERROR_MESSAGE)
  }
}

export async function fetchPfStatement(
  filters: ReportFilters,
  params: PageParams,
): Promise<PfReportData> {
  try {
    const raw = await http.get<unknown>(endpoints.PF_REPORTS.STATEMENT, {
      params: toReportParams(filters, params),
    })
    const parsed = pfStatementResponseSchema.parse(raw)
    return {
      type: 'pf-statement',
      period: toReportPeriod(parsed.period),
      basis: toPfBasis(parsed.basis),
      items: parsed.items.map(toPfStatementRow),
      total: parsed.total,
    }
  } catch (error) {
    throw toApiError(error, ERROR_MESSAGE)
  }
}

/**
 * The registration sheet. Its month is the CALENDAR month, not the salary
 * cycle — a registration is dated by when the person actually joined, and a
 * cycle opening on the 26th would otherwise file a 27 April joiner on the May
 * sheet.
 */
export async function fetchPfNewJoining(
  filters: ReportFilters,
  params: PageParams,
): Promise<PfReportData> {
  try {
    const raw = await http.get<unknown>(endpoints.PF_REPORTS.NEW_JOINING, {
      params: toReportParams(filters, params),
    })
    const parsed = pfNewJoiningResponseSchema.parse(raw)
    return {
      type: 'new-joining',
      period: toReportPeriod(parsed.period),
      basis: toPfBasis(parsed.basis),
      items: parsed.items.map(toPfNewJoiningRow),
      /* Counts POSTINGS, not people — someone re-joining on a second posting is
         a second registration. */
      total: parsed.total,
    }
  } catch (error) {
    throw toApiError(error, ERROR_MESSAGE)
  }
}

export async function fetchPfEcr(
  filters: ReportFilters,
  params: PageParams,
): Promise<PfReportData> {
  try {
    const raw = await http.get<unknown>(endpoints.PF_REPORTS.ECR, {
      params: toReportParams(filters, params),
    })
    const parsed = pfEcrResponseSchema.parse(raw)
    return {
      type: 'ecr',
      period: toReportPeriod(parsed.period),
      basis: toPfBasis(parsed.basis),
      items: parsed.items.map(toPfEcrRow),
      total: parsed.total,
    }
  } catch (error) {
    throw toApiError(error, ERROR_MESSAGE)
  }
}

export function fetchPfReport(
  type: PfReportType,
  filters: ReportFilters,
  params: PageParams,
): Promise<PfReportData> {
  switch (type) {
    case 'pf-challan':
      return fetchPfChallan(filters, params)
    case 'pf-statement':
      return fetchPfStatement(filters, params)
    case 'new-joining':
      return fetchPfNewJoining(filters, params)
    case 'ecr':
      return fetchPfEcr(filters, params)
  }
}
