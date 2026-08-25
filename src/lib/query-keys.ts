import type { PageParams } from '@/lib/pagination'

/**
 * Centralized query-key factory. Every TanStack Query key in the app is
 * defined here — no feature declares keys inline. Keys are `as const` so
 * they infer as readonly tuples for stable cache identity.
 *
 * A server-paged `list(params)` appends its `{ limit, offset, search }` so each
 * page caches separately; `list()` with no params is the prefix that matches
 * every page of that master — which is why mutations can keep invalidating
 * `all` and pick up all of them.
 */
export const queryKeys = {
  /**
   * Client-facing app config (the media base URL) — `features/config`. Read once
   * per session and never invalidated; it isn't tenant-scoped, so a company
   * switch leaves it alone.
   */
  config: {
    all: ['config'] as const,
    app: () => [...queryKeys.config.all, 'app'] as const,
  },
  profile: {
    all: ['profile'] as const,
    me: () => [...queryKeys.profile.all, 'me'] as const,
  },
  /**
   * The signed-in user's own role + permission codes (`GET /user/my-role`) —
   * `features/permissions`. Read once per session and cached forever: it only
   * changes when the user or the active company does, and the company switch
   * invalidates everything outside `myCompany`.
   */
  permissions: {
    all: ['permissions'] as const,
    myRole: () => [...queryKeys.permissions.all, 'my-role'] as const,
  },
  /**
   * Roles — `features/administration/role`. Roles are authored per company, so
   * the list key carries the tenant it was read for like every other master.
   *
   * `assignablePermissions` is the builder catalog: one per account, never
   * paged, and only changing when the subscription does — the query holds it for
   * the session.
   */
  role: {
    all: ['role'] as const,
    list: (params?: PageParams, companyId?: number) =>
      params
        ? ([...queryKeys.role.all, 'list', params, companyId ?? 0] as const)
        : ([...queryKeys.role.all, 'list', companyId ?? 0] as const),
    detail: (id: number) => [...queryKeys.role.all, 'detail', id] as const,
    assignablePermissions: () =>
      [...queryKeys.role.all, 'assignable-permissions'] as const,
  },
  /**
   * Admin users — `features/administration/admin-user`.
   *
   * Account-scoped: the `companyId` on the list key is the screen's FILTER, not
   * the session's tenant, and `0` means "every user of the account" (which also
   * includes the owners, who belong to no company).
   *
   * `assignableRoles` is the form's role dropdown — every role of the account
   * across all its companies, unpaged, so it's held for the session.
   */
  adminUser: {
    all: ['admin-user'] as const,
    list: (params?: PageParams, companyId?: number) =>
      params
        ? ([...queryKeys.adminUser.all, 'list', params, companyId ?? 0] as const)
        : ([...queryKeys.adminUser.all, 'list', companyId ?? 0] as const),
    detail: (id: number) => [...queryKeys.adminUser.all, 'detail', id] as const,
    assignableRoles: () => [...queryKeys.adminUser.all, 'assignable-roles'] as const,
  },
  /**
   * Talk credentials — `features/talk/credential`.
   *
   * ACCOUNT-scoped like the admin users: the `companyId` on the list key is the
   * screen's FILTER (credentials that reach one company by either kind of
   * grant), not the session's tenant, and `0` means "every credential of the
   * account".
   */
  talkCredential: {
    all: ['talk-credential'] as const,
    list: (params?: PageParams, companyId?: number) =>
      params
        ? ([...queryKeys.talkCredential.all, 'list', params, companyId ?? 0] as const)
        : ([...queryKeys.talkCredential.all, 'list', companyId ?? 0] as const),
    detail: (id: number) => [...queryKeys.talkCredential.all, 'detail', id] as const,
  },
  /**
   * Talk monitoring — `features/talk/monitoring`.
   *
   * ACCOUNT-scoped and read-only, so nothing here carries the session's tenant
   * and nothing ever invalidates it: the screen owns no mutation. One key per
   * pane, each carrying exactly what its request varies on.
   *
   * `people(search)` carries the term because the SERVER matches it; the
   * Employees / Admins segments are not in the key, because the endpoint offers
   * no filter for them and the pane cuts the matched set up itself.
   */
  talkMonitoring: {
    all: ['talk-monitoring'] as const,
    people: (search?: string) =>
      [...queryKeys.talkMonitoring.all, 'people', search ?? ''] as const,
    /**
     * One person's conversations. `type` is the pane's tab — `undefined` is the
     * All tab, which the endpoint answers by omitting the filter.
     */
    chats: (talkUserId: number, type?: string, search?: string) =>
      [
        ...queryKeys.talkMonitoring.all,
        'chats',
        talkUserId,
        type ?? 'all',
        search ?? '',
      ] as const,
    /**
     * A tab's badge count, read on its own with `limit: 1` so the two inactive
     * tabs can show a number without fetching their rows.
     */
    chatCount: (talkUserId: number, type: string, search?: string) =>
      [
        ...queryKeys.talkMonitoring.all,
        'chat-count',
        talkUserId,
        type,
        search ?? '',
      ] as const,
    /** One thread. No search term: the screen offers no in-conversation search. */
    messages: (talkUserId: number, chatId: number) =>
      [...queryKeys.talkMonitoring.all, 'messages', talkUserId, chatId] as const,
  },
  /**
   * Billing — `features/administration/billing`.
   *
   * Account-scoped, not tenant-scoped: no key here carries a company. The three
   * reads are separate because they answer different questions — what may be
   * bought, what IS bought (at its purchase-time prices), and how much of it is
   * being used.
   */
  billing: {
    all: ['billing'] as const,
    plans: () => [...queryKeys.billing.all, 'plans'] as const,
    subscription: () => [...queryKeys.billing.all, 'subscription'] as const,
    /** `GET /user/me` — the account, its subscription and its usage counts. */
    account: () => [...queryKeys.billing.all, 'account'] as const,
  },
  /**
   * IP access control — `features/administration/ip-address`.
   *
   * `mode` is the company-level switch and the two list counts; it sits under
   * the same `all` prefix as the entries because adding or removing an address
   * changes those counts, so one invalidation has to refresh both.
   *
   * `type` narrows a page to one list server-side, so it's part of the list key
   * — a filtered page is its own result set, not a slice of the unfiltered one.
   */
  ipAddress: {
    all: ['ip-address'] as const,
    list: (params?: PageParams, type?: string) =>
      params
        ? ([...queryKeys.ipAddress.all, 'list', params, type ?? ''] as const)
        : ([...queryKeys.ipAddress.all, 'list'] as const),
    mode: () => [...queryKeys.ipAddress.all, 'mode'] as const,
  },
  /**
   * The signed-in user's own companies (tenants) + active selection —
   * `features/company`. Kept separate from the `company` master list below so a
   * tenant switch can invalidate everything *except* this key.
   */
  myCompany: {
    all: ['my-company'] as const,
    list: () => [...queryKeys.myCompany.all, 'list'] as const,
  },
  company: {
    all: ['company'] as const,
    list: (params?: PageParams) =>
      params
        ? ([...queryKeys.company.all, 'list', params] as const)
        : ([...queryKeys.company.all, 'list'] as const),
    detail: (id: number) => [...queryKeys.company.all, 'detail', id] as const,
  },
  branch: {
    all: ['branch'] as const,
    /**
     * `companyId` is the tenant the page was read for. It's normally the session's
     * active company and left off, but an employee transfer to another company has
     * to list *that* company's branches — a different tenant is a different result
     * set, so it belongs in the key.
     */
    list: (params?: PageParams, companyId?: number) =>
      params
        ? ([...queryKeys.branch.all, 'list', params, companyId ?? 0] as const)
        : ([...queryKeys.branch.all, 'list'] as const),
    detail: (id: number) => [...queryKeys.branch.all, 'detail', id] as const,
  },
  /**
   * A branch's applicable acts — one row per branch, so the branch id is the
   * identity a screen reads by. `detail` is the row's own id, for the reads that
   * go straight at it.
   */
  actRegistration: {
    all: ['act-registration'] as const,
    byBranch: (branchId: number) =>
      [...queryKeys.actRegistration.all, 'branch', branchId] as const,
    detail: (id: number) => [...queryKeys.actRegistration.all, 'detail', id] as const,
  },
  department: {
    all: ['department'] as const,
    /**
     * `companyId` is the tenant the page was read for. It's normally the session's
     * active company and left off, but an employee transfer to another company has
     * to list *that* company's departments — a different tenant is a different result
     * set, so it belongs in the key.
     */
    list: (params?: PageParams, companyId?: number) =>
      params
        ? ([...queryKeys.department.all, 'list', params, companyId ?? 0] as const)
        : ([...queryKeys.department.all, 'list'] as const),
    detail: (id: number) => [...queryKeys.department.all, 'detail', id] as const,
  },
  /**
   * The company's shifts — read on the Shift tab of the company screen and, as
   * a dropdown, on the department screen. `companyId` is always in the key: the
   * masters screens edit a company other than the session's active one, so the
   * tenant a page read for is part of what identifies the result set.
   */
  shift: {
    all: ['shift'] as const,
    list: (params?: PageParams, companyId?: number) =>
      params
        ? ([...queryKeys.shift.all, 'list', params, companyId ?? 0] as const)
        : ([...queryKeys.shift.all, 'list', companyId ?? 0] as const),
    detail: (id: number) => [...queryKeys.shift.all, 'detail', id] as const,
    /**
     * One shift's dated versions. Its own key rather than part of the detail:
     * editing a shift appends a version, so the history is invalidated by the same
     * mutations but read only by the screen that asks for it.
     */
    history: (id: number) => [...queryKeys.shift.all, 'history', id] as const,
  },
  /**
   * Week-off policies — the master screen, plus the dropdown on the shift form
   * that points one shift at its own pattern.
   */
  weekoffPolicy: {
    all: ['weekoff-policy'] as const,
    list: (params?: PageParams, companyId?: number) =>
      params
        ? ([...queryKeys.weekoffPolicy.all, 'list', params, companyId ?? 0] as const)
        : ([...queryKeys.weekoffPolicy.all, 'list', companyId ?? 0] as const),
    detail: (id: number) => [...queryKeys.weekoffPolicy.all, 'detail', id] as const,
  },
  designation: {
    all: ['designation'] as const,
    /**
     * `companyId` is the tenant the page was read for. It's normally the session's
     * active company and left off, but an employee transfer to another company has
     * to list *that* company's designations — a different tenant is a different result
     * set, so it belongs in the key.
     */
    list: (params?: PageParams, companyId?: number) =>
      params
        ? ([...queryKeys.designation.all, 'list', params, companyId ?? 0] as const)
        : ([...queryKeys.designation.all, 'list'] as const),
    detail: (id: number) => [...queryKeys.designation.all, 'detail', id] as const,
    /** Effective-dated wage structure history for one designation. */
    wageStructures: (designationId: number) =>
      [...queryKeys.designation.all, 'wage-structures', designationId] as const,
    /**
     * The bulk wage grid — every designation of one company with the version of
     * its wage structure in force. The company is the screen's own pick rather
     * than the session's, so it's always in the key.
     */
    bulkWageGrid: (companyId: number) =>
      [...queryKeys.designation.all, 'bulk-wage-grid', companyId] as const,
    /**
     * The bulk wage history — every designation of one company with every
     * version it has ever been paid on. Paged over the designations, so the page
     * params ride in the key alongside the company.
     */
    bulkWageHistory: (companyId: number, params: PageParams) =>
      [...queryKeys.designation.all, 'bulk-wage-history', companyId, params] as const,
  },
  pfRate: {
    all: ['pf-rate'] as const,
    list: (params?: PageParams) =>
      params
        ? ([...queryKeys.pfRate.all, 'list', params] as const)
        : ([...queryKeys.pfRate.all, 'list'] as const),
    detail: (id: number) => [...queryKeys.pfRate.all, 'detail', id] as const,
  },
  esicRate: {
    all: ['esic-rate'] as const,
    list: (params?: PageParams) =>
      params
        ? ([...queryKeys.esicRate.all, 'list', params] as const)
        : ([...queryKeys.esicRate.all, 'list'] as const),
    detail: (id: number) => [...queryKeys.esicRate.all, 'detail', id] as const,
  },
  ptRate: {
    all: ['pt-rate'] as const,
    list: (params?: PageParams) =>
      params
        ? ([...queryKeys.ptRate.all, 'list', params] as const)
        : ([...queryKeys.ptRate.all, 'list'] as const),
    detail: (id: number) => [...queryKeys.ptRate.all, 'detail', id] as const,
  },
  lwfRate: {
    all: ['lwf-rate'] as const,
    list: (params?: PageParams) =>
      params
        ? ([...queryKeys.lwfRate.all, 'list', params] as const)
        : ([...queryKeys.lwfRate.all, 'list'] as const),
    detail: (id: number) => [...queryKeys.lwfRate.all, 'detail', id] as const,
  },
  /**
   * All five office-address screens share `/user/office-addresses`, so they
   * share one key too — `officeFor` scopes a list to the screen reading it,
   * while `all` still invalidates every screen (a record's `office_for` can be
   * edited, which moves it between them).
   */
  officeAddress: {
    all: ['office-address'] as const,
    list: (officeFor: string, params?: PageParams) =>
      params
        ? ([...queryKeys.officeAddress.all, 'list', officeFor, params] as const)
        : ([...queryKeys.officeAddress.all, 'list', officeFor] as const),
    detail: (id: number) => [...queryKeys.officeAddress.all, 'detail', id] as const,
  },
  state: {
    all: ['state'] as const,
    /** The whole master — for resolving `state_id` to a name on a list screen. */
    list: () => [...queryKeys.state.all, 'list'] as const,
    /** Paged, server-searched — backs the scroll-lazy state dropdowns. */
    infinite: (search?: string) =>
      [...queryKeys.state.all, 'infinite', search ?? ''] as const,
    /** One state — for labelling a selection the loaded pages don't cover. */
    detail: (id: number) => [...queryKeys.state.all, 'detail', id] as const,
  },
  district: {
    all: ['district'] as const,
    /** `stateId` scopes the list to one state's districts (the cascade case). */
    list: (stateId?: number) =>
      stateId
        ? ([...queryKeys.district.all, 'list', stateId] as const)
        : ([...queryKeys.district.all, 'list'] as const),
    /** Paged, server-searched — backs the scroll-lazy district dropdowns. */
    infinite: (stateId?: number, search?: string) =>
      [...queryKeys.district.all, 'infinite', stateId ?? 0, search ?? ''] as const,
    /** One district — for labelling a selection the loaded pages don't cover. */
    detail: (id: number) => [...queryKeys.district.all, 'detail', id] as const,
  },
  leaveType: {
    all: ['leave-type'] as const,
    list: (params?: PageParams) =>
      params
        ? ([...queryKeys.leaveType.all, 'list', params] as const)
        : ([...queryKeys.leaveType.all, 'list'] as const),
    detail: (id: number) => [...queryKeys.leaveType.all, 'detail', id] as const,
  },
  holiday: {
    all: ['holiday'] as const,
    list: (params?: PageParams) =>
      params
        ? ([...queryKeys.holiday.all, 'list', params] as const)
        : ([...queryKeys.holiday.all, 'list'] as const),
    detail: (id: number) => [...queryKeys.holiday.all, 'detail', id] as const,
  },
  allowanceDeduction: {
    all: ['allowance-deduction'] as const,
    list: (params?: PageParams) =>
      params
        ? ([...queryKeys.allowanceDeduction.all, 'list', params] as const)
        : ([...queryKeys.allowanceDeduction.all, 'list'] as const),
    detail: (id: number) => [...queryKeys.allowanceDeduction.all, 'detail', id] as const,
  },
  documentType: {
    all: ['document-type'] as const,
    list: (params?: PageParams) =>
      params
        ? ([...queryKeys.documentType.all, 'list', params] as const)
        : ([...queryKeys.documentType.all, 'list'] as const),
    detail: (id: number) => [...queryKeys.documentType.all, 'detail', id] as const,
  },
  document: {
    all: ['document'] as const,
    /**
     * `documentTypeId` narrows the page to one category server-side, so it's
     * part of the key — a filtered page is a different result set, not a slice
     * of the unfiltered one.
     */
    list: (params?: PageParams, documentTypeId?: number) =>
      params
        ? ([...queryKeys.document.all, 'list', params, documentTypeId ?? 0] as const)
        : ([...queryKeys.document.all, 'list'] as const),
    detail: (id: number) => [...queryKeys.document.all, 'detail', id] as const,
  },
  asset: {
    all: ['asset'] as const,
    list: (params?: PageParams) =>
      params
        ? ([...queryKeys.asset.all, 'list', params] as const)
        : ([...queryKeys.asset.all, 'list'] as const),
  },
  /**
   * The employee and its nine steps. Every step is its own sub-resource keyed by
   * the employee id, so `all` is what a mutation invalidates when a save could
   * have moved the completion flags — which is every save, since
   * `completed_steps` rides on the employee record itself.
   */
  employee: {
    all: ['employee'] as const,
    list: (params?: PageParams) =>
      params
        ? ([...queryKeys.employee.all, 'list', params] as const)
        : ([...queryKeys.employee.all, 'list'] as const),
    detail: (id: number) => [...queryKeys.employee.all, 'detail', id] as const,
    /**
     * The picker list — every company of the account, so no tenant on the key.
     * `search` is matched server-side, which makes each term its own result set.
     */
    picker: (search?: string) =>
      [...queryKeys.employee.all, 'picker', search ?? ''] as const,
    /** Step 2 — the KYC columns of one employee. */
    kyc: (id: number) => [...queryKeys.employee.all, 'kyc', id] as const,
    /** Step 3 — the wage structure inherited from the current designation. */
    wageStructure: (id: number) =>
      [...queryKeys.employee.all, 'wage-structure', id] as const,
    /**
     * Step 3 — the employee's own wage: both candidates (their override and the
     * designation's template), which one is in force, and the override's history.
     */
    wage: (id: number) => [...queryKeys.employee.all, 'wage', id] as const,
    /** Step 4 — every family member. */
    family: (id: number) => [...queryKeys.employee.all, 'family', id] as const,
    /** Step 5a — every qualification. */
    educations: (id: number) => [...queryKeys.employee.all, 'educations', id] as const,
    /** Step 5b — every prior employment. */
    experiences: (id: number) => [...queryKeys.employee.all, 'experiences', id] as const,
    /** Step 6 — every attachment. */
    documents: (id: number) => [...queryKeys.employee.all, 'documents', id] as const,
    /** Step 7 — every asset handout. */
    assets: (id: number) => [...queryKeys.employee.all, 'assets', id] as const,
    /** Step 8 — the posting history, newest first. */
    transfers: (id: number) => [...queryKeys.employee.all, 'transfers', id] as const,
    /** Step 8 — one posting expanded: service detail + its wage structure. */
    transfer: (id: number, serviceId: number) =>
      [...queryKeys.employee.all, 'transfer', id, serviceId] as const,
    /**
     * Step 9 — the shift resolved for ONE date, with the link of the precedence
     * chain that answered. The date is in the key: a different day is a different
     * answer, not a refetch of this one.
     */
    shiftOnDay: (id: number, date: string) =>
      [...queryKeys.employee.all, 'shift-on-day', id, date] as const,
    /** Step 9 — the assignment timeline, newest first. Unpaginated. */
    shiftTimeline: (id: number) =>
      [...queryKeys.employee.all, 'shift-timeline', id] as const,
    /** Step 9 — the per-date roster overrides inside one window. */
    roster: (id: number, from: string, to: string, params?: PageParams) =>
      params
        ? ([...queryKeys.employee.all, 'roster', id, from, to, params] as const)
        : ([...queryKeys.employee.all, 'roster', id, from, to] as const),
  },
  /**
   * Leave Management — the company-wide leave register. `employeeId` scopes the
   * list to one person (`0` is the whole company), and the filters travel in the
   * key alongside the page since each combination is its own result set.
   */
  leave: {
    all: ['leave'] as const,
    list: (
      employeeId?: number,
      params?: PageParams,
      filters?: Record<string, unknown>,
    ) =>
      params
        ? ([
            ...queryKeys.leave.all,
            'list',
            employeeId ?? 0,
            params,
            filters ?? {},
          ] as const)
        : ([...queryKeys.leave.all, 'list', employeeId ?? 0] as const),
    detail: (id: number) => [...queryKeys.leave.all, 'detail', id] as const,
    /**
     * One employee's paid-allowance ledger for a calendar year. The year is in
     * the key because it IS the answer's scope — the allowances reset with it.
     */
    balance: (employeeId: number, year: number) =>
      [...queryKeys.leave.all, 'balance', employeeId, year] as const,
  },
  /**
   * The paid-allowance grids the balance above is computed from — two tiers,
   * two keys. The employee grant is scoped to a year; the designation policy is
   * standing and has none.
   */
  leaveQuota: {
    all: ['leave-quota'] as const,
    employee: (employeeId: number, year: number) =>
      [...queryKeys.leaveQuota.all, 'employee', employeeId, year] as const,
    designation: (designationId: number) =>
      [...queryKeys.leaveQuota.all, 'designation', designationId] as const,
  },
  /**
   * The account's leave approval chain. ACCOUNT-scoped, so no company in the key:
   * one chain answers for every company, which is the whole point of it.
   */
  leaveApprovalChain: {
    all: ['leave-approval-chain'] as const,
    detail: () => [...queryKeys.leaveApprovalChain.all, 'detail'] as const,
    /** The distinct role names the picker offers. */
    roles: () => [...queryKeys.leaveApprovalChain.all, 'roles'] as const,
  },
  /**
   * Payroll — the salary register, read one designation-month at a time.
   *
   * Everything that picks the register out is in the key: the company, the
   * period, the designation the columns are built for, the pending/complete side
   * and the page. Each combination is a different register rather than a refetch
   * of this one, so switching any of them must not show the previous answer's
   * rows under the new heading.
   */
  salary: {
    all: ['salary'] as const,
    register: (filters: Record<string, unknown>, params?: PageParams) =>
      params
        ? ([...queryKeys.salary.all, 'register', filters, params] as const)
        : ([...queryKeys.salary.all, 'register', filters] as const),
    /**
     * The processed month as the View Salary screen reads it — the same family
     * as the register, so a discard invalidating `salary.all` refreshes both.
     * The company, period, department and search term all pick a different
     * report out, so they're all in the key alongside the page.
     */
    report: (filters: Record<string, unknown>, params?: PageParams) =>
      params
        ? ([...queryKeys.salary.all, 'report', filters, params] as const)
        : ([...queryKeys.salary.all, 'report', filters] as const),
    /**
     * Pay Salary's two tabs. Same family again, deliberately: paying a salary
     * stamps `is_paid` on the very rows the register and the report show, so one
     * `salary.all` invalidation refreshes every screen that read them. The tab
     * (`unpaid`/`paid`) is part of `filters` — they're different reads, not two
     * views of one answer, so neither may show under the other's heading.
     */
    payments: (filters: Record<string, unknown>, params: PageParams) =>
      [...queryKeys.salary.all, 'payments', filters, params] as const,
    /** The period's batches, newest first. */
    paymentHistory: (filters: Record<string, unknown>, params: PageParams) =>
      [...queryKeys.salary.all, 'payment-history', filters, params] as const,
    /** One batch expanded, keyed by its id and the page of employees shown. */
    paymentBatch: (id: number, params: PageParams) =>
      [...queryKeys.salary.all, 'payment-batch', id, params] as const,
  },
  /**
   * Bonus Estimation — the estimate over a range, and what has been committed
   * for it.
   *
   * Its own root rather than a branch of `salary.all`: a bonus is written against
   * salary rows but never changes them, so a discard or a payment must not drag
   * this family with it, and saving a bonus must not invalidate the register.
   *
   * The two reads are separate families even though they share filters — the
   * estimate is what a bonus *would* cost and `saved` is what it *did*, so
   * neither may be shown under the other's heading while it loads. The
   * calculation base is deliberately NOT in the estimate key: all four bases come
   * back on every line, so switching the dropdown re-fills the column from the
   * answer already cached instead of firing a fresh read.
   */
  bonusEstimation: {
    all: ['bonus-estimation'] as const,
    estimate: (filters: Record<string, unknown>, params: PageParams) =>
      [...queryKeys.bonusEstimation.all, 'estimate', filters, params] as const,
    saved: (filters: Record<string, unknown>, params: PageParams) =>
      [...queryKeys.bonusEstimation.all, 'saved', filters, params] as const,
  },
  /**
   * Reports — the twelve statements, one family per module.
   *
   * The TYPE is part of the key, not a detail of the filters: Pay Slip and Pay
   * Register are different reads of the same month with different columns, and
   * neither may be shown under the other's heading while it loads.
   *
   * The filters (period or range, department, the employees it was narrowed to)
   * and the page — including its `sort`, which each type accepts only its own
   * columns for — pick a report out just as completely, so they're all in the key
   * alongside it.
   *
   * Deliberately its own root rather than under `salary.all`: reports only read.
   * Discarding a salary must still refresh them, which is what the `salary`
   * invalidation in `use-salary-mutations` doesn't reach — so those mutations
   * invalidate `reports.all` too.
   */
  reports: {
    all: ['reports'] as const,
    salary: (type: string, filters: Record<string, unknown>, params: PageParams) =>
      [...queryKeys.reports.all, 'salary', type, filters, params] as const,
    pf: (type: string, filters: Record<string, unknown>, params: PageParams) =>
      [...queryKeys.reports.all, 'pf', type, filters, params] as const,
    esic: (type: string, filters: Record<string, unknown>, params: PageParams) =>
      [...queryKeys.reports.all, 'esic', type, filters, params] as const,
    pt: (type: string, filters: Record<string, unknown>, params: PageParams) =>
      [...queryKeys.reports.all, 'pt', type, filters, params] as const,
  },
  /**
   * Attendance Management — one company day at a time.
   *
   * The date is what picks a read out, so it sits in every key: yesterday's
   * cards must never be shown under today's heading while the new day loads.
   * `groups` is the card screen (company tiles + one page of cards, narrowed by
   * the group-name search); `groupEmployees` is one card opened, keyed by the
   * level it belongs to as well as the id — a department 4 and a designation 4
   * are different groups.
   */
  attendance: {
    all: ['attendance'] as const,
    groups: (date: string, params: PageParams) =>
      [...queryKeys.attendance.all, 'groups', date, params] as const,
    groupEmployees: (
      groupBy: string,
      groupId: number,
      date: string,
      status: string,
      params: PageParams,
    ) =>
      [
        ...queryKeys.attendance.all,
        'group-employees',
        groupBy,
        groupId,
        date,
        status,
        params,
      ] as const,
    /** One employee's month grid, keyed by the month it answers for. */
    employeeMonth: (employeeId: number, month: string) =>
      [...queryKeys.attendance.all, 'employee-month', employeeId, month] as const,
  },
  /**
   * Help & Support — the tickets this organization raised with the platform
   * desk (`features/support/ticket`).
   *
   * Account-scoped, so no company rides in the key. The screen's filters
   * (status, desk, severity, raiser) each pick a different result set out
   * server-side, so they travel alongside the page params rather than being
   * applied to a cached list.
   */
  supportTicket: {
    all: ['support-ticket'] as const,
    list: (params?: PageParams, filters?: Record<string, unknown>) =>
      params
        ? ([...queryKeys.supportTicket.all, 'list', params, filters ?? {}] as const)
        : ([...queryKeys.supportTicket.all, 'list'] as const),
    detail: (id: number) => [...queryKeys.supportTicket.all, 'detail', id] as const,
  },
  /**
   * The employee help desk — what this account's employees raised
   * (`features/support/employee-ticket`).
   *
   * `summary` is the tab strip's counts and sits under the same `all` prefix as
   * the list on purpose: every transition moves a ticket between two of those
   * counts, so one invalidation has to refresh both. It carries the list's
   * filters MINUS the status ones, which is exactly what the endpoint takes.
   *
   * `detail` holds the ticket AND its whole thread — the API answers them in one
   * call — so posting a reply invalidates that one key rather than a second one.
   */
  employeeSupportTicket: {
    all: ['employee-support-ticket'] as const,
    list: (params?: PageParams, filters?: Record<string, unknown>) =>
      params
        ? ([
            ...queryKeys.employeeSupportTicket.all,
            'list',
            params,
            filters ?? {},
          ] as const)
        : ([...queryKeys.employeeSupportTicket.all, 'list'] as const),
    summary: (filters?: Record<string, unknown>) =>
      [...queryKeys.employeeSupportTicket.all, 'summary', filters ?? {}] as const,
    detail: (id: number) =>
      [...queryKeys.employeeSupportTicket.all, 'detail', id] as const,
  },
  bank: {
    all: ['bank'] as const,
    list: (params?: PageParams) =>
      params
        ? ([...queryKeys.bank.all, 'list', params] as const)
        : ([...queryKeys.bank.all, 'list'] as const),
    /** Paged, server-searched — backs the scroll-lazy bank dropdown. */
    infinite: (search?: string) =>
      [...queryKeys.bank.all, 'infinite', search ?? ''] as const,
    /** One bank — for labelling a selection the loaded pages don't cover. */
    detail: (id: number) => [...queryKeys.bank.all, 'detail', id] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    kpis: () => [...queryKeys.dashboard.all, 'kpis'] as const,
    dailySales: (date?: string) =>
      [...queryKeys.dashboard.all, 'daily-sales', date ?? 'today'] as const,
    teamPerformance: () => [...queryKeys.dashboard.all, 'team-performance'] as const,
    targetVsAchievement: () =>
      [...queryKeys.dashboard.all, 'target-vs-achievement'] as const,
    attendanceSummary: () => [...queryKeys.dashboard.all, 'attendance-summary'] as const,
    aiAnalytics: () => [...queryKeys.dashboard.all, 'ai-analytics'] as const,
  },
} as const
