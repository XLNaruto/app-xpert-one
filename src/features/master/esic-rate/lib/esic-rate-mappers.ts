import { format, isValid, parseISO } from 'date-fns'
import { formatAmount } from '@/lib/currency'
import type { AuditFields } from '@/types/audit'
import { ESIC_RATE_VALUE_FIELDS, MONTH_OPTIONS } from '../constants'
import type {
  EsicRateCreatePayload,
  EsicRateFormValues,
  EsicRateResponse,
  EsicRateUpdatePayload,
} from '../schemas'
import type { EsicRate, EsicRateValueField, EsicRateValueKey } from '../types'

const VALUE_KEYS: EsicRateValueKey[] = ESIC_RATE_VALUE_FIELDS.map((f) => f.key)

/**
 * The API's snake_case field for each camelCase slab value — the single place
 * the two namings meet, read in both directions by the mappers below. The
 * contribution pair uses the response spelling; `POST` wants it without the
 * "c", which `esicRateToCreatePayload` handles on its own.
 */
const API_FIELD: Record<EsicRateValueKey, keyof EsicRateResponse> = {
  wageCeilingLimit: 'wage_ceiling_limit',
  minimumRate: 'minimum_rate',
  employeeEsiContribution: 'employee_esic_contribution',
  employerEsiContribution: 'employer_esic_contribution',
  disabilityDuration: 'disability_duration',
  disabilityWageLimit: 'disability_wage_limit',
}

/**
 * API record → the UI slab. Nullable values read as 0, month numbers become the
 * zero-padded strings the dropdowns use, and since the API only tracks
 * `created_at` the rest of the audit trail stays empty (the audit columns
 * render a dash for it).
 */
export function toEsicRate(response: EsicRateResponse): EsicRate {
  const numbers = Object.fromEntries(
    VALUE_KEYS.map((key) => [key, Number(response[API_FIELD[key]] ?? 0)]),
  ) as Record<EsicRateValueKey, number>

  return {
    id: response.id,
    wef: response.effective_date ?? '',
    ...numbers,
    contributionEndPeriod1: monthToOption(response.contribution_end_period1),
    contributionEndPeriod2: monthToOption(response.contribution_end_period2),
    createdBy: '',
    createdAt: response.created_at,
    updatedBy: null,
    updatedAt: null,
  }
}

/** Validated form values → the `POST` body. */
export function esicRateToCreatePayload(
  values: EsicRateFormValues,
): EsicRateCreatePayload {
  const { employee_esic_contribution, employer_esic_contribution, ...shared } =
    esicRateToUpdatePayload(values)

  return {
    ...shared,
    employee_esi_contribution: employee_esic_contribution,
    employer_esi_contribution: employer_esic_contribution,
  }
}

/** Validated form values → the `PATCH` body. */
export function esicRateToUpdatePayload(
  values: EsicRateFormValues,
): EsicRateUpdatePayload {
  const stored = esicRateFromFormValues(values)
  const numbers = Object.fromEntries(
    VALUE_KEYS.map((key) => [API_FIELD[key], stored[key]]),
  ) as Pick<
    EsicRateUpdatePayload,
    | 'wage_ceiling_limit'
    | 'minimum_rate'
    | 'employee_esic_contribution'
    | 'employer_esic_contribution'
    | 'disability_duration'
    | 'disability_wage_limit'
  >

  return {
    effective_date: stored.wef,
    ...numbers,
    contribution_end_period1: Number(stored.contributionEndPeriod1),
    contribution_end_period2: Number(stored.contributionEndPeriod2),
  }
}

/** `9` → `'09'`; a missing month stays blank so the dropdown reads unselected. */
function monthToOption(month: number | null): string {
  return month === null ? '' : padMonth(String(month))
}

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
 * amounts carry the currency symbol, durations read as plain years. Trailing
 * zeros are dropped so 3.00 shows as 3 and 0.75 stays 0.75.
 */
export function formatEsicRateValue(
  value: number,
  kind: EsicRateValueField['kind'],
): string {
  const trimmed = Number(value.toFixed(2))
  if (kind === 'percent') return `${trimmed}%`
  if (kind === 'duration') return String(trimmed)
  return formatAmount(value)
}
