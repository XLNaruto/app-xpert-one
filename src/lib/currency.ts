import { useConfigStore } from '@/stores/config-store'

/**
 * Currency helpers. The symbol and ISO code live once in `config-store`, so no
 * screen, label or constant hard-codes `₹` — switching the portal's currency is
 * a single `setCurrency()` call.
 *
 * These are pure functions reading the store snapshot (same pattern as
 * `mediaUrl()`), which is what lets non-React files — `constants.ts`, mappers —
 * use them too.
 */

/**
 * The rupee sign, re-exported from the store that seeds itself with it. Import
 * it from here instead of retyping `₹` anywhere — a fixed label, a placeholder,
 * a chart axis. Anything rendering a live amount should call `formatAmount()` or
 * `currencySymbol()` instead, so it follows a currency change.
 */
export { RUPEE_SIGN } from '@/stores/config-store'

/** The configured currency symbol, e.g. `₹`. */
export function currencySymbol(): string {
  return useConfigStore.getState().currencySymbol
}

/** The configured ISO 4217 code, e.g. `INR`. */
export function currencyCode(): string {
  return useConfigStore.getState().currencyCode
}

/**
 * Suffix a form/column label with the currency symbol:
 * `amountLabel('Wage Ceiling')` → `Wage Ceiling (₹)`.
 *
 * Called from a feature's `constants.ts` it resolves when that module first
 * loads, which is fine while the currency is a per-deployment setting — change
 * it at runtime and labels pick the new symbol up on the next reload.
 */
export function amountLabel(label: string): string {
  return `${label} (${currencySymbol()})`
}

/**
 * An amount as a table/detail cell reads it: the currency symbol, then the
 * value in Indian digit grouping — `1500` → `₹1,500`, `8.5` → `₹8.5`.
 *
 * Trailing zeros are dropped (`12.00` → `₹12`) because these are keyed-in rate
 * values, not ledger figures. Use it for every money value a list shows, so a
 * column of amounts can't read as a column of plain numbers.
 */
export function formatAmount(value: number): string {
  return `${currencySymbol()}${formatDecimal(value)}`
}

/**
 * The digits of an amount alone, grouped the same way — `150000` → `1,50,000`.
 *
 * For the few places that carry the unit themselves rather than as a prefix: a
 * cell that shows either a percentage or an amount, a figure sat next to a unit
 * toggle. Everything else wants `formatAmount()`, symbol included.
 */
export function formatDecimal(value: number): string {
  return Number(value.toFixed(2)).toLocaleString('en-IN')
}

/**
 * An amount rounded to two decimals, and none on a whole number — the raw
 * number, not a formatted string.
 *
 * Every figure a dense wage grid prints goes through here, because most of them
 * are one division away from a repeating decimal — a monthly basic spread over
 * the paid days, an hourly rate off that again — and a grid cell is far too
 * narrow to show `144.23076923076923`. Two decimals is also all the API accepts
 * back, so nothing is lost by never showing more.
 */
export function gridAmount(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * A money figure rounded to the **paise**, exactly the way the server's own
 * `round2()` does it.
 *
 * The `Number.EPSILON` term is not decoration. `1.005 * 100` is
 * `100.49999999999999` in IEEE-754, so a bare `Math.round` answers `1.00` where
 * the server answers `1.01` — and since `POST /user/salary/bulk-save` now checks
 * each row's arithmetic to within **5 paise**, a single half-way case rounded the
 * other way is a 400 on the save rather than a cosmetic paisa.
 *
 * Every money figure the salary mirror computes goes through here, per line,
 * before it is summed: the server rounds at each step, so summing unrounded
 * floats and rounding once at the end drifts away from it.
 */
export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON * Math.sign(value)) * 100) / 100
}

/**
 * A money figure as a payroll column prints it — **always two decimals**, in
 * Indian digit grouping: `1500` → `₹1,500.00`, `104.2275` → `₹104.23`.
 *
 * Distinct from `formatAmount()`, which drops trailing zeros because it prints
 * keyed-in *rates*. Pay is a ledger figure: it is now computed to the paise on
 * both sides of the wire, and a column of salaries that shows `₹13,897` beside
 * `₹104.23` neither aligns nor reconciles against the bill it was billed on.
 */
export function formatMoney(value: number): string {
  return `${currencySymbol()}${formatMoneyDecimal(value)}`
}

/** The digits of a money figure alone, two decimals — `13897` → `13,897.00`. */
export function formatMoneyDecimal(value: number): string {
  return round2(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
