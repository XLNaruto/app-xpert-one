/**
 * A company (tenant) the signed-in user belongs to. This is the lightweight
 * *selection* shape — not the full company master record, which lives in
 * `features/master/company`.
 */
export interface MyCompany {
  id: number
  name: string
  /** Company code (e.g. `XPL001`). */
  code: string
  /** Logo storage path; `null` when the company has none. */
  logo: string | null
}

/**
 * The caller's tenant state.
 *
 * The list comes from `GET /user/my/companies`. The *active* selection is
 * session state the server keeps on the token — it arrives as `user.company_id`
 * at login and is re-read on every refresh — so it's read from the auth store
 * rather than from the list response.
 */
export interface MyCompaniesState {
  /** Companies the caller belongs to. */
  companies: MyCompany[]
  /**
   * The active company; `null` when the session has none (or points at a
   * company the caller no longer belongs to).
   */
  selectedCompanyId: number | null
  /** True once the list has loaded and no company is active — the gate blocks. */
  requiresSelection: boolean
}
