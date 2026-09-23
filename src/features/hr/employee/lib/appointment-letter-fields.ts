import { format } from 'date-fns'
import { formatDate } from '@/lib/utils'
import type { Employee, EmployeeTransfer } from '../types'

/**
 * The values an appointment letter prints, derived once from the employee
 * record so the header, the clauses and the signature block agree.
 */

export type LetterLang = 'en' | 'hi' | 'gu'

/** Ruled blank printed wherever a value is missing, so the sheet can still be filled by hand. */
export const BLANK = '________________'

export interface AppointmentLetterFields {
  /** Salutation + name — "Mr Bijli". */
  fullName: string
  code: string
  designation: string
  company: string
  /** Where the employee reports — the posting's branch. */
  workplace: string
  /** The street lines of the current address (falling back to the permanent one). */
  address: string
  city: string
  pinCode: string
  mobile: string
  joiningDate: string
  /** The day the letter is issued — today. */
  letterDate: string
  reportTime: string
}

const clean = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value).trim()

const joinNonEmpty = (parts: unknown[], sep = ', ') =>
  parts.map(clean).filter(Boolean).join(sep)

/** Letters are dated DD/MM/YYYY, the way the printed stationery is. */
const onLetterDate = (value: string | undefined) =>
  value ? formatDate(value, 'dd/MM/yyyy') : ''

/**
 * Build the letter's field set.
 *
 * `service` on the employee row carries the posting's dates but only ids, while
 * the transfer register carries the names — so the designation and branch come
 * from `posting` (the open row, or the newest on someone who has left).
 * `companyName` is the active tenant's, used when the posting doesn't name one.
 */
export function buildAppointmentLetterFields(
  employee: Employee | undefined,
  posting: EmployeeTransfer | null,
  companyName: string | null,
): AppointmentLetterFields {
  const e = employee
  const current = joinNonEmpty([e?.currentAddress1, e?.currentAddress2, e?.currentAddress3])
  const permanent = joinNonEmpty([
    e?.permanentAddress1,
    e?.permanentAddress2,
    e?.permanentAddress3,
  ])
  // City and PIN follow whichever address is printed, so the lines stay one address.
  const useCurrent = current !== '' || permanent === ''

  return {
    fullName: joinNonEmpty([e?.prefix, e?.name], ' '),
    code: clean(e?.code),
    designation: clean(posting?.designationName),
    company: clean(posting?.companyName) || clean(companyName),
    workplace: clean(posting?.branchName),
    address: useCurrent ? current : permanent,
    city: clean(useCurrent ? e?.currentCity : e?.permanentCity),
    pinCode: clean(useCurrent ? e?.currentPinCode : e?.permanentPinCode),
    mobile: clean(e?.mobileNumber1) || clean(e?.mobileNumber2),
    joiningDate: onLetterDate(e?.service?.joiningDate || posting?.joiningDate),
    letterDate: format(new Date(), 'dd/MM/yyyy'),
    reportTime: '8:30 am',
  }
}

/**
 * Replace `{placeholder}` tokens with values from the field set. An unknown or
 * empty value becomes a ruled blank, so the printed page can still be completed
 * by hand.
 */
export function fillTemplate(
  text: string,
  fields: AppointmentLetterFields,
  blank = BLANK,
): string {
  return text.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = fields[key as keyof AppointmentLetterFields]
    return clean(value) || blank
  })
}

/** Gujarati letters are conventionally typed with Gujarati digits. */
const GU_DIGITS = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯']
export const toGujaratiDigits = (s: string) =>
  s.replace(/[0-9]/g, (d) => GU_DIGITS[Number(d)])

/**
 * File name for the downloaded PDF —
 * `Appointment Letter Mr Bijli 23-09-2026`, dated the day it's downloaded.
 *
 * The name is stripped of the characters Windows refuses in a file name.
 */
export function appointmentLetterFilename(
  fullName: string,
  isRenewal: boolean,
  at: Date = new Date(),
) {
  const base = isRenewal ? 'Re-appointment Letter' : 'Appointment Letter'
  const name =
    (fullName || 'Employee').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() ||
    'Employee'
  return `${base} ${name} ${format(at, 'dd-MM-yyyy')}`
}
