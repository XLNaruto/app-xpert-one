import { mockDelay } from '@/lib/utils'
import { ALL_ROWS, paginate, type PageParams, type Paginated } from '@/lib/pagination'
import { createdStamp, updatedStamp } from '@/lib/audit'
import type { AllowanceDeductionFormValues } from '../schemas'
import type { AllowanceDeduction } from '../types'

/**
 * In-memory allowance / deduction master store. No backend yet — records live
 * here for the session. Swap each function's body for the matching REST call
 * when the API lands; the signatures stay the same.
 */

let records: AllowanceDeduction[] = [
  {
    id: 1,
    type: 'ALLOWANCE',
    name: 'House Rent Allowance',
    shortName: 'HRA',
    createdBy: 'Roman Rings',
    createdAt: '2026-03-11T10:12:04.221Z',
    updatedBy: null,
    updatedAt: null,
  },
  {
    id: 2,
    type: 'ALLOWANCE',
    name: 'Conveyance Allowance',
    shortName: 'CA',
    createdBy: 'Rohan Sanghani',
    createdAt: '2026-03-14T07:41:19.508Z',
    updatedBy: 'Rohan Sanghani',
    updatedAt: '2026-04-02T12:05:33.870Z',
  },
  {
    id: 3,
    type: 'DEDUCTION',
    name: 'Professional Tax',
    shortName: 'PT',
    createdBy: 'Rohan Sanghani',
    createdAt: '2026-03-20T09:02:55.113Z',
    updatedBy: null,
    updatedAt: null,
  },
]

function nextId(): number {
  return records.reduce((max, r) => Math.max(max, r.id), 0) + 1
}

/** Map validated form values onto the stored fields shared by create + update. */
function applyForm(values: AllowanceDeductionFormValues) {
  return {
    type: values.type,
    name: values.name.trim(),
    shortName: values.shortName.trim(),
  }
}

/** Record fields the list screen's search box matches against. */
const SEARCH_FIELDS: readonly (keyof AllowanceDeduction)[] = ['name', 'shortName']

export async function fetchAllowanceDeductions(params: PageParams = ALL_ROWS): Promise<Paginated<AllowanceDeduction>> {
  return mockDelay(paginate([...records], params, SEARCH_FIELDS))
}

export async function fetchAllowanceDeduction(
  id: number,
): Promise<AllowanceDeduction> {
  const found = records.find((r) => r.id === id)
  if (!found) throw new Error('Allowance / deduction not found')
  return mockDelay({ ...found })
}

export async function createAllowanceDeduction(
  values: AllowanceDeductionFormValues,
): Promise<AllowanceDeduction> {
  const record: AllowanceDeduction = {
    id: nextId(),
    ...applyForm(values),
    ...createdStamp(),
  }
  records = [record, ...records]
  return mockDelay({ ...record })
}

export async function updateAllowanceDeduction(
  id: number,
  values: AllowanceDeductionFormValues,
): Promise<AllowanceDeduction> {
  const index = records.findIndex((r) => r.id === id)
  if (index === -1) throw new Error('Allowance / deduction not found')
  const updated: AllowanceDeduction = {
    ...records[index],
    ...applyForm(values),
    ...updatedStamp(),
  }
  records = records.map((r) => (r.id === id ? updated : r))
  return mockDelay({ ...updated })
}

export async function deleteAllowanceDeduction(id: number): Promise<void> {
  records = records.filter((r) => r.id !== id)
  return mockDelay(undefined)
}
