import type { PageParams } from '@/lib/pagination'
import type { ReportPeriodResponse, ReportRangeResponse } from '../schemas'
import type { ReportFilters, ReportPeriod, ReportRange, ReportRangeFilters } from '../types'

/**
 * The pure helpers every report module shares — no React, no hooks.
 *
 * Two jobs: turning what the API answers into what the screens render, and
 * turning what the filter card holds into the query string all twelve endpoints
 * read.
 */

/** A nullable number as a report counts it — absent means nothing, not blank. */
export function num(value: number | null | undefined): number {
  return value ?? 0
}

/** A nullable string as a report prints it — absent renders as a dash. */
export function text(value: string | null | undefined): string {
  return value ?? ''
}

export function toReportPeriod(period: ReportPeriodResponse): ReportPeriod {
  return {
    month: period.month,
    year: period.year,
    from: period.from ?? undefined,
    to: period.to ?? undefined,
    cycleStartDay: period.cycle_start_day ?? undefined,
  }
}

export function toReportRange(range: ReportRangeResponse): ReportRange {
  return {
    from: range.from,
    to: range.to,
    fromMonth: range.from_month,
    fromYear: range.from_year,
    toMonth: range.to_month,
    toYear: range.to_year,
  }
}

/**
 * The query string every report takes: what selects it, plus the page.
 *
 * `department_id` and `employee_ids` are omitted rather than sent empty — an
 * omitted key is how the API reads "all", and a `department_id=` would be a 400.
 * `employee_ids` goes as a repeated key, which the endpoints accept alongside
 * `8,9` and `[8,9]`; axios serialises an array that way by default.
 *
 * `sort` is only ever the id of a column the screen let the user click, and each
 * endpoint accepts only its OWN columns — a `sort` from the type previously on
 * screen would be a 400, which is why the screen hook drops the order on a type
 * switch rather than passing it through here.
 */
export function toReportParams(
  filters: ReportFilters,
  { limit, offset, search, sort, sortBy }: PageParams,
): Record<string, unknown> {
  return {
    company_id: filters.companyId,
    month: filters.month,
    year: filters.year,
    ...(filters.departmentId ? { department_id: filters.departmentId } : {}),
    ...(filters.employeeIds.length ? { employee_ids: filters.employeeIds } : {}),
    ...(search?.trim() ? { search: search.trim() } : {}),
    ...(sort ? { sort, sort_by: sortBy ?? 'asc' } : {}),
    limit,
    offset,
  }
}

/** The same, for the one type read over a range of periods. */
export function toReportRangeParams(
  filters: ReportRangeFilters,
  { limit, offset, search, sort, sortBy }: PageParams,
): Record<string, unknown> {
  return {
    company_id: filters.companyId,
    from: filters.from,
    to: filters.to,
    ...(filters.departmentId ? { department_id: filters.departmentId } : {}),
    ...(filters.employeeIds.length ? { employee_ids: filters.employeeIds } : {}),
    ...(search?.trim() ? { search: search.trim() } : {}),
    ...(sort ? { sort, sort_by: sortBy ?? 'asc' } : {}),
    limit,
    offset,
  }
}
