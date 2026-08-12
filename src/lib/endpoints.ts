/**
 * Centralised REST endpoint paths. Feature `api/` layers reference these
 * instead of hard-coding URL strings, so a path only ever changes in one place.
 * Paths are relative to `apiClient`'s baseURL (see `env.VITE_APP_API_URL`), and
 * every tenant route on this API is namespaced under `/user` — the public
 * routes (`CONFIG`) sit at the root instead.
 *
 * Request/response shapes and flow notes live in `endpoints.reference.ts`.
 */
export const endpoints = {
  /**
   * Client-facing app config — the media/CDN base URL that turns the storage
   * paths the API returns into renderable URLs. Public: root-namespaced and
   * needs no bearer, so it can be read before a company is selected.
   */
  CONFIG: {
    GET: '/config',
  },
  AUTH: {
    LOGIN: '/user/auth/login',
    REFRESH_TOKEN: '/user/auth/refresh',
    LOGOUT: '/user/auth/logout',
    SELECT_COMPANY: '/user/auth/select-company',
    /**
     * Spend the six-digit code a first login mailed, which flips
     * `is_email_verified`. Mints no token — verification is not a login, so the
     * screen signs in again once it succeeds.
     */
    VERIFY_EMAIL: '/user/auth/verify-email',
    /** Mail a fresh verification code; the previous one stops working. */
    RESEND_EMAIL_OTP: '/user/auth/resend-email-otp',
    /**
     * The second half of a two-factor login: the `challenge_token` the login
     * answered with plus the mailed code, in exchange for the token pair.
     */
    VERIFY_LOGIN_OTP: '/user/auth/verify-login-otp',
  },
  ME: {
    GET: '/user/me',
    COMPANIES: '/user/my/companies',
    /** Turn the caller's own second factor on / off. No permission code. */
    TWO_FACTOR_ENABLE: '/user/me/two-factor/enable',
    TWO_FACTOR_DISABLE: '/user/me/two-factor/disable',
    /**
     * The caller's own role + everything the front end needs to draw itself:
     * the flat `permission_codes` every route policy checks and the same set
     * rendered as a menu tree. The only role route that needs no permission.
     */
    MY_ROLE: '/user/my-role',
  },
  /**
   * Roles — what a web-panel user may do, authored per company.
   *
   * `ASSIGNABLE_PERMISSIONS` is the builder's checkbox matrix: the web panel's
   * catalog narrowed to what the account's plan unlocked and minus `roles:*`,
   * which is never delegatable. An action absent from it can never be saved, so
   * the screen renders exactly what comes back rather than the full catalog.
   *
   * `permission_codes` on POST / PATCH is the COMPLETE ticked set and REPLACES
   * what's stored — unticking a box means omitting its code, never sending a
   * diff. Each action carries `requires`, the codes it doesn't work without, and
   * the server does not repair a selection: an incomplete one answers 400 naming
   * what's missing, so the builder maintains that closure itself.
   *
   * A DELETE is refused with 409 while a live user still holds the role.
   */
  ROLES: {
    LIST: '/user/roles',
    POST: '/user/roles',
    GET: (id: number) => `/user/roles/${id}`,
    PATCH: (id: number) => `/user/roles/${id}`,
    DELETE: (id: number) => `/user/roles/${id}`,
    ASSIGNABLE_PERMISSIONS: '/user/roles/assignable-permissions',
    ASSIGN: '/user/roles/assign',
  },
  /**
   * Billing — the account's plan, not a company's. Nothing here takes a
   * `company_id`: the subscription, its entitlements and the usage counted
   * against them all belong to the organization.
   *
   * `PLANS` is the buyable catalog plus any plan built for this organization,
   * with the running one flagged `is_active`. `SUBSCRIPTION` is what's actually
   * live, including the prices it was bought at — prices the plan catalog quotes
   * for *today*, which is why the two are read separately rather than joined.
   * Usage against the plan's limits comes from `ME.GET`.
   *
   * Purchasing (`POST /user/subscriptions`, which answers with a Razorpay order)
   * is deliberately absent: the checkout handoff needs a publishable key the API
   * doesn't hand out, so the screen reads and doesn't sell.
   */
  BILLING: {
    PLANS: '/user/plans',
    SUBSCRIPTION: '/user/subscription',
  },
  /**
   * IP access control — which networks may reach the panel for a company.
   *
   * Two things live here. `MODE` is the company-level switch: `PUBLIC` means
   * everyone but the blocked list, `RESTRICTED` means only the allowed list. The
   * rest is the list itself — one entry per host (`203.0.113.4`, `2001:db8::1`)
   * or CIDR range (`10.0.0.0/8`), each tagged `ALLOWED` or `BLOCKED`.
   *
   * The API refuses the moves that would lock the caller out: switching to
   * `RESTRICTED` with an empty allow list, and deleting (or re-typing) the last
   * allowed entry of a `RESTRICTED` company both answer 409. The same address may
   * sit on both lists — `BLOCKED` wins at the door.
   *
   * Tenant-scoped: a required `company_id` on reads and on the mode write, and in
   * the body on create. Gated by `ip-addresses:*`, not `companies:*`.
   */
  IP_ADDRESSES: {
    LIST: '/user/ip-addresses',
    POST: '/user/ip-addresses',
    GET: (id: number) => `/user/ip-addresses/${id}`,
    PATCH: (id: number) => `/user/ip-addresses/${id}`,
    DELETE: (id: number) => `/user/ip-addresses/${id}`,
    /** GET reads the company's mode + list counts; PUT switches it. */
    MODE: '/user/ip-addresses/mode',
  },
  /**
   * The company master — every company under the caller's account. Unlike the
   * tenant-scoped masters below it carries no `company_id`: the account itself
   * is the scope, and a company's code is generated server-side.
   */
  COMPANIES: {
    LIST: '/user/companies',
    POST: '/user/companies',
    GET: (id: number) => `/user/companies/${id}`,
    PATCH: (id: number) => `/user/companies/${id}`,
    DELETE: (id: number) => `/user/companies/${id}`,
  },
  /**
   * The company's branches. Tenant-scoped: a required `company_id` on reads and
   * in the body on create — and an edit can't move a branch between companies,
   * so the PATCH body leaves it out.
   */
  BRANCHES: {
    LIST: '/user/branches',
    POST: '/user/branches',
    GET: (id: number) => `/user/branches/${id}`,
    PATCH: (id: number) => `/user/branches/${id}`,
    DELETE: (id: number) => `/user/branches/${id}`,
  },
  /**
   * A branch's applicable acts — PF, ESIC, Factory, Professional Tax, LWF and
   * Employment Exchange in one row per branch.
   *
   * `LIST` is a read for one `branch_id` and answers `{ act_registration }`,
   * `null` when the tab has never been saved — which is how a save picks POST
   * over PATCH. A second POST for the same branch is a 409.
   */
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
  /**
   * A PT rate carries its salary slabs inline as `details` — the nested array
   * travels with the rate on POST/PATCH, so slabs are never saved separately.
   */
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
  /**
   * One endpoint behind all five office-address screens — PF, ESIC, LWF,
   * Factory and Employment Exchange — told apart by the record's `office_for`.
   */
  OFFICE_ADDRESSES: {
    LIST: '/user/office-addresses',
    POST: '/user/office-addresses',
    GET: (id: number) => `/user/office-addresses/${id}`,
    PATCH: (id: number) => `/user/office-addresses/${id}`,
    DELETE: (id: number) => `/user/office-addresses/${id}`,
  },
  /**
   * The company's departments, each optionally pinned to a branch. Tenant-scoped:
   * a required `company_id` on reads and in the body on create — an edit can move
   * a department between branches but never between companies, so the PATCH body
   * leaves `company_id` out. The department code is generated server-side.
   */
  DEPARTMENTS: {
    LIST: '/user/departments',
    POST: '/user/departments',
    GET: (id: number) => `/user/departments/${id}`,
    PATCH: (id: number) => `/user/departments/${id}`,
    DELETE: (id: number) => `/user/departments/${id}`,
  },
  /**
   * The company's shifts — a named window of the clock, plus the tolerances
   * attendance is judged against (the concession period, the early-exit grace,
   * and the hours that make a full or a half day).
   *
   * Tenant-scoped: a required `company_id` on reads and in the create body. A
   * shift is never moved between companies, so the PATCH body leaves it out.
   * `is_night_shift` is DERIVED from the two times (an `end_time` earlier than
   * `start_time` makes it one) and is never sent.
   *
   * `SET_DEFAULT` / `CLEAR_DEFAULT` are what make per-employee assignment
   * unnecessary: with a default in place an ordinary employee needs no
   * assignment row at all. Both take exactly one of `company_id` or
   * `department_id` — a department's default wins over its company's, and a
   * department with none falls back to the company's.
   *
   * A DELETE is refused with 409 while the shift is still a default anywhere or
   * referenced by a rotation, an assignment or a roster entry.
   */
  SHIFTS: {
    LIST: '/user/shifts',
    POST: '/user/shifts',
    GET: (id: number) => `/user/shifts/${id}`,
    PATCH: (id: number) => `/user/shifts/${id}`,
    DELETE: (id: number) => `/user/shifts/${id}`,
    SET_DEFAULT: (id: number) => `/user/shifts/${id}/set-default`,
    CLEAR_DEFAULT: '/user/shifts/clear-default',
  },
  /**
   * Rotation cycles — a named ring of shifts an employee walks week by week
   * (nights one week, mornings the next).
   *
   * Tenant-scoped like the shifts they name: a required `company_id` on reads and
   * in the create body, and every shift in the cycle must belong to that same
   * company.
   *
   * `weeks` is the WHOLE cycle, not a patchable list: it has to cover weeks
   * `1..cycle_length_weeks` exactly once, because an employee landing on a missing
   * week would silently fall through to the department default. On a PATCH,
   * omitting `weeks` leaves the cycle alone and sending it replaces every week —
   * so `cycle_length_weeks` and `weeks` are validated against each other whichever
   * of the two moved.
   *
   * The cycle is anchored per assignment, not globally: week 1 starts at each
   * employee's own `effective_date`, so two people assigned a week apart are
   * legitimately out of phase.
   *
   * A DELETE is refused with 409 while employees are still assigned to it.
   */
  SHIFT_ROTATIONS: {
    LIST: '/user/shift-rotations',
    POST: '/user/shift-rotations',
    GET: (id: number) => `/user/shift-rotations/${id}`,
    PATCH: (id: number) => `/user/shift-rotations/${id}`,
    DELETE: (id: number) => `/user/shift-rotations/${id}`,
  },
  /**
   * Week-off policies — which days of the week don't count as working days.
   *
   * `days` is a list of RULES rather than a list of weekdays, which is what makes
   * the interesting patterns expressible: `week_day` is 0 = Sunday … 6 = Saturday
   * and `week_number` names WHICH occurrence of that weekday in the month (1–5),
   * `null` meaning every one. Alternate Saturdays are therefore two rules with
   * `week_number` 2 and 4, and because a dated rule beats an every-week rule,
   * `is_off: false` carves an exception out of a broad one.
   *
   * Like the rotation's cycle, the rule set is replaced wholesale: omitting `days`
   * on a PATCH leaves the rules alone and sending it replaces them all — "which
   * days are off" only makes sense read together, so there is no per-rule patch.
   *
   * `SET_DEFAULT` / `CLEAR_DEFAULT` take exactly one of `company_id` or
   * `department_id` (the department wins). A shift may name its own policy, but
   * most don't — and without a default at one of those two levels every such shift
   * falls back to the platform's Sunday-only constant.
   *
   * A DELETE is refused with 409 while a shift, company or department points at it.
   */
  WEEKOFF_POLICIES: {
    LIST: '/user/weekoff-policies',
    POST: '/user/weekoff-policies',
    GET: (id: number) => `/user/weekoff-policies/${id}`,
    PATCH: (id: number) => `/user/weekoff-policies/${id}`,
    DELETE: (id: number) => `/user/weekoff-policies/${id}`,
    SET_DEFAULT: (id: number) => `/user/weekoff-policies/${id}/set-default`,
    CLEAR_DEFAULT: '/user/weekoff-policies/clear-default',
  },
  /**
   * The company's designations — a title plus an effective-dated wage structure
   * behind it. The two are separate resources on purpose:
   *
   * - `LIST` answers titles only (name + audit), so the list screen shows no pay.
   * - `POST` establishes the title *and* its opening wage structure in one body.
   * - `PATCH` takes the `name` and nothing else — pay is never edited in place.
   * - `WAGE_STRUCTURES` is the version history: POST appends one version from a
   *   `YYYY-MM` month, and `WAGE_STRUCTURE` patches one existing version in
   *   place (correcting a row rather than superseding it).
   *
   * The last two are the bulk wage screen's, which configures every designation
   * of a company at once against one effective month:
   *
   * - `BULK_WAGE_GRID` reads the whole grid — every designation with the version
   *   of its structure in force. Unpaginated: the screen is saved as a whole.
   * - `BULK_UPDATE` writes it back in one transaction — either every row lands
   *   or none does. Per row, a structure already effective from that exact month
   *   is updated and any other month adds a version, keeping the earlier ones as
   *   history.
   *
   * Tenant-scoped: a required `company_id` on reads and in the create body.
   */
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
    /**
     * Every designation of a company with *all* its wage versions — the bulk
     * grid's read-only history twin. Paged over the designations, so a title's
     * versions are never split across two pages.
     */
    BULK_WAGE_HISTORY: '/user/designations/wage-structures/history',
    BULK_UPDATE: '/user/designations/bulk-update',
  },
  /**
   * The company's leave catalog. Every read is scoped by a required
   * `company_id`, and a new leave type carries the same id in its body.
   */
  LEAVE_TYPES: {
    LIST: '/user/leave-types',
    POST: '/user/leave-types',
    GET: (id: number) => `/user/leave-types/${id}`,
    PATCH: (id: number) => `/user/leave-types/${id}`,
    DELETE: (id: number) => `/user/leave-types/${id}`,
  },
  /**
   * The company's holiday calendar. Like leave types, every read is scoped by a
   * required `company_id` and a new holiday carries the same id in its body.
   */
  HOLIDAYS: {
    LIST: '/user/holidays',
    POST: '/user/holidays',
    GET: (id: number) => `/user/holidays/${id}`,
    PATCH: (id: number) => `/user/holidays/${id}`,
    DELETE: (id: number) => `/user/holidays/${id}`,
  },
  /**
   * The company's payroll catalog — allowances and deductions in one resource,
   * told apart by the record's `type`. Tenant-scoped like the two masters above:
   * a required `company_id` on reads, and in the body on create.
   */
  PAY_COMPONENTS: {
    LIST: '/user/pay-components',
    POST: '/user/pay-components',
    GET: (id: number) => `/user/pay-components/${id}`,
    PATCH: (id: number) => `/user/pay-components/${id}`,
    DELETE: (id: number) => `/user/pay-components/${id}`,
  },
  /**
   * The company's asset master — the catalog employee assets are issued from.
   * Tenant-scoped: a required `company_id` on reads, and in the body on create.
   */
  ASSETS: {
    LIST: '/user/assets',
    POST: '/user/assets',
    GET: (id: number) => `/user/assets/${id}`,
    PATCH: (id: number) => `/user/assets/${id}`,
    DELETE: (id: number) => `/user/assets/${id}`,
  },
  /**
   * The company's document categories — the parent of the `documents` master, so
   * a type exists before anything can be filed under it. Tenant-scoped: a
   * required `company_id` on reads, and in the body on create. A name must be
   * unique within the company (409 otherwise), and a delete is refused with 409
   * while documents still reference the type.
   */
  DOCUMENT_TYPES: {
    LIST: '/user/document-types',
    POST: '/user/document-types',
    GET: (id: number) => `/user/document-types/${id}`,
    PATCH: (id: number) => `/user/document-types/${id}`,
    DELETE: (id: number) => `/user/document-types/${id}`,
  },
  /**
   * The company's document master, each row filed under a document type.
   * Tenant-scoped like its parent, and `document_type_id` narrows a read to one
   * category. Names are unique within the company (409 otherwise).
   */
  DOCUMENTS: {
    LIST: '/user/documents',
    POST: '/user/documents',
    GET: (id: number) => `/user/documents/${id}`,
    PATCH: (id: number) => `/user/documents/${id}`,
    DELETE: (id: number) => `/user/documents/${id}`,
  },
  /**
   * The employee — one person, plus the postings and the nine steps hung off
   * them. The wizard's shape follows the API's: step 1 is the employee row
   * itself (created together with the FIRST posting), and every later step is
   * its own sub-resource under `/user/employees/:id/…`.
   *
   * `POST` establishes the person and their opening posting in one body, so a
   * new employee exists only once step 1 is saved — which is why every other
   * tab is locked until then. `PATCH` writes the person and the CURRENT posting;
   * moving someone between company / branch / department / designation goes
   * through `TRANSFERS` instead, so the old posting survives as history.
   *
   * Reads are scoped by a required `company_id` on the list and by the record's
   * own tenant everywhere else.
   */
  EMPLOYEES: {
    LIST: '/user/employees',
    POST: '/user/employees',
    GET: (id: number) => `/user/employees/${id}`,
    PATCH: (id: number) => `/user/employees/${id}`,

    /**
     * DELETE — de-register the employee's face: the face record and its captured
     * images are soft-deleted and the stored images purged, answering how many
     * went. The person is re-registered from the mobile app afterwards, not just
     * re-captured. (`DELETE …/delete-faces` drops only the pictures and keeps the
     * enrolment; the portal doesn't use it.)
     */
    DELETE_FACE: (id: number) => `/user/employees/${id}/face`,

    /**
     * Step 2 — KYC. Every field is a column on the employee, so an untouched
     * step reads back as a record of `null`s rather than a 404. The first save
     * is a POST (a full overwrite: an omitted field is stored as `null`), and
     * every save after it is a PATCH.
     */
    KYC: (id: number) => `/user/employees/${id}/kyc`,

    /**
     * Step 3 — read-only. The wage structure the employee inherits from the
     * designation on their current posting; nothing is stored per employee, so
     * there is no write here at all.
     */
    WAGE_STRUCTURE: (id: number) => `/user/employees/${id}/wage-structure`,

    /** Step 4 — family members, one row per call (no whole-step save). */
    FAMILY: (id: number) => `/user/employees/${id}/family`,
    FAMILY_MEMBER: (id: number, memberId: number) =>
      `/user/employees/${id}/family/${memberId}`,

    /** Step 5a — qualifications. */
    EDUCATIONS: (id: number) => `/user/employees/${id}/educations`,
    EDUCATION: (id: number, educationId: number) =>
      `/user/employees/${id}/educations/${educationId}`,

    /** Step 5b — prior employment. Its two dates are `YYYY-MM`, never full dates. */
    EXPERIENCES: (id: number) => `/user/employees/${id}/experiences`,
    EXPERIENCE: (id: number, experienceId: number) =>
      `/user/employees/${id}/experiences/${experienceId}`,

    /**
     * Step 6 — attachments. `document` is the object key from
     * `UPLOADS.EMPLOYEE_DOCUMENT`; the file itself never passes through here.
     */
    DOCUMENTS: (id: number) => `/user/employees/${id}/documents`,
    DOCUMENT: (id: number, employeeDocumentId: number) =>
      `/user/employees/${id}/documents/${employeeDocumentId}`,

    /** Step 7 — assets issued from the asset master. */
    ASSETS: (id: number) => `/user/employees/${id}/assets`,
    ASSET: (id: number, employeeAssetId: number) =>
      `/user/employees/${id}/assets/${employeeAssetId}`,

    /**
     * Step 8 — the posting history, newest first. `POST` is one atomic move
     * (close the open posting, open the new one); `PATCH` corrects the latest
     * posting in place and is refused for a closed one; `LEAVE_SERVICE` closes
     * the open posting without opening another — the employee exits.
     */
    TRANSFERS: (id: number) => `/user/employees/${id}/transfers`,
    TRANSFER: (id: number, serviceId: number) =>
      `/user/employees/${id}/transfers/${serviceId}`,
    LEAVE_SERVICE: (id: number, serviceId: number) =>
      `/user/employees/${id}/transfers/${serviceId}/leave-service`,

    /**
     * Step 9 — which shift the employee works, and why.
     *
     * `SHIFT_ON_DAY` walks the whole precedence chain (roster → rotation →
     * assignment → department default → company default) for one date and reports
     * which link answered in `source`. That's the only way to tell "General,
     * because it's the company default" (nothing to undo) from "General, because
     * somebody rostered it onto this date" (one row a manager can remove). It
     * answers for any day, past or future, so a rotation can be walked forward
     * without materialising anything.
     *
     * `SHIFTS` is the assignment TIMELINE — append-only and unpaginated, since a
     * career collects a handful of entries. An EMPTY timeline is the ordinary,
     * healthy state: it means the employee is on their department's or company's
     * default. A POST with NEITHER `shift_id` nor `rotation_id` is how an
     * assignment ENDS ("back to the default from this date"); `SHIFT_ENTRY`'s
     * DELETE is only for an entry typed by mistake, because removing one rewrites
     * which shift the employee was judged against on days already closed.
     *
     * `ROSTER` is the per-date override — the highest-priority answer in the
     * chain. Only the dates a manager explicitly overrode are rows; re-rostering
     * a date REPLACES its entry rather than conflicting, and unlike a timeline
     * entry a roster row IS safe to delete, since it says nothing about history.
     */
    SHIFT_ON_DAY: (id: number) => `/user/employees/${id}/shift`,
    SHIFTS: (id: number) => `/user/employees/${id}/shifts`,
    SHIFT_ENTRY: (id: number, entryId: number) =>
      `/user/employees/${id}/shifts/${entryId}`,
    ROSTER: (id: number) => `/user/employees/${id}/roster`,
    ROSTER_ENTRY: (id: number, entryId: number) =>
      `/user/employees/${id}/roster/${entryId}`,
  },
  /**
   * Step 9 — leave records. A top-level collection rather than a sub-resource:
   * `?employee_id=` is the employee's own tab, and leaving it off gives the
   * company-wide queue. Recording a leave from the back office IS the approval
   * (`status` defaults to `APPROVED`); `STATUS` is the decision on one that was
   * filed as `PENDING`, and only a pending row can be decided.
   */
  EMPLOYEE_LEAVES: {
    LIST: '/user/employee-leaves',
    POST: '/user/employee-leaves',
    GET: (id: number) => `/user/employee-leaves/${id}`,
    PATCH: (id: number) => `/user/employee-leaves/${id}`,
    DELETE: (id: number) => `/user/employee-leaves/${id}`,
    STATUS: (id: number) => `/user/employee-leaves/${id}/status`,
  },
  /**
   * Payroll — the salary register and the writes that process a month.
   *
   * `REGISTER` is the screen: one page of postings open inside the period, each
   * carrying the attendance the month would be paid on, the wage structure in
   * force for its designation and `computed` — the pay that would be saved if the
   * row were committed as it stands. `?status=pending|complete` splits it into
   * the month's queue and the month already processed.
   *
   * `BULK_SAVE` commits the run. **The server computes the pay**: a row sends
   * only the days it is paid for (`present_days`, and optional `working_days` /
   * `ot_hours` overrides), never a gross or a per-head amount, so a stale screen
   * can't write pay from a wage structure that has since been revised.
   *
   * `BULK_DELETE` is the register's "discard selected" — a POST because the ids
   * travel in a body. It soft-deletes, which is what lets the month be run
   * again; an already-paid salary is refused and reported back in `skipped`.
   */
  SALARY: {
    REGISTER: '/user/salary/register',
    /**
     * The month already processed, as a MATRIX — the "View Salary" screen.
     *
     * One row per *stored* salary of the period, each with the employee's
     * particulars, statutory numbers and bank details plus its per-head
     * allowance and deduction lines. `allowance_heads` / `deduction_heads` are
     * the union of head names across the whole result, in catalog order, and are
     * the column set to pivot on — a row simply carries no line for a head it
     * doesn't have, which reads as zero. Pivoting on one row's own components
     * instead would give a table whose columns shift per row.
     *
     * `totals` is the footer for the ROWS RETURNED, so a paged screen's total
     * adds up to the column above it. Unlike the register there is no `sort`:
     * the endpoint fixes the order, so the screen's columns aren't sortable.
     */
    REPORT: '/user/salary/report',
    BULK_SAVE: '/user/salary/bulk-save',
    BULK_DELETE: '/user/salary/bulk-delete',
    /**
     * Step 2 of the spreadsheet import: read the workbook already uploaded at
     * `file_key`, price every row and save it. Rows are only ever *created* — a
     * period already processed for a posting comes back in `skipped`, never
     * overwritten. **The period written inside the sheet wins** over the one
     * sent, and the response says which one actually landed.
     */
    IMPORTS: '/user/salary/imports',
    /**
     * Step 0 of the same import: the sheet to fill in. It answers the workbook
     * itself as an attachment — one pre-filled row per posting **not yet
     * processed** for the period, Present Days already filled in from
     * attendance and every other cell locked, because the import matches rows
     * by employee code and service id.
     *
     * Takes the register's own filters (`company_id`, `month`, `year`, and
     * optionally `designation_id` / `department_id`), so the sheet that comes
     * down is the register that is on screen.
     */
    IMPORT_TEMPLATE: '/user/salary/exports/import-template',
  },
  /**
   * Attendance Management — the company's day, read top-down.
   *
   * `GROUPS` is the landing screen in one call: the three company tiles plus one
   * page of cards. Which level the cards sit at is the *server's* answer
   * (`group_by`: `department` when the company has departments, `designation`
   * when it has none), never a parameter — the ids in `items` belong to that
   * level and go back to `GROUP_EMPLOYEES` under the matching id.
   *
   * `GROUP_EMPLOYEES` opens one card: the same three tiles for that group, and
   * the people behind them. Exactly one of `department_id` / `designation_id`
   * goes up, matching the `group_by` the cards answered with — both, neither or
   * the wrong one is a 400/404 rather than a quietly-preferred reading.
   *
   * Omit `date` for the day the *server* is in: the business day is bucketed in
   * the server's attendance timezone, so the client can't compute it. The
   * response echoes both the `date` it reported on and the server's `today`.
   */
  ATTENDANCE: {
    GROUPS: '/user/attendance/groups',
    GROUP_EMPLOYEES: '/user/attendance/groups/employees',
    /**
     * One employee's month grid — an entry for EVERY day of the month, each
     * carrying the rollup, the punches that produced it and the coordinates they
     * reported. Addressed by query (`employee_id`, `year`, `month`) rather than
     * by path, which is why it can back a screen that holds the employee as a
     * filter. `company_id` is asserted, not filtered: an employee outside it is
     * a 404 rather than an empty month.
     */
    EMPLOYEE_DETAIL: '/user/attendance/employee-detail',
  },
  /**
   * Presigned PUT handshakes. Each answers `{ upload_url, key }`: PUT the file
   * straight at `upload_url` with the same `Content-Type` that was presigned,
   * then send `key` on the record. No file ever travels through the API, and no
   * DB row is touched here — an abandoned upload just leaves a stray object.
   */
  UPLOADS: {
    /**
     * The company logo — signs a PUT for a JPG/PNG/WebP. The bytes go straight
     * to storage and the returned `key` is what `logo` holds on the company.
     */
    COMPANY_LOGO: '/user/uploads/company-logo',
    EMPLOYEE_PHOTO: '/user/uploads/employee-photo',
    EMPLOYEE_DOCUMENT: '/user/uploads/employee-document',
    LEAVE_ATTACHMENT: '/user/uploads/leave-attachment',
    /** The salary import workbook — `.xlsx` or `.csv`, signed for those two only. */
    SALARY_IMPORT: '/user/uploads/salary-import',
  },
  /** Read-only lookup — the bank master is maintained by the super admin. */
  BANKS: {
    LIST: '/user/banks',
    GET: (id: number) => `/user/banks/${id}`,
  },
  /** Read-only lookup — states are maintained by the super admin. */
  STATES: {
    LIST: '/user/states',
    GET: (id: number) => `/user/states/${id}`,
  },
  /** Read-only lookup — districts are maintained by the super admin. */
  DISTRICTS: {
    LIST: '/user/districts',
    GET: (id: number) => `/user/districts/${id}`,
  },
} as const
