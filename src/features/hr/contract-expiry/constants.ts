import type { ComboboxOption } from '@/components/ui/combobox'
import type {
  ContractExpiryFilters,
  ContractPeriodType,
  ContractStatus,
} from './types'
import type { ContractCompleteFormValues, ContractRenewFormValues } from './schemas'

/** Rows the full screen opens on — also the first page's `limit`. */
export const CONTRACT_EXPIRY_PAGE_SIZE = 10

/** Page sizes the footer offers. The endpoint caps `limit` at 100. */
export const CONTRACT_EXPIRY_PAGE_SIZES = [10, 20, 50, 100]

/** Rows the dashboard card shows. The badge beside it uses `total`, not this. */
export const CONTRACT_EXPIRY_PANEL_LIMIT = 5

/**
 * How a status reads, and how loudly.
 *
 * `expired` is the loud one on purpose: the term has ENDED and the posting is
 * still open, which means somebody is working past the contract that authorises
 * them. `upcoming` is deliberately quiet — it is only ever returned when the
 * user asks to preview beyond the warning date, so it is information, not work.
 */
export interface ContractStatusSpec {
  label: string
  description: string
  /** Chip classes — amber for due, red for expired, grey for upcoming. */
  className: string
}

export const CONTRACT_STATUS_SPECS: Record<ContractStatus, ContractStatusSpec> = {
  due: {
    label: 'Due',
    description:
      'The warning date has passed and the term has not ended yet. Renew it, or decide not to.',
    className: 'bg-warning/10 text-warning',
  },
  expired: {
    label: 'Expired',
    description:
      'The term has ended and the posting is still open — somebody is working past the contract that authorises it.',
    className: 'bg-destructive/10 text-destructive',
  },
  upcoming: {
    label: 'Upcoming',
    description:
      'The warning date has not arrived yet — shown only because you are previewing beyond it.',
    className: 'bg-muted text-muted-foreground',
  },
}

/** Catalog order — worst first, which is also the order the list arrives in. */
export const CONTRACT_STATUS_ORDER: ContractStatus[] = ['expired', 'due', 'upcoming']

/** "No narrowing" — the key is omitted from the query, never sent empty. */
export const ANY_STATUS = ''

export const CONTRACT_STATUS_OPTIONS: ComboboxOption[] = [
  { label: 'All statuses', value: ANY_STATUS },
  ...CONTRACT_STATUS_ORDER.map((value) => ({
    label: CONTRACT_STATUS_SPECS[value].label,
    value,
  })),
]

/**
 * The preview toggle. `0` is the worklist itself — every contract already warned
 * about. Anything higher also returns terms that will be warned about within
 * that many days, which arrive as `upcoming`.
 */
export const WITHIN_DAYS_OPTIONS: ComboboxOption[] = [
  { label: 'Needs action now', value: '0' },
  { label: 'Next 30 days', value: '30' },
  { label: 'Next 60 days', value: '60' },
  { label: 'Next 90 days', value: '90' },
]

export const CONTRACT_PERIOD_TYPE_OPTIONS: ComboboxOption[] = [
  { label: 'Year', value: 'YEAR' },
  { label: 'Month', value: 'MONTH' },
  { label: 'Day', value: 'DAY' },
]

/** How a unit reads in a sentence ("1 year", "18 months"). */
export const PERIOD_TYPE_NOUNS: Record<ContractPeriodType, string> = {
  YEAR: 'year',
  MONTH: 'month',
  DAY: 'day',
}

/**
 * The warning lead, by unit of the term — the SAME rule the API applies, kept
 * here only so the renew dialog can preview the review date it is about to
 * cause. It is never used to decide whether a row belongs on the list.
 */
export const WARNING_LEAD: Record<ContractPeriodType, { months?: number; days?: number }> =
  {
    YEAR: { months: 1 },
    MONTH: { months: 1 },
    DAY: { days: 30 },
  }

export const EMPTY_CONTRACT_EXPIRY_FILTERS: ContractExpiryFilters = {
  companyIds: [],
  status: ANY_STATUS,
  withinDays: 0,
}

/** A fresh renew form. The dialog overwrites both fields from the row it opens on. */
export const EMPTY_CONTRACT_RENEW_FORM: ContractRenewFormValues = {
  contractPeriod: '1',
  contractPeriodType: 'YEAR',
  effectiveFrom: '',
  renewalDate: '',
}

/**
 * The API's own default reason, shown in the field rather than left blank so the
 * desk can see what will be recorded and edit it.
 */
export const DEFAULT_LEAVING_REASON = 'Contract completed — not renewed'

export const EMPTY_CONTRACT_COMPLETE_FORM: ContractCompleteFormValues = {
  leavingDate: '',
  leavingReason: DEFAULT_LEAVING_REASON,
}
