/**
 * The Indian financial year the holiday calendar is organised by: 1 April to
 * 31 March, written `2026-27` (four-digit start year, hyphen, last two digits
 * of the next year). Every holiday must fall inside one of them.
 */

const ACCOUNTING_YEAR_PATTERN = /^(\d{4})-(\d{2})$/

/** The accounting year `date` falls in — April onwards belongs to the new year. */
export function accountingYearOf(date: Date): string {
  const start = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1
  return formatAccountingYear(start)
}

/** `2026` → `2026-27`. */
export function formatAccountingYear(startYear: number): string {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`
}

/** The start year of a well-formed `2026-27`, or `null` for anything else. */
export function accountingYearStart(year: string): number | null {
  const match = ACCOUNTING_YEAR_PATTERN.exec(year)
  if (!match) return null
  const start = Number(match[1])
  return (start + 1) % 100 === Number(match[2]) ? start : null
}

/** Is `year` a real `2026-27` (the API refuses `2026-28` and `2026-2027`)? */
export function isAccountingYear(year: string): boolean {
  return accountingYearStart(year) !== null
}

/** First and last day of the year, as `yyyy-MM-dd`. */
export function accountingYearRange(year: string): { from: string; to: string } | null {
  const start = accountingYearStart(year)
  if (start === null) return null
  return { from: `${start}-04-01`, to: `${start + 1}-03-31` }
}

/** The accounting year a `yyyy-MM-dd` date falls in, or `null` if it isn't one. */
export function accountingYearOfDate(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-\d{2}/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  return formatAccountingYear(Number(match[2]) >= 4 ? year : year - 1)
}

/** Is a `yyyy-MM-dd` date inside `year`? Plain string compare orders ISO dates. */
export function isInAccountingYear(value: string, year: string): boolean {
  const range = accountingYearRange(year)
  return range !== null && value >= range.from && value <= range.to
}

/** `yyyy-MM-dd` → a local-midnight `Date`, for a date picker's min/max. */
export function toPickerDate(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

/**
 * The picker's choices: last year, this year and next year, newest last so the
 * list reads in calendar order. `extra` keeps a year from elsewhere (a banner
 * link, say) selectable when it sits outside that window.
 */
export function accountingYearOptions(today = new Date(), extra?: string): string[] {
  const current = accountingYearStart(accountingYearOf(today)) as number
  const years = [current - 1, current, current + 1].map(formatAccountingYear)
  if (extra && isAccountingYear(extra) && !years.includes(extra)) {
    years.push(extra)
    years.sort()
  }
  return years
}
