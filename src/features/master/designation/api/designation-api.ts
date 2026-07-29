import { mockDelay } from '@/lib/utils'
import { createdStamp, updatedStamp } from '@/lib/audit'
import type { DesignationFormValues } from '../schemas'
import type { Designation } from '../types'
import { formValuesToDesignation } from '../lib/designation-mappers'

/**
 * In-memory designation master store. No backend yet — records live here for
 * the session. Swap each function's body for the matching REST call when the
 * API lands; the signatures stay the same.
 */

let designations: Designation[] = [
  {
    id: 1,
    designationName: 'Security Guard',
    salaryType: 'Fix',
    basicPay: 18000,
    workingDayCalculationType: 'Fixed',
    workingDays: 26,
    weeklyOff: null,
    extraDayAmountPerDay: 700,
    pfActApplicable: true,
    pfDeductionType: 'Percentage',
    pfDeductionPercentage: 12,
    pfDeductionAmount: null,
    employeePfContributionOnWageLimit: true,
    employerPfContributionOnWageLimit: false,
    esicActApplicable: true,
    esicDeductionBasis: 'Gross Salary',
    ptActApplicable: true,
    ptActType: 'As Per Act',
    ptAmount: null,
    lwfActApplicable: false,
    lwfActType: null,
    lwfAmount: null,
    overtimeApplicable: true,
    overtimeCalculationType: 'Manual',
    overtimeRatePerHour: 120,
    allowances: [
      {
        componentId: 1,
        valueType: 'Percentage',
        amount: 40,
        pfApplicable: true,
        esicApplicable: true,
        ptApplicable: false,
      },
      {
        componentId: 2,
        valueType: 'Fixed',
        amount: 1600,
        pfApplicable: false,
        esicApplicable: true,
        ptApplicable: false,
      },
    ],
    deductions: [3],
    createdBy: 'Minesh Solanki',
    createdAt: '2026-04-08T06:24:11.004Z',
    updatedBy: null,
    updatedAt: null,
  },
  {
    id: 2,
    designationName: 'Accountant',
    salaryType: 'Fix',
    basicPay: 32000,
    workingDayCalculationType: 'As Per Calculation',
    workingDays: null,
    weeklyOff: 'Sunday',
    extraDayAmountPerDay: null,
    pfActApplicable: true,
    pfDeductionType: 'Percentage',
    pfDeductionPercentage: 12,
    pfDeductionAmount: null,
    employeePfContributionOnWageLimit: false,
    employerPfContributionOnWageLimit: false,
    esicActApplicable: false,
    esicDeductionBasis: null,
    ptActApplicable: true,
    ptActType: 'Manual',
    ptAmount: 200,
    lwfActApplicable: true,
    lwfActType: 'As Per Act',
    lwfAmount: null,
    overtimeApplicable: false,
    overtimeCalculationType: null,
    overtimeRatePerHour: null,
    allowances: [
      {
        componentId: 1,
        valueType: 'Percentage',
        amount: 50,
        pfApplicable: true,
        esicApplicable: false,
        ptApplicable: true,
      },
    ],
    deductions: [3],
    createdBy: 'Rohan Sanghani',
    createdAt: '2026-04-19T11:02:48.612Z',
    updatedBy: 'Rohan Sanghani',
    updatedAt: '2026-05-06T08:15:20.330Z',
  },
]

function nextId(): number {
  return designations.reduce((max, d) => Math.max(max, d.id), 0) + 1
}

export async function fetchDesignations(): Promise<Designation[]> {
  return mockDelay([...designations])
}

export async function fetchDesignation(id: number): Promise<Designation> {
  const found = designations.find((d) => d.id === id)
  if (!found) throw new Error('Designation not found')
  return mockDelay({ ...found })
}

export async function createDesignation(
  values: DesignationFormValues,
): Promise<Designation> {
  const record: Designation = {
    id: nextId(),
    ...formValuesToDesignation(values),
    ...createdStamp(),
  }
  designations = [record, ...designations]
  return mockDelay({ ...record })
}

export async function updateDesignation(
  id: number,
  values: DesignationFormValues,
): Promise<Designation> {
  const index = designations.findIndex((d) => d.id === id)
  if (index === -1) throw new Error('Designation not found')
  const updated: Designation = {
    ...designations[index],
    ...formValuesToDesignation(values),
    ...updatedStamp(),
  }
  designations = designations.map((d) => (d.id === id ? updated : d))
  return mockDelay({ ...updated })
}

export async function deleteDesignation(id: number): Promise<void> {
  designations = designations.filter((d) => d.id !== id)
  return mockDelay(undefined)
}
