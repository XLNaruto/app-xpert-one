import { mockDelay } from '@/lib/utils'
import { createdStamp, updatedStamp } from '@/lib/audit'
import { employmentExchangeOfficeAddressFromFormValues } from '../lib/employment-exchange-office-address-mappers'
import type { EmploymentExchangeOfficeAddressFormValues } from '../schemas'
import type { EmploymentExchangeOfficeAddress } from '../types'

/**
 * In-memory employment exchange office address store. No backend yet — records live here for
 * the session. Swap each function's body for the matching REST call when the
 * API lands; the signatures stay the same.
 */

let addresses: EmploymentExchangeOfficeAddress[] = [
  {
    id: 1,
    officeName: 'Surat Employment Exchange',
    officeCode: 'GJ/SRT/EX',
    mobile: '9876543210',
    phone: '0261-2345678',
    email: 'ee.surat@gujarat.gov.in',
    addressLine1: 'District Employment Exchange Office',
    addressLine2: 'Ring Road',
    addressLine3: '',
    state: 'Gujarat',
    district: 'Surat',
    city: 'Surat',
    pinCode: '395002',
    createdBy: 'Roman Rings',
    createdAt: '2026-03-24T12:18:27.071Z',
    updatedBy: null,
    updatedAt: null,
  },
  {
    id: 2,
    officeName: 'Ahmedabad Employment Exchange',
    officeCode: 'GJ/AHD/EX',
    mobile: '9825012345',
    phone: '',
    email: 'ee.ahmedabad@gujarat.gov.in',
    addressLine1: 'District Employment Exchange Office',
    addressLine2: 'Ashram Road',
    addressLine3: '',
    state: 'Gujarat',
    district: 'Ahmedabad',
    city: 'Ahmedabad',
    pinCode: '380009',
    createdBy: 'John Cena',
    createdAt: '2026-02-20T13:09:12.929Z',
    updatedBy: 'Roman Rings',
    updatedAt: '2026-04-28T11:25:32.772Z',
  },
]

function nextId(): number {
  return addresses.reduce((max, a) => Math.max(max, a.id), 0) + 1
}

/** Employment exchange office codes are unique when supplied — the code itself is optional. */
function assertCodeFree(officeCode: string, ignoreId?: number) {
  if (!officeCode.trim()) return
  const clash = addresses.some(
    (a) => a.officeCode.toLowerCase() === officeCode.toLowerCase() && a.id !== ignoreId,
  )
  if (clash) throw new Error('An employment exchange office with this code already exists')
}

export async function fetchEmploymentExchangeOfficeAddresses(): Promise<EmploymentExchangeOfficeAddress[]> {
  return mockDelay([...addresses])
}

export async function fetchEmploymentExchangeOfficeAddress(id: number): Promise<EmploymentExchangeOfficeAddress> {
  const found = addresses.find((a) => a.id === id)
  if (!found) throw new Error('employment exchange office address not found')
  return mockDelay({ ...found })
}

export async function createEmploymentExchangeOfficeAddress(
  values: EmploymentExchangeOfficeAddressFormValues,
): Promise<EmploymentExchangeOfficeAddress> {
  assertCodeFree(values.officeCode)
  const record: EmploymentExchangeOfficeAddress = {
    id: nextId(),
    ...employmentExchangeOfficeAddressFromFormValues(values),
    ...createdStamp(),
  }
  addresses = [record, ...addresses]
  return mockDelay({ ...record })
}

export async function updateEmploymentExchangeOfficeAddress(
  id: number,
  values: EmploymentExchangeOfficeAddressFormValues,
): Promise<EmploymentExchangeOfficeAddress> {
  const index = addresses.findIndex((a) => a.id === id)
  if (index === -1) throw new Error('employment exchange office address not found')
  assertCodeFree(values.officeCode, id)
  const updated: EmploymentExchangeOfficeAddress = {
    ...addresses[index],
    ...employmentExchangeOfficeAddressFromFormValues(values),
    ...updatedStamp(),
  }
  addresses = addresses.map((a) => (a.id === id ? updated : a))
  return mockDelay({ ...updated })
}

export async function deleteEmploymentExchangeOfficeAddress(id: number): Promise<void> {
  addresses = addresses.filter((a) => a.id !== id)
  return mockDelay(undefined)
}
