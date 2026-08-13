import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import type { PageParams } from '@/lib/pagination'
import {
  toReportParams,
  toReportPeriod,
  toReportRange,
  toReportRangeParams,
  type ReportFilters,
  type ReportRangeFilters,
} from '@/features/reports/common'
import {
  grossSalaryResponseSchema,
  paidSalaryResponseSchema,
  payRegisterResponseSchema,
  paySlipResponseSchema,
  unpaidSalaryResponseSchema,
} from '../schemas'
import {
  toGrossSalaryRow,
  toPaidSalaryRow,
  toPayRegisterRow,
  toPaySlipRow,
  toUnpaidSalaryRow,
} from '../lib/salary-report-mappers'
import type { SalaryReportType } from '../constants'
import type {
  GrossSalaryReport,
  PaidSalaryRow,
  PayRegisterRow,
  PaySlipRow,
  PaymentReport,
  SalaryReportPage,
  UnpaidSalaryRow,
} from '../types'

/**
 * The five Salary Report reads.
 *
 * Every result is TAGGED with the type that produced it. The screen shows one
 * type at a time and each has its own columns, so the tag is what lets the page
 * narrow to the right table without casting a row set it can't verify — and what
 * stops a stale answer from the previous type rendering under the new heading.
 *
 * `sort` is passed straight through from the page, which only ever offers the
 * columns the endpoint being read accepts. A `sort` naming another type's column
 * is a 400 here, not a quietly-ignored parameter.
 */
export type SalaryReportData =
  | ({ type: 'pay-slip' } & SalaryReportPage<PaySlipRow>)
  | ({ type: 'pay-register' } & SalaryReportPage<PayRegisterRow>)
  | ({ type: 'gross-salary' } & GrossSalaryReport)
  | ({ type: 'paid-salary' } & PaymentReport<PaidSalaryRow>)
  | ({ type: 'unpaid-salary' } & PaymentReport<UnpaidSalaryRow>)

const ERROR_MESSAGE = "Couldn't load the salary report."

export async function fetchPaySlipReport(
  filters: ReportFilters,
  params: PageParams,
): Promise<SalaryReportData> {
  try {
    const raw = await http.get<unknown>(endpoints.SALARY_REPORTS.PAY_SLIP, {
      params: toReportParams(filters, params),
    })
    const parsed = paySlipResponseSchema.parse(raw)
    return {
      type: 'pay-slip',
      period: toReportPeriod(parsed.period),
      items: parsed.items.map(toPaySlipRow),
      total: parsed.total,
    }
  } catch (error) {
    throw toApiError(error, ERROR_MESSAGE)
  }
}

export async function fetchPayRegisterReport(
  filters: ReportFilters,
  params: PageParams,
): Promise<SalaryReportData> {
  try {
    const raw = await http.get<unknown>(endpoints.SALARY_REPORTS.PAY_REGISTER, {
      params: toReportParams(filters, params),
    })
    const parsed = payRegisterResponseSchema.parse(raw)
    return {
      type: 'pay-register',
      period: toReportPeriod(parsed.period),
      items: parsed.items.map(toPayRegisterRow),
      total: parsed.total,
    }
  } catch (error) {
    throw toApiError(error, ERROR_MESSAGE)
  }
}

/**
 * The only type read over a range: `from`/`to` as `YYYY-MM`, and no period at
 * all. `from` after `to` is a 400 rather than an empty table, which is why the
 * filter card refuses to send one.
 */
export async function fetchGrossSalaryReport(
  filters: ReportRangeFilters,
  params: PageParams,
): Promise<SalaryReportData> {
  try {
    const raw = await http.get<unknown>(endpoints.SALARY_REPORTS.GROSS_SALARY, {
      params: toReportRangeParams(filters, params),
    })
    const parsed = grossSalaryResponseSchema.parse(raw)
    return {
      type: 'gross-salary',
      range: toReportRange(parsed.range),
      items: parsed.items.map(toGrossSalaryRow),
      /* A count of EMPLOYEES, not of processed months — the report groups per
         person, so the two differ by exactly the multi-month employees. */
      total: parsed.total,
    }
  } catch (error) {
    throw toApiError(error, ERROR_MESSAGE)
  }
}

export async function fetchPaidSalaryReport(
  filters: ReportFilters,
  params: PageParams,
): Promise<SalaryReportData> {
  try {
    const raw = await http.get<unknown>(endpoints.SALARY_REPORTS.PAID_SALARY, {
      params: toReportParams(filters, params),
    })
    const parsed = paidSalaryResponseSchema.parse(raw)
    return {
      type: 'paid-salary',
      period: toReportPeriod(parsed.period),
      /* Describes the WHOLE filter, not the page — a page of twenty rows out of
         two hundred could never add up to its own header. */
      metrics: {
        totalEmployees: parsed.metrics.total_employees,
        totalNetPay: parsed.metrics.total_net_pay,
      },
      items: parsed.items.map(toPaidSalaryRow),
      total: parsed.total,
    }
  } catch (error) {
    throw toApiError(error, ERROR_MESSAGE)
  }
}

export async function fetchUnpaidSalaryReport(
  filters: ReportFilters,
  params: PageParams,
): Promise<SalaryReportData> {
  try {
    const raw = await http.get<unknown>(endpoints.SALARY_REPORTS.UNPAID_SALARY, {
      params: toReportParams(filters, params),
    })
    const parsed = unpaidSalaryResponseSchema.parse(raw)
    return {
      type: 'unpaid-salary',
      period: toReportPeriod(parsed.period),
      metrics: {
        totalEmployees: parsed.metrics.total_employees,
        totalNetPay: parsed.metrics.total_net_pay,
      },
      items: parsed.items.map(toUnpaidSalaryRow),
      total: parsed.total,
    }
  } catch (error) {
    throw toApiError(error, ERROR_MESSAGE)
  }
}

/**
 * One type → its read. The range type takes different filters from the other
 * four, so both sets are handed in and the branch picks the pair that belongs
 * together — a period never reaches Gross Salary, and a range never reaches the
 * rest.
 */
export function fetchSalaryReport(
  type: SalaryReportType,
  filters: ReportFilters,
  rangeFilters: ReportRangeFilters,
  params: PageParams,
): Promise<SalaryReportData> {
  switch (type) {
    case 'pay-slip':
      return fetchPaySlipReport(filters, params)
    case 'pay-register':
      return fetchPayRegisterReport(filters, params)
    case 'gross-salary':
      return fetchGrossSalaryReport(rangeFilters, params)
    case 'paid-salary':
      return fetchPaidSalaryReport(filters, params)
    case 'unpaid-salary':
      return fetchUnpaidSalaryReport(filters, params)
  }
}
