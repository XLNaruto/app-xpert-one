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
  profile: {
    all: ['profile'] as const,
    me: () => [...queryKeys.profile.all, 'me'] as const,
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
    detail: (id: number) =>
      [...queryKeys.allowanceDeduction.all, 'detail', id] as const,
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
    /** Step 2 — the KYC columns of one employee. */
    kyc: (id: number) => [...queryKeys.employee.all, 'kyc', id] as const,
    /** Step 3 — the wage structure inherited from the current designation. */
    wageStructure: (id: number) =>
      [...queryKeys.employee.all, 'wage-structure', id] as const,
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
  },
  /**
   * Step 9 — leave records. `employeeId` scopes the list to one employee's tab
   * (`0` is the company-wide queue), and the filters travel in the key alongside
   * the page since each combination is its own result set.
   */
  employeeLeave: {
    all: ['employee-leave'] as const,
    list: (
      employeeId?: number,
      params?: PageParams,
      filters?: Record<string, unknown>,
    ) =>
      params
        ? ([
            ...queryKeys.employeeLeave.all,
            'list',
            employeeId ?? 0,
            params,
            filters ?? {},
          ] as const)
        : ([...queryKeys.employeeLeave.all, 'list', employeeId ?? 0] as const),
    detail: (id: number) => [...queryKeys.employeeLeave.all, 'detail', id] as const,
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
