/**
 * A company (tenant) the signed-in user belongs to. This is the lightweight
 * *selection* shape — not the full company master record, which lives in
 * `features/master/company`.
 */
export interface MyCompany {
  id: number
  name: string
  /** Company code (e.g. `XPL001`), when the server provides it. */
  code?: string | null
}

/**
 * The caller's tenant state, returned by both `GET /me/companies` and
 * `POST /me/company/select`.
 */
export interface MyCompaniesState {
  /** Companies the caller belongs to. */
  companies: MyCompany[]
  /**
   * The active company. Resolves to the sole company for single-company users;
   * `null` when a multi-company user hasn't picked yet.
   */
  selectedCompanyId: number | null
  /** True only when there's a real choice: more than one company and none picked. */
  requiresSelection: boolean
}
