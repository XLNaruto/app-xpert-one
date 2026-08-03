import { format, isValid, parseISO } from 'date-fns'
import { formatAmount } from '@/lib/currency'
import type { AuditFields } from '@/types/audit'
import { PF_RATE_VALUE_FIELDS } from '../constants'
import type { PfRateFormValues, PfRatePayload, PfRateResponse } from '../schemas'
import type { PfRate, PfRateValueField, PfRateValueKey } from '../types'

const VALUE_KEYS: PfRateValueKey[] = PF_RATE_VALUE_FIELDS.map((f) => f.key)

/**
 * The API's snake_case field for each camelCase slab value — the single place
 * the two namings meet, read in both directions by the mappers below.
 */
const API_FIELD: Record<PfRateValueKey, keyof PfRateResponse> = {
  wageCeilingLimit: 'wage_ceiling_limit',
  edliWageCeilingLimit: 'edli_wage_ceiling_limit',
  employeePfContribution: 'employee_pf_contribution',
  employerPfContribution: 'employer_pf_contribution',
  employerFpfContribution: 'employer_fpf_contribution',
  deduction: 'deduction',
  adminCharges: 'admin_charges',
  edliCharges: 'edli_charges',
  edliAdminCharges: 'edli_admin_charges',
  minimumAdminCharges: 'minimum_admin_charges',
  maximumEdliCharges: 'maximum_edli_charges',
  minimumClosedAdminCharges: 'minimum_closed_admin_charges',
  minimumEdliClosedCharges: 'minimum_edli_closed_charges',
  pensionFundAgeLimit: 'pension_fund_age_limit',
}

/**
 * API record → the UI slab. Nullable values read as 0, and since the API only
 * tracks `created_at` the rest of the audit trail stays empty (the audit
 * columns render a dash for it).
 */
export function toPfRate(response: PfRateResponse): PfRate {
  const numbers = Object.fromEntries(
    VALUE_KEYS.map((key) => [key, Number(response[API_FIELD[key]] ?? 0)]),
  ) as Record<PfRateValueKey, number>

  return {
    id: response.id,
    wef: response.effective_date ?? '',
    ...numbers,
    createdBy: '',
    createdAt: response.created_at,
    updatedBy: null,
    updatedAt: null,
  }
}

/** Validated form values → the create/update request body. */
export function pfRateToPayload(values: PfRateFormValues): PfRatePayload {
  const stored = pfRateFromFormValues(values)
  const numbers = Object.fromEntries(
    VALUE_KEYS.map((key) => [API_FIELD[key], stored[key]]),
  ) as Omit<PfRatePayload, 'effective_date'>

  return { effective_date: stored.wef, ...numbers }
}

/** Parse validated form values into the stored numeric shape. */
export function pfRateFromFormValues(
  values: PfRateFormValues,
): Omit<PfRate, 'id' | keyof AuditFields> {
  const numbers = Object.fromEntries(
    VALUE_KEYS.map((key) => [key, Number(values[key] || 0)]),
  ) as Record<PfRateValueKey, number>

  return { wef: values.wef, ...numbers }
}

/** Hydrate the edit form from a stored PF rate. */
export function pfRateToFormValues(rate: PfRate): PfRateFormValues {
  const strings = Object.fromEntries(
    VALUE_KEYS.map((key) => [key, String(rate[key])]),
  ) as Record<PfRateValueKey, string>

  return { wef: rate.wef, ...strings }
}

/** `2026-05-23` → `23 May 2026`; anything unparseable falls back to a dash. */
export function formatEffectiveDate(wef: string): string {
  const parsed = wef ? parseISO(wef) : null
  return parsed && isValid(parsed) ? format(parsed, 'dd MMM yyyy') : '—'
}

/**
 * Render one slab value the way its column expects: percentages carry a sign,
 * amounts carry the currency symbol, ages read as plain years. Trailing zeros
 * are dropped so 12.00 shows as 12 and 8.33 stays 8.33.
 */
export function formatPfRateValue(value: number, kind: PfRateValueField['kind']): string {
  const trimmed = Number(value.toFixed(2))
  if (kind === 'percent') return `${trimmed}%`
  if (kind === 'age') return String(trimmed)
  return formatAmount(value)
}

/**
 * The employer's total PF contribution — their PF share plus their FPF share.
 * Derived, never keyed in: the Deduction field on the form mirrors this.
 */
export function totalEmployerContribution(
  employerPf: string,
  employerFpf: string,
): string {
  const total = Number(employerPf || 0) + Number(employerFpf || 0)
  return Number.isFinite(total) ? String(Number(total.toFixed(2))) : '0'
}
