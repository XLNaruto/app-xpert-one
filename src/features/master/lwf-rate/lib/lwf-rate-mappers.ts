import { format, isValid, parseISO } from 'date-fns'
import { MONTH_OPTIONS } from '../constants'
import type { LwfRateFormValues } from '../schemas'
import type { LwfRate } from '../types'

/** The user-editable half of a rate — identity and audit fields are the API's. */
export type LwfRateEditableFields = Pick<
  LwfRate,
  'wef' | 'stateId' | 'stateName' | 'month' | 'employeeContribution' | 'employerContribution'
>

/**
 * Parse validated form values into the stored record. The state name is looked
 * up by the caller (the API layer owns the state master) and passed in.
 */
export function lwfRateFromFormValues(
  values: LwfRateFormValues,
  stateName: string,
): LwfRateEditableFields {
  return {
    wef: values.wef,
    stateId: Number(values.stateId),
    stateName,
    month: values.month,
    employeeContribution: Number(values.employeeContribution),
    employerContribution: Number(values.employerContribution),
  }
}

/** Hydrate the edit form from a stored LWF rate. */
export function lwfRateToFormValues(rate: LwfRate): LwfRateFormValues {
  return {
    wef: rate.wef,
    stateId: String(rate.stateId),
    month: rate.month,
    employeeContribution: String(rate.employeeContribution),
    employerContribution: String(rate.employerContribution),
  }
}

/** `2026-05-23` → `23 May 2026`; anything unparseable falls back to a dash. */
export function formatEffectiveDate(wef: string): string {
  const parsed = wef ? parseISO(wef) : null
  return parsed && isValid(parsed) ? format(parsed, 'dd MMM yyyy') : '—'
}

/** An audit timestamp as `23 May 2026, 14:30`; missing/unparseable → dash. */
export function formatTimestamp(value: string | null): string {
  const parsed = value ? parseISO(value) : null
  return parsed && isValid(parsed) ? format(parsed, 'dd MMM yyyy, HH:mm') : '—'
}

/** `12` → `December`, `0` → `Every Month`. */
export function formatMonth(month: string): string {
  return MONTH_OPTIONS.find((option) => option.value === month)?.label ?? '—'
}

/** Group-separated amount, e.g. `1,500`. */
export function formatAmount(value: number): string {
  return value.toLocaleString('en-IN')
}

/** Newest effective date first — the order the list and history both read in. */
export function sortByEffectiveDateDesc(rates: LwfRate[]): LwfRate[] {
  return [...rates].sort((a, b) => b.wef.localeCompare(a.wef))
}
