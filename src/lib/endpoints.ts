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
  },
  ME: {
    GET: '/user/me',
    COMPANIES: '/user/my/companies',
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
