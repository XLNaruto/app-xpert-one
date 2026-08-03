import { format, isValid, parseISO } from 'date-fns'
import { MONTH_OPTIONS } from '../constants'
import type { LwfRateFormValues, LwfRatePayload, LwfRateResponse } from '../schemas'
import type { LwfRate } from '../types'

/**
 * API record → the UI rate. Nullable values read as 0 / an empty string, and
 * since the API only tracks `created_at` the rest of the audit trail stays empty
 * (the audit columns render a dash for it).
 *
 * The record only carries `state_id`, so the state's name is looked up by the
 * caller (the API layer owns the state master) and passed in — a state the
 * lookup can't resolve reads as a dash rather than a blank cell.
 */
export function toLwfRate(response: LwfRateResponse, stateName?: string): LwfRate {
  return {
    id: response.id,
    wef: response.effective_date ?? '',
    stateId: response.state_id ?? 0,
    stateName: stateName ?? '—',
    month: response.month ?? '',
    employeeContribution: Number(response.employee_contribution ?? 0),
    employerContribution: Number(response.employer_contribution ?? 0),
    createdBy: '',
    createdAt: response.created_at,
    updatedBy: null,
    updatedAt: null,
  }
}

/** Validated form values → the create/update request body. */
export function lwfRateToPayload(values: LwfRateFormValues): LwfRatePayload {
  return {
    effective_date: values.wef,
    state_id: Number(values.stateId),
    month: values.month,
    employee_contribution: Number(values.employeeContribution),
    employer_contribution: Number(values.employerContribution),
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
