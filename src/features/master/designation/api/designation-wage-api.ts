import { mockDelay } from '@/lib/utils'
import { createdStamp } from '@/lib/audit'
import { WAGE_ALLOWANCE_HEADS, WAGE_DEDUCTION_HEADS } from '../constants'
import { byEffectiveMonthDesc } from '../lib/effective-month'
import type { WageStructureInput } from '../lib/wage-structure-mappers'
import type { DesignationWageStructure } from '../types'

/**
 * In-memory wage structure history. No backend yet — rows live here for the
 * session. Swap each function's body for the matching REST call when the API
 * lands; the signatures stay the same.
 *
 * History is append-only: a row applies from its effective month onward until a
 * later row supersedes it, so there is no update or delete for saved rows.
 */

/** Seed helper — value every allowance head the same, for one readable row. */
function seedAllowances(
  amount: number,
  valueType: 'Percentage' | 'Fixed' = 'Fixed',
): DesignationWageStructure['allowances'] {
  return WAGE_ALLOWANCE_HEADS.map((head) => ({
    head: head.code,
    valueType,
    amount,
    pfApplicable: true,
    esicApplicable: true,
    ptApplicable: false,
  }))
}

/** Seed helper — value every deduction head the same. */
function seedDeductions(amount: number): DesignationWageStructure['deductions'] {
  return WAGE_DEDUCTION_HEADS.map((head) => ({
    head: head.code,
    valueType: 'Fixed' as const,
    amount,
  }))
}

/** One opening row, so the history reads as established rather than empty. */
let structures: DesignationWageStructure[] = [
  {
    id: 1,
    designationId: 1,
    effectiveFrom: '2026-08',
    workingDayCalculationType: 'As Per Calculation',
    weeklyOff: 'Sunday',
    workingDays: null,
    salaryType: 'Monthly',
    basicPay: 10000,
    wagePerDay: 384.62,
    extraDayAmountPerDay: 500,
    allowances: seedAllowances(250),
    deductions: seedDeductions(100),
    overtimeApplicable: true,
    overtimeCalculationType: 'Auto',
    overtimeRatePerHour: 96.16,
    pfActApplicable: true,
    employeePfContributionOnWageLimit: true,
    employerPfContributionOnWageLimit: true,
    pfValueType: 'Percentage',
    pfValue: 12,
    esicActApplicable: true,
    esicDeductionBasis: 'Wage Ceiling',
    ptActApplicable: true,
    ptActType: 'Manual',
    ptAmount: 200,
    lwfActApplicable: true,
    lwfActType: 'As Per Act',
    lwfAmount: null,
    createdBy: 'Roman Rings',
    createdAt: '2026-07-04T05:12:44.221Z',
    updatedBy: null,
    updatedAt: null,
  },
]

function nextId(): number {
  return structures.reduce((max, s) => Math.max(max, s.id), 0) + 1
}

/** GET /designations/:id/wage-structures — the history, most recent first. */
export async function fetchDesignationWageStructures(
  designationId: number,
): Promise<DesignationWageStructure[]> {
  const rows = structures
    .filter((s) => s.designationId === designationId)
    .sort(byEffectiveMonthDesc)
  return mockDelay(rows.map((row) => ({ ...row })))
}

/**
 * POST /designations/:id/wage-structures — append the drafted rows. Returns the
 * refreshed history so the caller can seed the cache from one round trip.
 */
export async function createDesignationWageStructures(
  designationId: number,
  rows: WageStructureInput[],
): Promise<DesignationWageStructure[]> {
  const created = rows.map((row, index) => ({
    id: nextId() + index,
    designationId,
    ...row,
    ...createdStamp(),
  }))
  structures = [...structures, ...created]
  return fetchDesignationWageStructures(designationId)
}
