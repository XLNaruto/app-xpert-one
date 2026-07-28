import { format, isValid, parseISO } from 'date-fns'
import type { AuditFields } from '@/types/audit'
import { ESIC_RATE_VALUE_FIELDS, MONTH_OPTIONS } from '../constants'
import type { EsicRateFormValues } from '../schemas'
import type { EsicRate, EsicRateValueField, EsicRateValueKey } from '../types'

const VALUE_KEYS: EsicRateValueKey[] = ESIC_RATE_VALUE_FIELDS.map((f) => f.key)

/** Parse validated form values into the stored numeric shape. */
export function esicRateFromFormValues(
  values: EsicRateFormValues,
): Omit<EsicRate, 'id' | keyof AuditFields> {
  const numbers = Object.fromEntries(
    VALUE_KEYS.map((key) => [key, Number(values[key] || 0)]),
  ) as Record<EsicRateValueKey, number>

  return {
    wef: values.wef,
    contributionEndPeriod1: values.contributionEndPeriod1,
    contributionEndPeriod2: values.contributionEndPeriod2,
    ...numbers,
  }
}

/** Hydrate the edit form from a stored ESIC rate. */
export function esicRateToFormValues(rate: EsicRate): EsicRateFormValues {
  const strings = Object.fromEntries(
    VALUE_KEYS.map((key) => [key, String(rate[key])]),
  ) as Record<EsicRateValueKey, string>

  return {
    wef: rate.wef,
    // Stored periods may arrive unpadded (`9`); the dropdown options are `09`.
    contributionEndPeriod1: padMonth(rate.contributionEndPeriod1),
    contributionEndPeriod2: padMonth(rate.contributionEndPeriod2),
    ...strings,
  }
}

/** `9` → `09`; blank stays blank so the dropdown reads as unselected. */
export function padMonth(month: string): string {
  return month ? String(month).padStart(2, '0') : ''
}

/** `2026-05-23` → `23 May 2026`; anything unparseable falls back to a dash. */
export function formatEffectiveDate(wef: string): string {
  const parsed = wef ? parseISO(wef) : null
  return parsed && isValid(parsed) ? format(parsed, 'dd MMM yyyy') : '—'
}

/** `09` → `September`; an unknown month falls back to a dash. */
export function formatMonth(month: string): string {
  const match = MONTH_OPTIONS.find((option) => option.value === padMonth(month))
  return match?.label ?? '—'
}

/**
 * Render one slab value the way its column expects: percentages carry a sign,
 * amounts are grouped, durations read as plain years. Trailing zeros are dropped
 * so 3.00 shows as 3 and 0.75 stays 0.75.
 */
export function formatEsicRateValue(
  value: number,
  kind: EsicRateValueField['kind'],
): string {
  const trimmed = Number(value.toFixed(2))
  if (kind === 'percent') return `${trimmed}%`
  if (kind === 'duration') return String(trimmed)
  return trimmed.toLocaleString('en-IN')
}

/** Newest effective date first — the order both the list and history read in. */
export function sortByEffectiveDateDesc(rates: EsicRate[]): EsicRate[] {
  return [...rates].sort((a, b) => b.wef.localeCompare(a.wef))
}
