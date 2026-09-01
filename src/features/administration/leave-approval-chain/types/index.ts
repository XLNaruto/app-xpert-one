/**
 * Hierarchy Management → Leave — the UI-facing types.
 *
 * The account owner authors ONE ordered chain of ROLE NAMES (HR → Manager → Team
 * Leader) and every company of the account follows it. There is nothing to set up
 * per company; that is the whole point.
 *
 * Role NAMES rather than role ids because roles are company-scoped: one account
 * legitimately holds three separate "HR Manager" rows, one per company, and an
 * account-level chain naming an id would route only one company's leave. The name
 * is the only thing those rows share.
 */

/** One level of the chain, with the coverage the API counted for it. */
export interface LeaveApprovalLevel {
  /** 1-based position — the order of authority. */
  level: number
  roleName: string
  /**
   * Live users holding a role of this name anywhere in the account. ZERO is a
   * dead link: the chain silently skips the level, so the screen warns.
   */
  userCount: number
  /**
   * How many of the account's companies those users can reach. Short of
   * `companyCount` is NOT an error — that is why there is a level below.
   */
  companiesCovered: number
}

/** A company named on the coverage summary. */
export interface LeaveApprovalCompanyRef {
  id: number
  name: string
}

/** The whole chain plus what it does and doesn't cover. */
export interface LeaveApprovalChain {
  levels: LeaveApprovalLevel[]
  /**
   * Is the ACCOUNT OWNER the chain's implicit last link?
   *
   * `true` for every account that hasn't said otherwise. Opting out is only
   * accepted while every company is covered by a level, so `false` means the
   * chain answered for everything at the moment it was saved.
   *
   * The owner keeps their OVERRIDE on a decision either way — `canDecide` stays
   * true for them on every pending row — because they are the break-glass for a
   * chain that stops resolving later. Opting out changes ROUTING, not authority.
   */
  includesOwner: boolean
  companyCount: number
  /**
   * What this list means depends on `includesOwner`.
   *
   * IN — the companies whose leave waits on the ACCOUNT OWNER personally, the
   * chain's implicit last link, reached when no level has a live user who can get
   * to that company.
   *
   * OUT — a WARNING: those companies have no approver at all. It is empty the
   * moment the opt-out is saved and can only fill later, when a level stops
   * resolving (a role renamed, a level's last user deactivated).
   */
  companiesWithOwner: LeaveApprovalCompanyRef[]
}
