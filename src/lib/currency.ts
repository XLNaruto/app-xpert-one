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
