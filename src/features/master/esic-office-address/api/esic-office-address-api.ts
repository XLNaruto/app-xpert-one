import { mockDelay } from '@/lib/utils'
import { createdStamp, updatedStamp } from '@/lib/audit'
import { esicOfficeAddressFromFormValues } from '../lib/esic-office-address-mappers'
import type { EsicOfficeAddressFormValues } from '../schemas'
import type { EsicOfficeAddress } from '../types'

/**
 * In-memory ESIC office address store. No backend yet — records live here for
 * the session. Swap each function's body for the matching REST call when the
 * API lands; the signatures stay the same.
 */

let addresses: EsicOfficeAddress[] = [
  {
    id: 1,
    officeName: 'Surat Regional Office',
    officeCode: 'GJ/SRT/ESIC',
    mobile: '9876543210',
    phone: '0261-2345678',
    email: 'ro.surat@esic.nic.in',
    addressLine1: 'Panchdeep Bhawan',
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
    officeName: 'Ahmedabad Branch Office',
    officeCode: 'GJ/AHD/ESIC',
    mobile: '9825012345',
    phone: '',
    email: 'bo.ahmedabad@esic.nic.in',
    addressLine1: 'Panchdeep Bhawan',
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

/** ESIC office codes are unique when supplied — the code itself is optional. */
function assertCodeFree(officeCode: string, ignoreId?: number) {
  if (!officeCode.trim()) return
  const clash = addresses.some(
    (a) => a.officeCode.toLowerCase() === officeCode.toLowerCase() && a.id !== ignoreId,
  )
  if (clash) throw new Error('An ESIC office with this code already exists')
}

export async function fetchEsicOfficeAddresses(): Promise<EsicOfficeAddress[]> {
  return mockDelay([...addresses])
}

export async function fetchEsicOfficeAddress(id: number): Promise<EsicOfficeAddress> {
  const found = addresses.find((a) => a.id === id)
  if (!found) throw new Error('ESIC office address not found')
  return mockDelay({ ...found })
}

export async function createEsicOfficeAddress(
  values: EsicOfficeAddressFormValues,
): Promise<EsicOfficeAddress> {
  assertCodeFree(values.officeCode)
  const record: EsicOfficeAddress = {
    id: nextId(),
    ...esicOfficeAddressFromFormValues(values),
    ...createdStamp(),
  }
  addresses = [record, ...addresses]
  return mockDelay({ ...record })
}

export async function updateEsicOfficeAddress(
  id: number,
  values: EsicOfficeAddressFormValues,
): Promise<EsicOfficeAddress> {
  const index = addresses.findIndex((a) => a.id === id)
  if (index === -1) throw new Error('ESIC office address not found')
  assertCodeFree(values.officeCode, id)
  const updated: EsicOfficeAddress = {
    ...addresses[index],
    ...esicOfficeAddressFromFormValues(values),
    ...updatedStamp(),
  }
  addresses = addresses.map((a) => (a.id === id ? updated : a))
  return mockDelay({ ...updated })
}

export async function deleteEsicOfficeAddress(id: number): Promise<void> {
  addresses = addresses.filter((a) => a.id !== id)
  return mockDelay(undefined)
}
