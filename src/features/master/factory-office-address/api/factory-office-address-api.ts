import { mockDelay } from '@/lib/utils'
import { createdStamp, updatedStamp } from '@/lib/audit'
import { factoryOfficeAddressFromFormValues } from '../lib/factory-office-address-mappers'
import type { FactoryOfficeAddressFormValues } from '../schemas'
import type { FactoryOfficeAddress } from '../types'

/**
 * In-memory factory office address store. No backend yet — records live here for
 * the session. Swap each function's body for the matching REST call when the
 * API lands; the signatures stay the same.
 */

let addresses: FactoryOfficeAddress[] = [
  {
    id: 1,
    officeName: 'Surat Factory Inspectorate',
    officeCode: 'GJ/SRT/FAC',
    mobile: '9876543210',
    phone: '0261-2345678',
    email: 'fi.surat@dish.gujarat.gov.in',
    addressLine1: 'Directorate of Industrial Safety & Health',
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
    officeName: 'Ahmedabad Factory Inspectorate',
    officeCode: 'GJ/AHD/FAC',
    mobile: '9825012345',
    phone: '',
    email: 'fi.ahmedabad@dish.gujarat.gov.in',
    addressLine1: 'Directorate of Industrial Safety & Health',
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

/** Factory inspectorate office codes are unique when supplied — the code itself is optional. */
function assertCodeFree(officeCode: string, ignoreId?: number) {
  if (!officeCode.trim()) return
  const clash = addresses.some(
    (a) => a.officeCode.toLowerCase() === officeCode.toLowerCase() && a.id !== ignoreId,
  )
  if (clash) throw new Error('A factory office with this code already exists')
}

export async function fetchFactoryOfficeAddresses(): Promise<FactoryOfficeAddress[]> {
  return mockDelay([...addresses])
}

export async function fetchFactoryOfficeAddress(id: number): Promise<FactoryOfficeAddress> {
  const found = addresses.find((a) => a.id === id)
  if (!found) throw new Error('factory office address not found')
  return mockDelay({ ...found })
}

export async function createFactoryOfficeAddress(
  values: FactoryOfficeAddressFormValues,
): Promise<FactoryOfficeAddress> {
  assertCodeFree(values.officeCode)
  const record: FactoryOfficeAddress = {
    id: nextId(),
    ...factoryOfficeAddressFromFormValues(values),
    ...createdStamp(),
  }
  addresses = [record, ...addresses]
  return mockDelay({ ...record })
}

export async function updateFactoryOfficeAddress(
  id: number,
  values: FactoryOfficeAddressFormValues,
): Promise<FactoryOfficeAddress> {
  const index = addresses.findIndex((a) => a.id === id)
  if (index === -1) throw new Error('factory office address not found')
  assertCodeFree(values.officeCode, id)
  const updated: FactoryOfficeAddress = {
    ...addresses[index],
    ...factoryOfficeAddressFromFormValues(values),
    ...updatedStamp(),
  }
  addresses = addresses.map((a) => (a.id === id ? updated : a))
  return mockDelay({ ...updated })
}

export async function deleteFactoryOfficeAddress(id: number): Promise<void> {
  addresses = addresses.filter((a) => a.id !== id)
  return mockDelay(undefined)
}
