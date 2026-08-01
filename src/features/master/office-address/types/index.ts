import type { LucideIcon } from 'lucide-react'
import type { AuditFields } from '@/types/audit'

/**
 * Which statutory body an office belongs to — the API's `office_for`, and the
 * only thing separating the five office-address screens from each other.
 */
export const OFFICE_FOR_VALUES = [
  'PF',
  'ESIC',
  'LWF',
  'FACTORY',
  'EMPLOYMENT EXCHANGE',
] as const

export type OfficeFor = (typeof OFFICE_FOR_VALUES)[number]

/**
 * A statutory office address — the office an establishment registers with.
 * Held in the master so branches can point at an office instead of retyping its
 * address.
 *
 * One record type covers all five screens: `officeFor` says which one owns it.
 */
export interface OfficeAddress extends AuditFields {
  id: number
  officeFor: OfficeFor
  officeName: string
  /** The body's office code; optional, blank when the office has none. */
  officeCode: string
  /** How the body classifies the office; only the PF screen collects it. */
  officeType: string
  mobile: string
  phone: string
  email: string
  addressLine1: string
  addressLine2: string
  addressLine3: string
  /** State id as stored by the API; `null` when not recorded. */
  stateId: number | null
  /** State name, joined in from the state master for display. */
  stateName: string
  districtId: number | null
  /** District name, joined in from the district master for display. */
  districtName: string
  city: string
  pinCode: string
}

/** The list route of an office-address screen, as the router knows it. */
export type OfficeAddressListPath =
  | '/master/pf-office-address'
  | '/master/esic-office-address'
  | '/master/lwf-office-address'
  | '/master/factory-office-address'
  | '/master/employment-exchange-office-address'

/** The create/edit route of an office-address screen. */
export type OfficeAddressCreatePath =
  | '/master/pf-office-address/create'
  | '/master/esic-office-address/create'
  | '/master/lwf-office-address/create'
  | '/master/factory-office-address/create'
  | '/master/employment-exchange-office-address/create'

/**
 * Everything one office-address screen needs to differ from its four siblings.
 * Each feature folder declares one of these and hands it to the shared pages
 * and hooks, so the screens stay five routes over a single implementation.
 */
export interface OfficeAddressScreen {
  /** The `office_for` this screen reads and writes. */
  officeFor: OfficeFor
  listPath: OfficeAddressListPath
  createPath: OfficeAddressCreatePath
  /** Page heading, e.g. `PF Office Address`. */
  title: string
  /** Sub-heading under the page title. */
  description: string
  /** Short name used in buttons, toasts and dialogs, e.g. `PF Address`. */
  shortLabel: string
  /** How the records read in prose, e.g. `PF addresses`. */
  recordsLabel: string
  /** Empty-state heading, e.g. `No PF office addresses yet`. */
  emptyTitle: string
  /** Line under the empty-state title. */
  emptyDescription: string
  icon: LucideIcon
  /**
   * Whether the Office Type dropdown appears — only PF classifies its offices
   * (Regional / Sub Regional), so the other four screens hide the field.
   */
  hasOfficeType?: boolean
}
