/**
 * The contract-expiry worklist, UI-side.
 *
 * THE RULE THIS MODULE RUNS ON: a contractual posting stores the LENGTH of its
 * term (`contractPeriod` + `contractPeriodType`) and never its end date, so the
 * end and the day the desk is warned are both DERIVED — BY THE API. Nothing here
 * recomputes them, because a renewal keeps the joining date and replaces the
 * period: `joiningDate + contractPeriod` therefore names the end of the term
 * that was just REPLACED, and a client computing it would show a freshly
 * renewed contract as still expired. Always render `contractEndsOn`.
 */

/** Where a row sits against its own term. */
export type ContractStatus =
  /** Warned, not yet ended — the window the panel exists for. `daysToEnd >= 0`. */
  | 'due'
  /** The term has ENDED and the posting is still open. `daysToEnd` is negative. */
  | 'expired'
  /** Not warned about yet. Only returned when `withinDays > 0`. */
  | 'upcoming'

/** The unit a contract's length is measured in. */
export type ContractPeriodType = 'YEAR' | 'MONTH' | 'DAY'

/** One row of the worklist. Every `*On` / `*Date` is a plain `yyyy-MM-dd`. */
export interface ExpiringContract {
  employeeId: number
  employeeName: string | null
  employeeCode: string | null
  employeeMobile: string | null
  /**
   * The posting the two actions act on. Not needed to CALL them — they are
   * addressed by employee — but it is the step-8 transfer-history deep link.
   */
  serviceId: number
  companyId: number | null
  companyName: string | null
  branchName: string | null
  departmentName: string | null
  designationName: string | null
  grade: string | null
  joiningDate: string | null
  contractPeriod: number | null
  contractPeriodType: ContractPeriodType | null
  /** End of the term IN FORCE. Render this; never recompute it. */
  contractEndsOn: string | null
  /** The warning date — the posting's stored renewal date. */
  renewalDueOn: string | null
  /** Whole days from today to `contractEndsOn`; NEGATIVE once the term ended. */
  daysToEnd: number | null
  status: ContractStatus
}

/**
 * What a renew or a complete answers — the posting as it now stands. Used to
 * report the new end date back in the exact words the server used.
 */
export interface ContractPosting {
  employeeId: number
  serviceId: number
  companyId: number | null
  employmentType: string | null
  contractPeriod: number | null
  contractPeriodType: ContractPeriodType | null
  joiningDate: string | null
  contractEndsOn: string | null
  renewalDueOn: string | null
  daysToEnd: number | null
  leavingDate: string | null
  leavingReason: string | null
  isCurrent: boolean
  status: ContractStatus
}

/** The list's narrowings, as the screen holds them. */
export interface ContractExpiryFilters {
  /** Company ids as strings (the picker's values). Empty = the user's reach. */
  companyIds: string[]
  /** One status, or `''` for all three. */
  status: ContractStatus | ''
  /**
   * How far PAST the warning date to look. `0` is the panel itself — every
   * contract already warned about; raising it previews what is coming.
   */
  withinDays: number
}

/**
 * The query the endpoint takes, already spelled its way.
 *
 * A `type` rather than an `interface` on purpose: the same object is the
 * TanStack cache key, and only a type alias carries the implicit index signature
 * that `Record<string, unknown>` key needs. Declaring it once means the request
 * and its cache entry cannot drift apart.
 */
export type ContractExpiryParams = {
  company_ids?: string
  within_days?: number
  status?: ContractStatus
  term?: string
  limit: number
  offset: number
}
