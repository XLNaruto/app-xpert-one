import { mockDelay } from '@/lib/utils'
import type { CompanyFormValues } from '../schemas'
import type { Company } from '../types'

/**
 * In-memory company store. No backend yet — this module holds the records for
 * the session so create/edit/delete stay consistent across screens. When the
 * API lands, swap each function's body for the matching REST call and map the
 * response to `Company`; the signatures stay the same.
 */

let companies: Company[] = [
  {
    id: 1,
    companyName: 'XpertLab Technologies',
    companyCode: 'XPL001',
    establishYear: '2015',
    registrationNumber: 'U72900GJ2015PTC084521',
    panNumber: 'AABCX1234K',
    gstNumber: '24AABCX1234K1Z5',
    addressLine1: '4th Floor, Silver Business Point',
    addressLine2: 'VIP Circle, Uttran',
    addressLine3: null,
    state:'Gujarat',
    city: 'Surat',
    pinCode: '394105',
    phone: '02612345678',
    mobile1: '9876543210',
    mobile2: null,
    email: 'contact@xpertlab.com',
    createdAt: '2015-06-12T09:30:00.000Z',
  },
  {
    id: 2,
    companyName: 'Rajani Group',
    companyCode: 'RJG002',
    establishYear: '2008',
    registrationNumber: null,
    panNumber: 'AAACR5678M',
    gstNumber: null,
    addressLine1: '12 MG Road',
    addressLine2: null,
    addressLine3: null,
    state:'Maharashtra',
    city: 'Mumbai',
    pinCode: '400001',
    phone: null,
    mobile1: '9820011223',
    mobile2: '9820044556',
    email: 'info@rajanigroup.com',
    createdAt: '2008-03-01T09:30:00.000Z',
  },
]

/** Next auto-increment id (max existing + 1). */
function nextId(): number {
  return companies.reduce((max, c) => Math.max(max, c.id), 0) + 1
}

/** Empty strings from the form become `null` for optional stored fields. */
function nullIfBlank(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** Map validated form values onto the stored fields shared by create + update. */
function applyForm(values: CompanyFormValues) {
  return {
    companyName: values.companyName.trim(),
    companyCode: values.companyCode.trim(),
    establishYear: values.establishYear,
    registrationNumber: nullIfBlank(values.registrationNumber),
    panNumber: values.panNumber.trim().toUpperCase(),
    gstNumber: nullIfBlank(values.gstNumber),
    addressLine1: values.addressLine1.trim(),
    addressLine2: nullIfBlank(values.addressLine2),
    addressLine3: nullIfBlank(values.addressLine3),
    state: values.state.trim(),
    city: nullIfBlank(values.city),
    pinCode: nullIfBlank(values.pinCode),
    phone: nullIfBlank(values.phone),
    mobile1: values.mobile1.trim(),
    mobile2: nullIfBlank(values.mobile2),
    email: values.email.trim(),
  }
}

export async function fetchCompanies(): Promise<Company[]> {
  return mockDelay([...companies])
}

export async function fetchCompany(id: number): Promise<Company> {
  const found = companies.find((c) => c.id === id)
  if (!found) throw new Error('Company not found')
  return mockDelay({ ...found })
}

export async function createCompany(values: CompanyFormValues): Promise<Company> {
  const company: Company = {
    id: nextId(),
    ...applyForm(values),
    createdAt: new Date().toISOString(),
  }
  companies = [company, ...companies]
  return mockDelay({ ...company })
}

export async function updateCompany(
  id: number,
  values: CompanyFormValues,
): Promise<Company> {
  const index = companies.findIndex((c) => c.id === id)
  if (index === -1) throw new Error('Company not found')
  const updated: Company = { ...companies[index], ...applyForm(values) }
  companies = companies.map((c) => (c.id === id ? updated : c))
  return mockDelay({ ...updated })
}

export async function deleteCompany(id: number): Promise<void> {
  companies = companies.filter((c) => c.id !== id)
  return mockDelay(undefined)
}
