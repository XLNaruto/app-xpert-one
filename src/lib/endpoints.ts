/**
 * Centralised REST endpoint paths. Feature `api/` layers reference these
 * instead of hard-coding URL strings, so a path only ever changes in one place.
 * Paths are relative to `apiClient`'s baseURL (see `env.VITE_APP_API_URL`), and
 * every route on this API is namespaced under `/user`.
 *
 * Request/response shapes and flow notes live in `endpoints.reference.ts`.
 */
export const endpoints = {
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
