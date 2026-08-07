import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { activeCompanyId } from '@/lib/active-company'
import { uploadFile, IMAGE_CONTENT_TYPES } from '@/lib/uploads'
import { EMPLOYEE_DEFAULT_SORT } from '../constants'
import {
  deleteFaceResponseSchema,
  employeeResponseSchema,
  employeesResponseSchema,
} from '../schemas'
import { employeeBasicToPayload, toEmployee } from '../lib/employee-mappers'
import type {
  EmployeeBasicFormValues,
  EmployeeBasicPayload,
  EmployeeBasicUpdatePayload,
} from '../schemas'
import type { Employee } from '../types'

/**
 * Step 1 — the employee record itself: `/user/employees`.
 *
 * `POST` creates the person **and** their first posting in one call, which is why
 * step 1's form carries the service fields: until it's saved there is no employee
 * id, and every later step is addressed by one. `PATCH` writes the person plus
 * the *current* posting — moving someone between company / branch / department /
 * designation goes through the transfer endpoint instead, so the closed posting
 * survives as history.
 *
 * The list read takes a required `company_id` from the session's active company;
 * everything else is scoped by the record's own tenant.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 50

/**
 * The tenant scope plus `search` / `sort` / `sort_by` as the endpoint spells
 * them. Order is always sent — left off, the server's own default decides it, and
 * a list whose order isn't pinned can repeat or skip rows as the user pages.
 */
function queryParams(params: PageParams) {
  return {
    company_id: activeCompanyId('employees'),
    ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    sort: params.sort ?? EMPLOYEE_DEFAULT_SORT.id,
    sort_by: params.sortBy ?? (EMPLOYEE_DEFAULT_SORT.desc ? 'desc' : 'asc'),
  }
}

/**
 * GET /user/employees — one page of the company's employees, newest first unless
 * the screen says otherwise. `search` matches the name, the employee code or
 * either mobile number, server-side.
 *
 * `ALL_ROWS` (a negative limit) means "everyone": the API caps a request at 100,
 * so that case walks the pages until `total` is covered.
 */
export async function fetchEmployees(
  params: PageParams = ALL_ROWS,
): Promise<Paginated<Employee>> {
  try {
    const query = queryParams(params)

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.EMPLOYEES.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = employeesResponseSchema.parse(raw)
      return { items: items.map(toEmployee), total }
    }

    const collected: Employee[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.EMPLOYEES.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = employeesResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map(toEmployee))
      if (parsed.items.length === 0 || collected.length >= total) break
    }

    return { items: collected, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load employees.")
  }
}

/**
 * GET /user/employees/:id — one employee with their current posting and the
 * `completed_steps` flags the wizard's progress and tab locks read.
 */
export async function fetchEmployee(id: number): Promise<Employee> {
  try {
    const raw = await http.get<unknown>(endpoints.EMPLOYEES.GET(id))
    return toEmployee(employeeResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'Employee not found')
  }
}

/**
 * POST /user/employees — the person and their opening posting. Counts against
 * the account-wide employee limit of the active subscription, so a refusal here
 * may be a plan limit rather than a bad body — the server's message says which.
 */
export async function createEmployee(
  values: EmployeeBasicFormValues,
): Promise<Employee> {
  try {
    const raw = await http.post<unknown, EmployeeBasicPayload>(endpoints.EMPLOYEES.POST, {
      company_id: activeCompanyId('employees'),
      ...employeeBasicToPayload(values),
    })
    return toEmployee(employeeResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the employee.")
  }
}

/**
 * PATCH /user/employees/:id — the endpoint accepts a partial body, but step 1
 * always submits the whole form, so the full record is sent. The Service section
 * writes onto the current posting in place; use `transferEmployee` for a real move.
 */
export async function updateEmployee(
  id: number,
  values: EmployeeBasicFormValues,
): Promise<Employee> {
  try {
    const raw = await http.patch<unknown, EmployeeBasicUpdatePayload>(
      endpoints.EMPLOYEES.PATCH(id),
      employeeBasicToPayload(values),
    )
    return toEmployee(employeeResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the employee.")
  }
}

/**
 * DELETE /user/employees/:id/face — de-register the employee's face, answering
 * how many captured images went with it.
 *
 * Everything goes: the face record and its image rows are soft-deleted and the
 * stored images purged, so the person registers again in the mobile app rather
 * than just re-capturing.
 */
export async function deleteEmployeeFace(id: number): Promise<number> {
  try {
    const raw = await http.delete<unknown>(endpoints.EMPLOYEES.DELETE_FACE(id))
    return deleteFaceResponseSchema.parse(raw).deleted_images
  } catch (error) {
    throw toApiError(error, "Couldn't delete the registered face.")
  }
}

/**
 * Upload a profile photo and answer the object key to store as `photo`. The
 * bytes go straight to storage on a presigned PUT — nothing is written to the
 * employee until step 1 is saved with the key.
 */
export async function uploadEmployeePhoto(file: File): Promise<string> {
  return uploadFile(endpoints.UPLOADS.EMPLOYEE_PHOTO, file, IMAGE_CONTENT_TYPES)
}
