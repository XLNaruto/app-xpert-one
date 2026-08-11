/**
 * THE ONE PLACE permission codes are named — taken verbatim from the API's own
 * catalog (`permission_codes` on `GET /user/my-role`).
 *
 * Each entry is the RESOURCE half of a `<resource>:<action>` code. Passed on its
 * own it means "any action on this resource", which is the right question for a
 * menu row or a route: `can(PERMISSIONS.pfRates)`. For a single button, append
 * the action: `can(\`${PERMISSIONS.pfRates}:create\`)` — or take the four CRUD
 * flags in one call with `useResourceAccess(PERMISSIONS.pfRates)`.
 *
 * The catalog's actions are `list`, `read`, `create`, `update`, `delete` (plus a
 * few bespoke ones such as `calculate-salary:import`, `talk:access`,
 * `attendance:access`, `web:access`, `billing:manage`). Note `list` and `read`
 * are separate codes: a list screen is reachable on `list`, its detail on
 * `read`.
 */
export const PERMISSIONS = {
  // ── Sections (headings, not screens) ──────────────────────────────────────
  dashboard: 'dashboard',
  hr: 'hr',
  salary: 'salary',
  reports: 'reports',
  administration: 'administration',
  masterData: 'master-data',
  companySetup: 'company-setup',
  statutorySetup: 'statutory-setup',
  hrSetup: 'hr-setup',
  generalSetup: 'general-setup',

  // ── Human Resource ────────────────────────────────────────────────────────
  employees: 'employees',
  /** Leave Management — the API calls the resource `leaves`, not `employee-leaves`. */
  leaves: 'leaves',
  /**
   * Attendance Management the SCREEN. Not `attendance:access`, which is the
   * account-level application right (see `ACCESS_CODES` below).
   */
  attendance: 'attendance-management',
  bulkWage: 'bulk-wage-update',
  calculateSalary: 'calculate-salary',
  salaryView: 'view-salary',
  paySalary: 'pay-salary',

  // ── Reports (no screens in the app yet) ───────────────────────────────────
  salaryReport: 'salary-report',
  pfReport: 'pf-report',
  esicReport: 'esic-report',
  ptReport: 'pt-report',
  bonusEstimation: 'bonus-estimation',

  // ── Master · Company Setup ────────────────────────────────────────────────
  companies: 'companies',
  branches: 'branches',
  departments: 'departments',
  designations: 'designations',

  // ── Master · Statutory Setup ──────────────────────────────────────────────
  pfRates: 'pf-rates',
  esicRates: 'esic-rates',
  ptRates: 'pt-rates',
  lwfRates: 'lwf-rates',
  /** All five address screens are one resource on the API. */
  officeAddresses: 'office-addresses',

  // ── Master · HR Setup ─────────────────────────────────────────────────────
  holidays: 'holidays',
  leaveTypes: 'leave-types',
  /** Allowance & Deduction. */
  payComponents: 'pay-components',

  // ── Master · Shift Management ─────────────────────────────────────────────
  /** The company's shifts — edited on the company screen's Shift tab. */
  shifts: 'shifts',
  shiftRotations: 'shift-rotations',
  weekoffPolicies: 'weekoff-policies',
  /** An employee's shift assignment. */
  employeeShifts: 'employee-shifts',

  // ── Master · General Setup ────────────────────────────────────────────────
  assets: 'assets',
  documentTypes: 'document-types',
  documents: 'documents',

  // ── Administration (no screens in the app yet) ────────────────────────────
  users: 'users',
  roles: 'roles',
  access: 'access',
  ipAddresses: 'ip-addresses',
  talkMonitoring: 'talk-monitoring',
  talkCredentials: 'talk-credentials',
  supervisorApp: 'supervisor-app',
  geoFence: 'geo-fence',
  bulkAttendance: 'bulk-attendance',
  support: 'support',

  // ── Lookups (dropdown data) ───────────────────────────────────────────────
  states: 'states',
  districts: 'districts',
  banks: 'banks',
} as const

/**
 * Account-level application rights, not screens. They answer "may this account
 * use X at all", and `GET /user/my-role` also resolves them under `access`
 * (`role.access.web` / `.app` / `.talk` / `.attendance`) — which is what login
 * itself enforces, so prefer reading those over checking these codes.
 */
export const ACCESS_CODES = {
  web: 'web:access',
  talk: 'talk:access',
  attendance: 'attendance:access',
  billing: 'billing:manage',
} as const

/** The five uniform actions every CRUD resource in the catalog carries. */
export const ACTIONS = {
  list: 'list',
  read: 'read',
  create: 'create',
  update: 'update',
  delete: 'delete',
} as const
