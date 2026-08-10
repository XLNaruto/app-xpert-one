import type { AuditFields } from '@/types/audit'

/** One week of a rotation cycle — which shift is worked in that week. */
export interface RotationWeek {
  id: number
  /** 1-based position in the cycle. */
  weekNumber: number
  shiftId: number
}

/**
 * A rotation cycle as consumed by the UI — a named ring of shifts an employee
 * walks a week at a time.
 *
 * The cycle is anchored per assignment, not globally: week 1 starts at each
 * employee's own `effective_date`, so two people put on the same rotation a week
 * apart are legitimately out of phase.
 */
export interface ShiftRotation extends AuditFields {
  id: number
  /** The tenant the rotation belongs to — the same one its shifts belong to. */
  companyId: number
  name: string
  /** How many weeks before the cycle repeats (1–52). */
  cycleLengthWeeks: number
  status: boolean
  /** The whole cycle, week 1 first — never a partial list. */
  weeks: RotationWeek[]
}
