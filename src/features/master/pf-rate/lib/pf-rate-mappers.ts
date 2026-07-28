import { format, isValid, parseISO } from 'date-fns'
import type { AuditFields } from '@/types/audit'
import { PF_RATE_VALUE_FIELDS } from '../constants'
import type { PfRateFormValues } from '../schemas'
import type { PfRate, PfRateValueField, PfRateValueKey } from '../types'

const VALUE_KEYS: PfRateValueKey[] = PF_RATE_VALUE_FIELDS.map((f) => f.key)

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
 * amounts are grouped, ages read as plain years. Trailing zeros are dropped so
 * 12.00 shows as 12 and 8.33 stays 8.33.
 */
export function formatPfRateValue(value: number, kind: PfRateValueField['kind']): string {
  const trimmed = Number(value.toFixed(2))
  if (kind === 'percent') return `${trimmed}%`
  if (kind === 'age') return String(trimmed)
  return trimmed.toLocaleString('en-IN')
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

/** Newest effective date first — the order both the list and history read in. */
export function sortByEffectiveDateDesc(rates: PfRate[]): PfRate[] {
  return [...rates].sort((a, b) => b.wef.localeCompare(a.wef))
}
