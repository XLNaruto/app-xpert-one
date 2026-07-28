import { mockDelay } from '@/lib/utils'
import { createdStamp, updatedStamp } from '@/lib/audit'
import type { AuditFields } from '@/types/audit'
import type { BranchFormValues } from '../schemas'
import type { Branch } from '../types'

/**
 * In-memory branch store. No backend yet — this module holds the records for
 * the session so create/edit/delete stay consistent across screens. When the
 * API lands, swap each function's body for the matching REST call and map the
 * response to `Branch`; the signatures stay the same.
 */

/** Blank stored fields — every optional column starts out `null`. */
const EMPTY_RECORD: Omit<
  Branch,
  'id' | 'branchName' | 'addressLine1' | keyof AuditFields
> = {
  addressLine2: null,
  addressLine3: null,
  state: null,
  district: null,
  city: null,
  pinCode: null,
  pfCode: null,
  epfActDate: null,
  fpfActDate: null,
  pfState: null,
  pfDistrict: null,
  pfOfficeAddress: null,
  pfUsername: null,
  pfPassword: null,
  esicCode: null,
  esicDeductsOn: null,
  esicRegistrationDate: null,
  esicState: null,
  esicDistrict: null,
  esicOfficeAddress: null,
  esicUsername: null,
  esicPassword: null,
  factoryActDate: null,
  factoryLicenseNumber: null,
  factoryFinNumber: null,
  employeeCount: null,
  electricHorsePower: null,
  licenseExpiryDate: null,
  stabilityExpiryDate: null,
  ptRegistrationDate: null,
  pecRegistrationNumber: null,
  prcRegistrationNumber: null,
  corporationName: null,
  lwfRegistrationDate: null,
  lwfRegistrationNumber: null,
  lwfOfficeAddressId: null,
  lwfUsername: null,
  lwfPassword: null,
  eeRegistrationDate: null,
  eeRegistrationNumber: null,
}

let branches: Branch[] = [
  {
    ...EMPTY_RECORD,
    id: 1,
    branchName: 'Surat — Head Office',
    addressLine1: '4th Floor, Silver Business Point',
    addressLine2: 'VIP Circle, Uttran',
    state: 'Gujarat',
    district: 'Surat',
    city: 'Surat',
    pinCode: '394105',
    pfCode: 'GJSRT0012345',
    epfActDate: '2016-04-01',
    pfState: 'Gujarat',
    pfDistrict: 'Surat',
    esicCode: '37000123450000999',
    esicDeductsOn: 'Gross Salary',
    esicRegistrationDate: '2016-06-15',
    esicState: 'Gujarat',
    esicDistrict: 'Surat',
    createdBy: 'Roman Rings',
    createdAt: '2016-04-01T09:30:00.000Z',
    updatedBy: 'John Cena',
    updatedAt: '2024-11-19T08:55:00.000Z',
  },
  {
    ...EMPTY_RECORD,
    id: 2,
    branchName: 'Mumbai — Regional',
    addressLine1: '12 MG Road',
    state: 'Maharashtra',
    district: 'Mumbai',
    city: 'Mumbai',
    pinCode: '400001',
    factoryActDate: '2019-02-11',
    factoryLicenseNumber: 'MH/FAC/2019/8821',
    employeeCount: '46',
    createdBy: 'John Cena',
    createdAt: '2019-02-11T09:30:00.000Z',
    updatedBy: null,
    updatedAt: null,
  },
]

/** Next auto-increment id (max existing + 1). */
function nextId(): number {
  return branches.reduce((max, b) => Math.max(max, b.id), 0) + 1
}

/** Empty strings from the form become `null` for optional stored fields. */
function nullIfBlank(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Map validated form values onto the stored fields shared by create + update.
 * The form's keys mirror the record's, so everything but the two mandatory
 * fields is trimmed and nulled when blank.
 */
function applyForm(values: BranchFormValues): Omit<Branch, 'id' | keyof AuditFields> {
  const optional = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, nullIfBlank(value)]),
  )
  return {
    ...(optional as Omit<Branch, 'id' | keyof AuditFields>),
    branchName: values.branchName.trim(),
    addressLine1: values.addressLine1.trim(),
  }
}

export async function fetchBranches(): Promise<Branch[]> {
  return mockDelay([...branches])
}

export async function fetchBranch(id: number): Promise<Branch> {
  const found = branches.find((b) => b.id === id)
  if (!found) throw new Error('Branch not found')
  return mockDelay({ ...found })
}

export async function createBranch(values: BranchFormValues): Promise<Branch> {
  const branch: Branch = {
    id: nextId(),
    ...applyForm(values),
    ...createdStamp(),
  }
  branches = [branch, ...branches]
  return mockDelay({ ...branch })
}

export async function updateBranch(
  id: number,
  values: BranchFormValues,
): Promise<Branch> {
  const index = branches.findIndex((b) => b.id === id)
  if (index === -1) throw new Error('Branch not found')
  const updated: Branch = {
    ...branches[index],
    ...applyForm(values),
    ...updatedStamp(),
  }
  branches = branches.map((b) => (b.id === id ? updated : b))
  return mockDelay({ ...updated })
}

export async function deleteBranch(id: number): Promise<void> {
  branches = branches.filter((b) => b.id !== id)
  return mockDelay(undefined)
}
