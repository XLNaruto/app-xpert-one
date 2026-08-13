import type { ColumnSort } from '@tanstack/react-table'

/**
 * What every report screen has in common, whatever it reports on.
 *
 * The four modules differ only in which endpoint they call and which columns
 * come back. What selects a report — the company, the period, the department and
 * the people — is one shape, which is why the filter card and the screen hook
 * are shared rather than written four times.
 */

/** What picks one report out. The company comes from the session. */
export interface ReportFilters {
  companyId: number
  month: number
  year: number
  /** `null` is every department, which the API gets as no filter at all. */
  departmentId: number | null
  /** Empty is every employee — the API reads an omitted key the same way. */
  employeeIds: number[]
}

/**
 * Gross Salary's filters. It is the one type that spans a RANGE rather than a
 * period: `from` and `to` are inclusive `yyyy-MM`, and `from` after `to` is a
 * 400 rather than an empty table.
 */
export interface ReportRangeFilters {
  companyId: number
  from: string
  to: string
  departmentId: number | null
  employeeIds: number[]
}

/**
 * The cycle the report was read for — printed, not derived from `month`. With a
 * cycle start day set the period is not the calendar month, and that difference
 * decides which attendance was priced.
 *
 * The salary reports answer only `month`/`year`; the statutory ones add the
 * cycle, so the two dates are optional here rather than in two near-identical
 * types.
 */
export interface ReportPeriod {
  month: number
  year: number
  /** First day of the salary cycle, `yyyy-MM-dd`. */
  from?: string
  /** Last day — the date the statutory slab was read on. */
  to?: string
  cycleStartDay?: number
}

/** The range Gross Salary was read for, as the API resolved it. */
export interface ReportRange {
  from: string
  to: string
  fromMonth: number
  fromYear: number
  toMonth: number
  toYear: number
}

/**
 * One report type as the Type dropdown offers it.
 *
 * `defaultSort` is the order the type opens in — and the order a cleared header
 * falls back to. It matters more here than on an ordinary list: **each endpoint
 * accepts only its own columns** for `sort` and answers a 400 for anything else,
 * so switching type has to drop the previous type's order rather than carry it
 * over. `sortable` is that endpoint's accepted set, which the columns are built
 * against so a header that would 400 is never clickable.
 */
export interface ReportTypeOption<TType extends string = string> {
  value: TType
  label: string
  /** One line under the label in the dropdown — what this type answers. */
  description: string
  defaultSort: ColumnSort
  sortable: readonly string[]
  /**
   * Set on the one type read over a RANGE of periods (Gross Salary). The filter
   * card swaps its Month + Year dropdowns for two month pickers, and the screen
   * sends `from`/`to` instead of `month`/`year`.
   */
  isRange?: boolean
}
