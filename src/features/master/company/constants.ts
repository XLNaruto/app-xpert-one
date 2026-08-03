import type { ComboboxOption } from '@/components/ui/combobox'
import type { CompanyFormValues } from './schemas'

/**
 * The `sort` values `/user/companies` accepts. Sorting is server-side, so a
 * column is sortable only if it appears here — the list gives each of these
 * columns the API's field name as its column id, and marks the rest unsortable.
 */
export const COMPANY_SORT = {
  companyName: 'company_name',
  companyCode: 'company_code',
  city: 'city',
  createdAt: 'created_at',
} as const

/** Newest company first — the order the list opens in and reverts to. */
export const COMPANY_DEFAULT_SORT = { id: COMPANY_SORT.createdAt, desc: true }

/**
 * Establish-year choices: current year down to 1900. The API accepts anything
 * from 1800, but no company on this master predates the shorter list.
 */
export const YEAR_OPTIONS: ComboboxOption[] = Array.from(
  { length: new Date().getFullYear() - 1899 },
  (_, i) => {
    const year = String(new Date().getFullYear() - i)
    return { label: year, value: year }
  },
)

/** Blank form values for a brand-new company. */
export const EMPTY_COMPANY_FORM: CompanyFormValues = {
  companyName: '',
  establishYear: '',
  registrationNumber: '',
  panNumber: '',
  gstNumber: '',
  addressLine1: '',
  addressLine2: '',
  addressLine3: '',
  stateId: '',
  districtId: '',
  city: '',
  pinCode: '',
  phone: '',
  mobile1: '',
  mobile2: '',
  email: '',
}
