/**
 * Centralised REST endpoint paths. Feature `api/` layers reference these
 * instead of hard-coding URL strings, so a path only ever changes in one place.
 * Paths are relative to `apiClient`'s baseURL (see `env.VITE_APP_API_URL`), and
 * every tenant route on this API is namespaced under `/user` — the public
 * routes (`CONFIG`) sit at the root instead.
 *
 * Nothing is documented in place: request/response shapes, scoping rules and
 * flow notes for every group below live in `endpoints.reference.ts`.
 */
export const endpoints = {
  CONFIG: {
    GET: '/config',
  },
  AUTH: {
    LOGIN: '/user/auth/login',
    REFRESH_TOKEN: '/user/auth/refresh',
    LOGOUT: '/user/auth/logout',
    SELECT_COMPANY: '/user/auth/select-company',
    VERIFY_EMAIL: '/user/auth/verify-email',
    RESEND_EMAIL_OTP: '/user/auth/resend-email-otp',
    VERIFY_LOGIN_OTP: '/user/auth/verify-login-otp',
  },
  ME: {
    GET: '/user/me',
    COMPANIES: '/user/my/companies',
    VERIFY_PASSWORD: '/user/me/verify-password',
    TWO_FACTOR_ENABLE: '/user/me/two-factor/enable',
    TWO_FACTOR_DISABLE: '/user/me/two-factor/disable',
    MY_ROLE: '/user/my-role',
  },
  ROLES: {
    LIST: '/user/roles',
    POST: '/user/roles',
    GET: (id: number) => `/user/roles/${id}`,
    PATCH: (id: number) => `/user/roles/${id}`,
    DELETE: (id: number) => `/user/roles/${id}`,
    ASSIGNABLE_PERMISSIONS: '/user/roles/assignable-permissions',
    ASSIGN: '/user/roles/assign',
  },
  ADMIN_USERS: {
    LIST: '/user/admin-users',
    POST: '/user/admin-users',
    GET: (id: number) => `/user/admin-users/${id}`,
    PATCH: (id: number) => `/user/admin-users/${id}`,
    DELETE: (id: number) => `/user/admin-users/${id}`,
    ASSIGNABLE_ROLES: '/user/admin-users/assignable-roles',
  },
  TALK_CREDENTIALS: {
    LIST: '/user/talk-credentials',
    POST: '/user/talk-credentials',
    GET: (id: number) => `/user/talk-credentials/${id}`,
    PATCH: (id: number) => `/user/talk-credentials/${id}`,
    DELETE: (id: number) => `/user/talk-credentials/${id}`,
  },
  /**
   * Talk monitoring — the owner's read-only window onto the account's chats.
   * Three reads, one per pane of the screen: the people who have a Talk
   * identity, one person's conversations, and one conversation's messages.
   */
  TALK_MONITORING: {
    PEOPLE: '/user/talk/monitoring/people',
    CHATS: (talkUserId: number) => `/user/talk/monitoring/people/${talkUserId}/chats`,
    MESSAGES: (talkUserId: number, chatId: number) =>
      `/user/talk/monitoring/people/${talkUserId}/chats/${chatId}/messages`,
  },
  BILLING: {
    PLANS: '/user/plans',
    SUBSCRIPTION: '/user/subscription',
    /** POST — open a subscription on a plan; answers with a payment order. */
    SUBSCRIBE: '/user/subscriptions',
  },
  IP_ADDRESSES: {
    LIST: '/user/ip-addresses',
    POST: '/user/ip-addresses',
    GET: (id: number) => `/user/ip-addresses/${id}`,
    PATCH: (id: number) => `/user/ip-addresses/${id}`,
    DELETE: (id: number) => `/user/ip-addresses/${id}`,
    MODE: '/user/ip-addresses/mode',
  },
  SUPPORT_TICKETS: {
    LIST: '/user/support/tickets',
    POST: '/user/support/tickets',
    GET: (id: number) => `/user/support/tickets/${id}`,
    PATCH: (id: number) => `/user/support/tickets/${id}`,
    REOPEN: (id: number) => `/user/support/tickets/${id}/reopen`,
    CLOSE: (id: number) => `/user/support/tickets/${id}/close`,
  },
  EMPLOYEE_SUPPORT_TICKETS: {
    LIST: '/user/employee-support-tickets',
    SUMMARY: '/user/employee-support-tickets/summary',
    GET: (id: number) => `/user/employee-support-tickets/${id}`,
    MESSAGES: (id: number) => `/user/employee-support-tickets/${id}/messages`,
    STATUS: (id: number) => `/user/employee-support-tickets/${id}/status`,
  },
  COMPANIES: {
    LIST: '/user/companies',
    POST: '/user/companies',
    GET: (id: number) => `/user/companies/${id}`,
    PATCH: (id: number) => `/user/companies/${id}`,
    DELETE: (id: number) => `/user/companies/${id}`,
  },
  BRANCHES: {
    LIST: '/user/branches',
    POST: '/user/branches',
    GET: (id: number) => `/user/branches/${id}`,
    PATCH: (id: number) => `/user/branches/${id}`,
    DELETE: (id: number) => `/user/branches/${id}`,
  },
  ACT_REGISTRATIONS: {
    LIST: '/user/act-registrations',
    POST: '/user/act-registrations',
    GET: (id: number) => `/user/act-registrations/${id}`,
    PATCH: (id: number) => `/user/act-registrations/${id}`,
  },
  PF_RATES: {
    LIST: '/user/pf-rates',
    POST: '/user/pf-rates',
    GET: (id: number) => `/user/pf-rates/${id}`,
    PATCH: (id: number) => `/user/pf-rates/${id}`,
    DELETE: (id: number) => `/user/pf-rates/${id}`,
  },
  ESIC_RATES: {
    LIST: '/user/esic-rates',
    POST: '/user/esic-rates',
    GET: (id: number) => `/user/esic-rates/${id}`,
    PATCH: (id: number) => `/user/esic-rates/${id}`,
    DELETE: (id: number) => `/user/esic-rates/${id}`,
  },
  PT_RATES: {
    LIST: '/user/pt-rates',
    POST: '/user/pt-rates',
    GET: (id: number) => `/user/pt-rates/${id}`,
    PATCH: (id: number) => `/user/pt-rates/${id}`,
    DELETE: (id: number) => `/user/pt-rates/${id}`,
  },
  LWF_RATES: {
    LIST: '/user/lwf-rates',
    POST: '/user/lwf-rates',
    GET: (id: number) => `/user/lwf-rates/${id}`,
    PATCH: (id: number) => `/user/lwf-rates/${id}`,
    DELETE: (id: number) => `/user/lwf-rates/${id}`,
  },
  OFFICE_ADDRESSES: {
    LIST: '/user/office-addresses',
    POST: '/user/office-addresses',
    GET: (id: number) => `/user/office-addresses/${id}`,
    PATCH: (id: number) => `/user/office-addresses/${id}`,
    DELETE: (id: number) => `/user/office-addresses/${id}`,
  },
  DEPARTMENTS: {
    LIST: '/user/departments',
    POST: '/user/departments',
    GET: (id: number) => `/user/departments/${id}`,
    PATCH: (id: number) => `/user/departments/${id}`,
    DELETE: (id: number) => `/user/departments/${id}`,
  },
  SHIFTS: {
    LIST: '/user/shifts',
    POST: '/user/shifts',
    GET: (id: number) => `/user/shifts/${id}`,
    PATCH: (id: number) => `/user/shifts/${id}`,
    DELETE: (id: number) => `/user/shifts/${id}`,
    /** The dated versions of one shift's rules, newest first. */
    HISTORY: (id: number) => `/user/shifts/${id}/history`,
    SET_DEFAULT: (id: number) => `/user/shifts/${id}/set-default`,
    CLEAR_DEFAULT: '/user/shifts/clear-default',
  },
  WEEKOFF_POLICIES: {
    LIST: '/user/weekoff-policies',
    POST: '/user/weekoff-policies',
    GET: (id: number) => `/user/weekoff-policies/${id}`,
    PATCH: (id: number) => `/user/weekoff-policies/${id}`,
    DELETE: (id: number) => `/user/weekoff-policies/${id}`,
    SET_DEFAULT: (id: number) => `/user/weekoff-policies/${id}/set-default`,
    CLEAR_DEFAULT: '/user/weekoff-policies/clear-default',
  },
  DESIGNATIONS: {
    LIST: '/user/designations',
    POST: '/user/designations',
    GET: (id: number) => `/user/designations/${id}`,
    PATCH: (id: number) => `/user/designations/${id}`,
    DELETE: (id: number) => `/user/designations/${id}`,
    WAGE_STRUCTURES: (id: number) => `/user/designations/${id}/wage-structures`,
    WAGE_STRUCTURE: (id: number, wageStructureId: number) =>
      `/user/designations/${id}/wage-structures/${wageStructureId}`,
    BULK_WAGE_GRID: '/user/designations/wage-structures',
    BULK_WAGE_HISTORY: '/user/designations/wage-structures/history',
    BULK_UPDATE: '/user/designations/bulk-update',
    /**
     * The designation's standing paid-allowance policy — no year, applying to
     * everyone in the role, and the normal home of an allowance. `PUT` is a
     * WHOLE-LIST REPLACE, like the employee grant above.
     */
    LEAVE_QUOTAS: (id: number) => `/user/designations/${id}/leave-quotas`,
  },
  LEAVE_TYPES: {
    LIST: '/user/leave-types',
    POST: '/user/leave-types',
    GET: (id: number) => `/user/leave-types/${id}`,
    PATCH: (id: number) => `/user/leave-types/${id}`,
    DELETE: (id: number) => `/user/leave-types/${id}`,
  },
  HOLIDAYS: {
    LIST: '/user/holidays',
    POST: '/user/holidays',
    GET: (id: number) => `/user/holidays/${id}`,
    PATCH: (id: number) => `/user/holidays/${id}`,
    DELETE: (id: number) => `/user/holidays/${id}`,
  },
  PAY_COMPONENTS: {
    LIST: '/user/pay-components',
    POST: '/user/pay-components',
    GET: (id: number) => `/user/pay-components/${id}`,
    PATCH: (id: number) => `/user/pay-components/${id}`,
    DELETE: (id: number) => `/user/pay-components/${id}`,
  },
  ASSETS: {
    LIST: '/user/assets',
    POST: '/user/assets',
    GET: (id: number) => `/user/assets/${id}`,
    PATCH: (id: number) => `/user/assets/${id}`,
    DELETE: (id: number) => `/user/assets/${id}`,
  },
  DOCUMENT_TYPES: {
    LIST: '/user/document-types',
    POST: '/user/document-types',
    GET: (id: number) => `/user/document-types/${id}`,
    PATCH: (id: number) => `/user/document-types/${id}`,
    DELETE: (id: number) => `/user/document-types/${id}`,
  },
  DOCUMENTS: {
    LIST: '/user/documents',
    POST: '/user/documents',
    GET: (id: number) => `/user/documents/${id}`,
    PATCH: (id: number) => `/user/documents/${id}`,
    DELETE: (id: number) => `/user/documents/${id}`,
  },
  EMPLOYEES: {
    LIST: '/user/employees',
    /**
     * The picker list — id/name/mobile/email only, across EVERY company of the
     * account, so it takes no `company_id`. `LIST` above is the register's grid.
     */
    PICKER: '/user/employees/list',
    POST: '/user/employees',
    GET: (id: number) => `/user/employees/${id}`,
    PATCH: (id: number) => `/user/employees/${id}`,
    DELETE_FACE: (id: number) => `/user/employees/${id}/face`,
    KYC: (id: number) => `/user/employees/${id}/kyc`,
    WAGE_STRUCTURE: (id: number) => `/user/employees/${id}/wage-structure`,
    /**
     * The per-YEAR paid-allowance grant for one employee — the top tier of the
     * quota lookup, overriding their designation's standing policy. `PUT` is a
     * WHOLE-LIST REPLACE: a leave type left out of `rows` is cleared, and falls
     * back to the designation.
     */
    LEAVE_QUOTAS: (id: number) => `/user/employees/${id}/leave-quotas`,
    FAMILY: (id: number) => `/user/employees/${id}/family`,
    FAMILY_MEMBER: (id: number, memberId: number) =>
      `/user/employees/${id}/family/${memberId}`,
    EDUCATIONS: (id: number) => `/user/employees/${id}/educations`,
    EDUCATION: (id: number, educationId: number) =>
      `/user/employees/${id}/educations/${educationId}`,
    EXPERIENCES: (id: number) => `/user/employees/${id}/experiences`,
    EXPERIENCE: (id: number, experienceId: number) =>
      `/user/employees/${id}/experiences/${experienceId}`,
    DOCUMENTS: (id: number) => `/user/employees/${id}/documents`,
    DOCUMENT: (id: number, employeeDocumentId: number) =>
      `/user/employees/${id}/documents/${employeeDocumentId}`,
    ASSETS: (id: number) => `/user/employees/${id}/assets`,
    ASSET: (id: number, employeeAssetId: number) =>
      `/user/employees/${id}/assets/${employeeAssetId}`,
    TRANSFERS: (id: number) => `/user/employees/${id}/transfers`,
    TRANSFER: (id: number, serviceId: number) =>
      `/user/employees/${id}/transfers/${serviceId}`,
    LEAVE_SERVICE: (id: number, serviceId: number) =>
      `/user/employees/${id}/transfers/${serviceId}/leave-service`,
    SHIFT_ON_DAY: (id: number) => `/user/employees/${id}/shift`,
    SHIFTS: (id: number) => `/user/employees/${id}/shifts`,
    SHIFT_ENTRY: (id: number, entryId: number) =>
      `/user/employees/${id}/shifts/${entryId}`,
    ROSTER: (id: number) => `/user/employees/${id}/roster`,
    ROSTER_ENTRY: (id: number, entryId: number) =>
      `/user/employees/${id}/roster/${entryId}`,
  },
  EMPLOYEE_LEAVES: {
    LIST: '/user/employee-leaves',
    POST: '/user/employee-leaves',
    GET: (id: number) => `/user/employee-leaves/${id}`,
    PATCH: (id: number) => `/user/employee-leaves/${id}`,
    DELETE: (id: number) => `/user/employee-leaves/${id}`,
    STATUS: (id: number) => `/user/employee-leaves/${id}/status`,
    /**
     * One employee's paid-allowance ledger for a year — per leave type, plus the
     * headline. Read it before warning that a range will overflow the allowance;
     * never to BLOCK an application, which the API always accepts.
     */
    BALANCE: '/user/employee-leaves/balance',
  },
  /**
   * The account's leave approval chain — ONE ordered list of role names that
   * every company of the account follows. There is no per-level endpoint,
   * because inserting a level renumbers everything below it.
   */
  LEAVE_APPROVAL_CHAIN: {
    GET: '/user/leave-approval-chain',
    PUT: '/user/leave-approval-chain',
    /** Distinct role names across the whole account — the picker's options. */
    ROLES: '/user/leave-approval-chain/roles',
  },
  SALARY: {
    REGISTER: '/user/salary/register',
    REPORT: '/user/salary/report',
    BULK_SAVE: '/user/salary/bulk-save',
    BULK_DELETE: '/user/salary/bulk-delete',
    IMPORTS: '/user/salary/imports',
    IMPORT_TEMPLATE: '/user/salary/exports/import-template',
    PAYMENTS: '/user/salary/payments',
    PAYMENT_HISTORY: '/user/salary/payments/history',
    PAYMENT: (id: number) => `/user/salary/payments/history/${id}`,
    BANK_TRANSFER_SHEET: '/user/salary/exports/bank-transfer-sheet',
  },
  BONUS_ESTIMATION: {
    BASE: '/user/bonus-estimation',
    ESTIMATE: '/user/bonus-estimation/estimate',
    SAVED: '/user/bonus-estimation/saved',
  },
  SALARY_REPORTS: {
    PAY_SLIP: '/user/salary-reports/pay-slip',
    PAY_REGISTER: '/user/salary-reports/pay-register',
    GROSS_SALARY: '/user/salary-reports/gross-salary',
    PAID_SALARY: '/user/salary-reports/paid-salary',
    UNPAID_SALARY: '/user/salary-reports/unpaid-salary',
  },
  PF_REPORTS: {
    CHALLAN: '/user/pf-reports/pf-challan',
    STATEMENT: '/user/pf-reports/pf-statement',
    NEW_JOINING: '/user/pf-reports/new-joining',
    ECR: '/user/pf-reports/ecr',
  },
  ESIC_REPORTS: {
    STATEMENT: '/user/esic-reports/esic-statement',
    CHALLAN: '/user/esic-reports/esic-challan',
  },
  PT_REPORTS: {
    STATEMENT: '/user/pt-reports/pt-report',
  },
  ATTENDANCE: {
    GROUPS: '/user/attendance/groups',
    GROUP_EMPLOYEES: '/user/attendance/groups/employees',
    EMPLOYEE_DETAIL: '/user/attendance/employee-detail',
  },
  UPLOADS: {
    COMPANY_LOGO: '/user/uploads/company-logo',
    EMPLOYEE_PHOTO: '/user/uploads/employee-photo',
    EMPLOYEE_DOCUMENT: '/user/uploads/employee-document',
    LEAVE_ATTACHMENT: '/user/uploads/leave-attachment',
    SALARY_IMPORT: '/user/uploads/salary-import',
    SALARY_PAYMENT_DOCUMENT: '/user/uploads/salary-payment-document',
    SUPPORT_ATTACHMENT: '/user/uploads/support-attachment',
  },
  BANKS: {
    LIST: '/user/banks',
    GET: (id: number) => `/user/banks/${id}`,
  },
  STATES: {
    LIST: '/user/states',
    GET: (id: number) => `/user/states/${id}`,
  },
  DISTRICTS: {
    LIST: '/user/districts',
    GET: (id: number) => `/user/districts/${id}`,
  },
} as const
