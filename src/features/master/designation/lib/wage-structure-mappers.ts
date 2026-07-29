import type { AuditFields } from '@/types/audit'
import type { WageStructureRow } from '../schemas'
import type { DesignationWageStructure } from '../types'
import { toOptionalAmount } from './designation-calculations'
import { deriveOvertimeRate, deriveWages } from './wage-structure-calculations'

/** The stored shape of a wage structure, minus the id and audit columns. */
export type WageStructureInput = Omit<
  DesignationWageStructure,
  'id' | 'designationId' | keyof AuditFields
>

/**
 * Map one validated draft row onto the stored wage structure. Settings behind a
 * switched-off act are dropped rather than kept as stale values, and the derived
 * side of each pair (wage per day, an auto overtime rate) is computed here so
 * the stored row is complete on its own.
 */
export function wageRowToStructure(row: WageStructureRow): WageStructureInput {
  const { basicPay, wagePerDay } = deriveWages(row)
  // Fixed days and a weekly off are alternatives, each owned by one calc type.
  const isFixedDays = row.workingDayCalculationType === 'Fixed'

  return {
    effectiveFrom: row.effectiveFrom,

    workingDayCalculationType: row.workingDayCalculationType || null,
    // "None" is a real answer on the form but reads as no weekly off stored.
    weeklyOff: row.weeklyOff === '' || row.weeklyOff === 'None' ? null : row.weeklyOff,
    workingDays: isFixedDays ? toOptionalAmount(row.workingDays) : null,
    salaryType: row.salaryType,
    basicPay,
    wagePerDay,
    extraDayAmountPerDay: toOptionalAmount(row.extraDayAmountPerDay),

    /*
     * Every head is on the grid, but only the ones given a value actually
     * apply — the rest are stored as `null` so the column stays in the row.
     *
     * The act markers are stored exactly as set. They're deliberately not gated
     * on this row's act toggles: the markers are always enabled on the grid, and
     * silently clearing one here would contradict what the user just ticked.
     */
    allowances: row.allowances.map((allowance) => ({
      head: allowance.head,
      valueType: allowance.valueType,
      amount: toOptionalAmount(allowance.amount),
      pfApplicable: allowance.pfApplicable,
      esicApplicable: allowance.esicApplicable,
      ptApplicable: allowance.ptApplicable,
    })),
    deductions: row.deductions.map((deduction) => ({
      head: deduction.head,
      valueType: deduction.valueType,
      amount: toOptionalAmount(deduction.amount),
    })),

    overtimeApplicable: row.overtimeApplicable,
    overtimeCalculationType: row.overtimeApplicable
      ? row.overtimeCalculationType || null
      : null,
    overtimeRatePerHour: deriveOvertimeRate(row),

    pfActApplicable: row.pfActApplicable,
    employeePfContributionOnWageLimit:
      row.pfActApplicable && row.employeePfContributionOnWageLimit,
    employerPfContributionOnWageLimit:
      row.pfActApplicable && row.employerPfContributionOnWageLimit,
    pfValueType: row.pfValueType,
    pfValue: row.pfActApplicable ? toOptionalAmount(row.pfValue) : null,

    esicActApplicable: row.esicActApplicable,
    esicDeductionBasis: row.esicActApplicable
      ? ((row.esicDeductionBasis || null) as DesignationWageStructure['esicDeductionBasis'])
      : null,

    ptActApplicable: row.ptActApplicable,
    ptActType: row.ptActApplicable ? row.ptActType || null : null,
    ptAmount:
      row.ptActApplicable && row.ptActType === 'Manual'
        ? toOptionalAmount(row.ptAmount)
        : null,

    lwfActApplicable: row.lwfActApplicable,
    lwfActType: row.lwfActApplicable ? row.lwfActType || null : null,
    lwfAmount:
      row.lwfActApplicable && row.lwfActType === 'Manual'
        ? toOptionalAmount(row.lwfAmount)
        : null,
  }
}
