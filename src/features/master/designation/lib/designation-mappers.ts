import type { DesignationFormValues } from '../schemas'
import type { Designation } from '../types'
import { toOptionalAmount } from './designation-calculations'

/** Hydrate the edit form from a stored designation. */
export function designationToFormValues(
  designation: Designation,
): DesignationFormValues {
  const optional = (value: number | null) => (value === null ? '' : String(value))
  // A cleared dropdown round-trips as '' on the form and null on the record.
  const chosen = <T extends string>(value: T | null): T | '' => value ?? ''

  return {
    designationName: designation.designationName,

    salaryType: designation.salaryType ?? '',
    basicPay: String(designation.basicPay),
    workingDayCalculationType: chosen(designation.workingDayCalculationType),
    workingDays: optional(designation.workingDays),
    weeklyOff: designation.weeklyOff ?? '',
    extraDayAmountPerDay: optional(designation.extraDayAmountPerDay),

    pfActApplicable: designation.pfActApplicable,
    pfDeductionType: chosen(designation.pfDeductionType),
    // One input backs both modes — seed it from whichever side the record used.
    pfDeductionValue: optional(
      designation.pfDeductionType === 'Fixed'
        ? designation.pfDeductionAmount
        : designation.pfDeductionPercentage,
    ),
    employeePfContributionOnWageLimit: designation.employeePfContributionOnWageLimit,
    employerPfContributionOnWageLimit: designation.employerPfContributionOnWageLimit,

    esicActApplicable: designation.esicActApplicable,
    esicDeductionBasis: designation.esicDeductionBasis ?? '',

    ptActApplicable: designation.ptActApplicable,
    ptActType: chosen(designation.ptActType),
    ptAmount: optional(designation.ptAmount),

    lwfActApplicable: designation.lwfActApplicable,
    lwfActType: chosen(designation.lwfActType),
    lwfAmount: optional(designation.lwfAmount),

    overtimeApplicable: designation.overtimeApplicable,
    overtimeCalculationType: chosen(designation.overtimeCalculationType),
    overtimeRatePerHour: optional(designation.overtimeRatePerHour),

    allowances: designation.allowances.map((allowance) => ({
      componentId: String(allowance.componentId),
      valueType: allowance.valueType,
      amount: optional(allowance.amount),
      pfApplicable: allowance.pfApplicable,
      esicApplicable: allowance.esicApplicable,
      ptApplicable: allowance.ptApplicable,
    })),
    deductions: designation.deductions.map((componentId) => ({
      componentId: String(componentId),
    })),
  }
}

/**
 * Map validated form values onto the stored record. Settings behind a switched
 * off act are dropped rather than kept as stale values, so a designation never
 * carries a PF percentage it doesn't use.
 */
export function formValuesToDesignation(values: DesignationFormValues) {
  // Each mode owns exactly one field; with no mode chosen, neither is stored.
  const isFixedDays = values.workingDayCalculationType === 'Fixed'
  const isCalculatedDays = values.workingDayCalculationType === 'As Per Calculation'

  return {
    designationName: values.designationName.trim(),

    salaryType: values.salaryType || null,
    basicPay: Number(values.basicPay),
    workingDayCalculationType: values.workingDayCalculationType || null,
    workingDays: isFixedDays ? toOptionalAmount(values.workingDays) : null,
    weeklyOff: isCalculatedDays ? values.weeklyOff || null : null,
    extraDayAmountPerDay: toOptionalAmount(values.extraDayAmountPerDay),

    pfActApplicable: values.pfActApplicable,
    pfDeductionType: values.pfActApplicable ? values.pfDeductionType || null : null,
    // The single form input lands on the side its deduction type calls for.
    pfDeductionPercentage:
      values.pfActApplicable && values.pfDeductionType === 'Percentage'
        ? toOptionalAmount(values.pfDeductionValue)
        : null,
    pfDeductionAmount:
      values.pfActApplicable && values.pfDeductionType === 'Fixed'
        ? toOptionalAmount(values.pfDeductionValue)
        : null,
    employeePfContributionOnWageLimit:
      values.pfActApplicable && values.employeePfContributionOnWageLimit,
    employerPfContributionOnWageLimit:
      values.pfActApplicable && values.employerPfContributionOnWageLimit,

    esicActApplicable: values.esicActApplicable,
    esicDeductionBasis: values.esicActApplicable
      ? values.esicDeductionBasis || null
      : null,

    ptActApplicable: values.ptActApplicable,
    ptActType: values.ptActApplicable ? values.ptActType || null : null,
    ptAmount:
      values.ptActApplicable && values.ptActType === 'Manual'
        ? toOptionalAmount(values.ptAmount)
        : null,

    lwfActApplicable: values.lwfActApplicable,
    lwfActType: values.lwfActApplicable ? values.lwfActType || null : null,
    lwfAmount:
      values.lwfActApplicable && values.lwfActType === 'Manual'
        ? toOptionalAmount(values.lwfAmount)
        : null,

    overtimeApplicable: values.overtimeApplicable,
    overtimeCalculationType: values.overtimeApplicable
      ? values.overtimeCalculationType || null
      : null,
    overtimeRatePerHour:
      values.overtimeApplicable && values.overtimeCalculationType === 'Manual'
        ? toOptionalAmount(values.overtimeRatePerHour)
        : null,

    /*
     * Every head in the master is on the form, but only the ones given a value
     * actually apply — the rest are dropped rather than stored as empty rows.
     * An allowance can only count towards an act the designation is covered by.
     */
    allowances: values.allowances
      .filter((row) => row.componentId !== '' && row.amount !== '')
      .map((row) => ({
        componentId: Number(row.componentId),
        valueType: row.valueType,
        amount: toOptionalAmount(row.amount),
        pfApplicable: values.pfActApplicable && row.pfApplicable,
        esicApplicable: values.esicActApplicable && row.esicApplicable,
        ptApplicable: values.ptActApplicable && row.ptApplicable,
      })),
    deductions: values.deductions
      .filter((row) => row.componentId !== '')
      .map((row) => Number(row.componentId)),
  }
}
