import { format, isValid, parseISO } from 'date-fns'
import { MONTH_OPTIONS } from '../constants'
import type { PtRateFormValues, PtSlabFormValues } from '../schemas'
import type { PtRate, PtRateSlab, PtRateSlabRow } from '../types'

/** Parse a validated slab row into the stored numeric shape. */
function slabFromFormValues(slab: PtSlabFormValues): PtRateSlab {
  return {
    minSalary: Number(slab.minSalary),
    // Blank stays blank: `null` is the open-ended "and above" band.
    maxSalary: slab.maxSalary.trim() === '' ? null : Number(slab.maxSalary),
    amount: Number(slab.amount),
    month: slab.month,
    gender: slab.gender,
    minAge: slab.minAge.trim() === '' ? null : Number(slab.minAge),
  }
}

/** The user-editable half of a rate — identity and audit fields are the API's. */
export type PtRateEditableFields = Pick<
  PtRate,
  'wef' | 'stateId' | 'stateName' | 'detail' | 'slabs'
>

/**
 * Parse validated form values into the stored record. The state name is looked
 * up by the caller (the API layer owns the state master) and passed in.
 */
export function ptRateFromFormValues(
  values: PtRateFormValues,
  stateName: string,
): PtRateEditableFields {
  return {
    wef: values.wef,
    stateId: Number(values.stateId),
    stateName,
    detail: values.detail.trim(),
    slabs: values.slabs.map(slabFromFormValues),
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

/** An audit timestamp as `23 May 2026, 14:30`; missing/unparseable → dash. */
export function formatTimestamp(value: string | null): string {
  const parsed = value ? parseISO(value) : null
  return parsed && isValid(parsed) ? format(parsed, 'dd MMM yyyy, HH:mm') : '—'
}

/** `12` → `December`, `0` → `Every Month`. */
export function formatMonth(month: string): string {
  return MONTH_OPTIONS.find((option) => option.value === month)?.label ?? '—'
}

/** Group-separated amount, e.g. `1,50,000`. */
export function formatAmount(value: number): string {
  return value.toLocaleString('en-IN')
}

/** The band as one readable range — an open-ended band reads as "… & Above". */
export function formatSalaryRange(slab: Pick<PtRateSlab, 'minSalary' | 'maxSalary'>): string {
  const from = formatAmount(slab.minSalary)
  return slab.maxSalary === null
    ? `${from} & Above`
    : `${from} – ${formatAmount(slab.maxSalary)}`
}

/** Newest effective date first — the order the list and history both read in. */
export function sortByEffectiveDateDesc(rates: PtRate[]): PtRate[] {
  return [...rates].sort((a, b) => b.wef.localeCompare(a.wef))
}

/**
 * Flatten rates into one row per slab for the history table, so a reviewer sees
 * every superseded band next to the date it applied from.
 */
export function toSlabRows(rates: PtRate[]): PtRateSlabRow[] {
  return sortByEffectiveDateDesc(rates).flatMap((rate) =>
    rate.slabs.map((slab, index) => ({
      ...slab,
      rowId: `${rate.id}-${index}`,
      rateId: rate.id,
      wef: rate.wef,
    })),
  )
}
