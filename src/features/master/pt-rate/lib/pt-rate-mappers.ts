import { format, isValid, parseISO } from 'date-fns'
import type {
  PtRateFormValues,
  PtRatePayload,
  PtRateResponse,
  PtSlabFormValues,
  PtSlabPayload,
  PtSlabResponse,
} from '../schemas'
import type { PtRate, PtRateSlab } from '../types'

/** Parse a validated slab row into the slab half of the request body. */
function slabToPayload(slab: PtSlabFormValues): PtSlabPayload {
  return {
    min_salary: Number(slab.minSalary),
    // Blank stays blank: `null` is the open-ended "and above" band.
    max_salary: slab.maxSalary.trim() === '' ? null : Number(slab.maxSalary),
    amount: Number(slab.amount),
    month: slab.month,
    gender: slab.gender,
    // The API takes the age as a string; blank means age doesn't matter.
    min_age: slab.minAge.trim() === '' ? null : slab.minAge.trim(),
  }
}

/** API slab → the UI slab. Nullable values read as 0 / `null`. */
function toPtRateSlab(slab: PtSlabResponse): PtRateSlab {
  return {
    minSalary: Number(slab.min_salary ?? 0),
    maxSalary: slab.max_salary === null ? null : Number(slab.max_salary),
    amount: Number(slab.amount ?? 0),
    month: slab.month ?? '0',
    gender: slab.gender ?? 'Both',
    minAge:
      slab.min_age === null || slab.min_age.trim() === '' ? null : Number(slab.min_age),
  }
}

/**
 * API record → the UI rate, slabs and all. Since the API only tracks
 * `created_at` the rest of the audit trail stays empty (the audit columns render
 * a dash for it).
 *
 * The record only carries `state_id`, so the state's name is looked up by the
 * caller (the API layer owns the state master) and passed in — a state the
 * lookup can't resolve reads as a dash rather than a blank cell.
 */
export function toPtRate(response: PtRateResponse, stateName?: string): PtRate {
  return {
    id: response.id,
    wef: response.effective_date ?? '',
    stateId: response.state_id ?? 0,
    stateName: stateName ?? '—',
    detail: response.detail ?? '',
    slabs: response.details.map(toPtRateSlab),
    createdBy: '',
    createdAt: response.created_at,
    updatedBy: null,
    updatedAt: null,
  }
}

/**
 * Validated form values → the create/update request body. The slabs go along as
 * `details`, so one save writes the rate and its whole slab set together.
 */
export function ptRateToPayload(values: PtRateFormValues): PtRatePayload {
  return {
    effective_date: values.wef,
    state_id: Number(values.stateId),
    detail: values.detail.trim(),
    details: values.slabs.map(slabToPayload),
  }
}

/** Hydrate the edit form from a stored PT rate. */
export function ptRateToFormValues(rate: PtRate): PtRateFormValues {
  return {
    wef: rate.wef,
    stateId: String(rate.stateId),
    detail: rate.detail,
    slabs: rate.slabs.map((slab) => ({
      minSalary: String(slab.minSalary),
      maxSalary: slab.maxSalary === null ? '' : String(slab.maxSalary),
      amount: String(slab.amount),
      month: slab.month,
      gender: slab.gender,
      minAge: slab.minAge === null ? '' : String(slab.minAge),
    })),
  }
}

/** `2026-05-23` → `23 May 2026`; anything unparseable falls back to a dash. */
export function formatEffectiveDate(wef: string): string {
  const parsed = wef ? parseISO(wef) : null
  return parsed && isValid(parsed) ? format(parsed, 'dd MMM yyyy') : '—'
}
