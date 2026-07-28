import { mockDelay } from '@/lib/utils'
import { createdStamp, updatedStamp } from '@/lib/audit'
import { lwfOfficeAddressFromFormValues } from '../lib/lwf-office-address-mappers'
import type { LwfOfficeAddressFormValues } from '../schemas'
import type { LwfOfficeAddress } from '../types'

/**
 * In-memory LWF office address store. No backend yet — records live here for
 * the session. Swap each function's body for the matching REST call when the
 * API lands; the signatures stay the same.
 */

let addresses: LwfOfficeAddress[] = [
  {
    id: 1,
    officeName: 'Surat Welfare Commissioner Office',
    officeCode: 'GJ/SRT/LWF',
    mobile: '9876543210',
    phone: '0261-2345678',
    email: 'wc.surat@glwb.gujarat.gov.in',
    addressLine1: 'Shram Kalyan Bhavan',
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
    officeName: 'Ahmedabad Labour Welfare Board Office',
    officeCode: 'GJ/AHD/LWF',
    mobile: '9825012345',
    phone: '',
    email: 'lwb.ahmedabad@glwb.gujarat.gov.in',
    addressLine1: 'Shram Kalyan Bhavan',
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

/** LWF office codes are unique when supplied — the code itself is optional. */
function assertCodeFree(officeCode: string, ignoreId?: number) {
  if (!officeCode.trim()) return
  const clash = addresses.some(
    (a) => a.officeCode.toLowerCase() === officeCode.toLowerCase() && a.id !== ignoreId,
  )
  if (clash) throw new Error('An LWF office with this code already exists')
}

export async function fetchLwfOfficeAddresses(): Promise<LwfOfficeAddress[]> {
  return mockDelay([...addresses])
}

export async function fetchLwfOfficeAddress(id: number): Promise<LwfOfficeAddress> {
  const found = addresses.find((a) => a.id === id)
  if (!found) throw new Error('LWF office address not found')
  return mockDelay({ ...found })
}

export async function createLwfOfficeAddress(
  values: LwfOfficeAddressFormValues,
): Promise<LwfOfficeAddress> {
  assertCodeFree(values.officeCode)
  const record: LwfOfficeAddress = {
    id: nextId(),
    ...lwfOfficeAddressFromFormValues(values),
    ...createdStamp(),
  }
  addresses = [record, ...addresses]
  return mockDelay({ ...record })
}

export async function updateLwfOfficeAddress(
  id: number,
  values: LwfOfficeAddressFormValues,
): Promise<LwfOfficeAddress> {
  const index = addresses.findIndex((a) => a.id === id)
  if (index === -1) throw new Error('LWF office address not found')
  assertCodeFree(values.officeCode, id)
  const updated: LwfOfficeAddress = {
    ...addresses[index],
    ...lwfOfficeAddressFromFormValues(values),
    ...updatedStamp(),
  }
  addresses = addresses.map((a) => (a.id === id ? updated : a))
  return mockDelay({ ...updated })
}

export async function deleteLwfOfficeAddress(id: number): Promise<void> {
  addresses = addresses.filter((a) => a.id !== id)
  return mockDelay(undefined)
}
