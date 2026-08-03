import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { toApiError } from '@/lib/api-error'
import { ALL_ROWS, type PageParams, type Paginated } from '@/lib/pagination'
import { activeCompanyId } from '@/lib/active-company'
import { DEPARTMENT_DEFAULT_SORT } from '../constants'
import { departmentResponseSchema, departmentsResponseSchema } from '../schemas'
import { departmentToPayload, toDepartment } from '../lib/department-mappers'
import type {
  DepartmentFormValues,
  DepartmentPayload,
  DepartmentUpdatePayload,
} from '../schemas'
import type { Department } from '../types'

/**
 * Departments — `/user/departments`. The endpoint is offset-paginated
 * (`?limit=&offset=`, limit capped at 100) and answers `{ items, total }`, which
 * is exactly the shape the list screen pages in. `search` is matched server-side
 * against the department name or its code, and `sort` accepts `name`, `code` or
 * `created_at`.
 *
 * Reads take a required `company_id` and a create carries it in the body, both
 * taken from the company the session has active.
 */

/** The API's maximum `limit` — also the batch size when reading everything. */
const MAX_LIMIT = 100

/** Stop after this many batches so a bad `total` can't spin forever. */
const MAX_PAGES = 20

/**
 * The tenant scope plus `search` / `sort` / `sort_by` as the endpoint spells
 * them. Order is always sent — left off, the server's own default decides it,
 * and a list whose order isn't pinned can repeat or skip rows as the user pages.
 */
function queryParams(params: PageParams) {
  return {
    company_id: activeCompanyId('departments'),
    ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    sort: params.sort ?? DEPARTMENT_DEFAULT_SORT.id,
    sort_by: params.sortBy ?? (DEPARTMENT_DEFAULT_SORT.desc ? 'desc' : 'asc'),
  }
}

/**
 * GET /user/departments — one page of the company's departments, in the
 * requested order (newest first unless the screen says otherwise).
 *
 * `ALL_ROWS` (a negative limit) means "the whole master": the API caps a request
 * at 100, so that case walks the pages until `total` is covered.
 */
export async function fetchDepartments(
  params: PageParams = ALL_ROWS,
): Promise<Paginated<Department>> {
  try {
    const query = queryParams(params)

    if (params.limit > 0) {
      const raw = await http.get<unknown>(endpoints.DEPARTMENTS.LIST, {
        params: {
          limit: Math.min(params.limit, MAX_LIMIT),
          offset: params.offset,
          ...query,
        },
      })
      const { items, total } = departmentsResponseSchema.parse(raw)
      return { items: items.map(toDepartment), total }
    }

    const collected: Department[] = []
    let total = 0

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const raw = await http.get<unknown>(endpoints.DEPARTMENTS.LIST, {
        params: {
          limit: MAX_LIMIT,
          offset: params.offset + page * MAX_LIMIT,
          ...query,
        },
      })
      const parsed = departmentsResponseSchema.parse(raw)
      total = parsed.total
      collected.push(...parsed.items.map(toDepartment))
      if (parsed.items.length === 0 || collected.length >= total) break
    }

    return { items: collected, total }
  } catch (error) {
    throw toApiError(error, "Couldn't load departments.")
  }
}

/** GET /user/departments/:id — one department, for the edit screen. */
export async function fetchDepartment(id: number): Promise<Department> {
  try {
    const raw = await http.get<unknown>(endpoints.DEPARTMENTS.GET(id))
    return toDepartment(departmentResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, 'Department not found')
  }
}

/** POST /user/departments — add a department to the active company. */
export async function createDepartment(
  values: DepartmentFormValues,
): Promise<Department> {
  try {
    const raw = await http.post<unknown, DepartmentPayload>(
      endpoints.DEPARTMENTS.POST,
      {
        company_id: activeCompanyId('departments'),
        ...departmentToPayload(values),
      },
    )
    return toDepartment(departmentResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't create the department.")
  }
}

/**
 * PATCH /user/departments/:id — the endpoint accepts a partial body, but the
 * form always submits every field, so we send the full record. `geo_fence` is
 * never sent, which leaves any stored boundary untouched.
 */
export async function updateDepartment(
  id: number,
  values: DepartmentFormValues,
): Promise<Department> {
  try {
    const raw = await http.patch<unknown, DepartmentUpdatePayload>(
      endpoints.DEPARTMENTS.PATCH(id),
      departmentToPayload(values),
    )
    return toDepartment(departmentResponseSchema.parse(raw))
  } catch (error) {
    throw toApiError(error, "Couldn't update the department.")
  }
}

/** DELETE /user/departments/:id — remove a department from the master. */
export async function deleteDepartment(id: number): Promise<void> {
  try {
    await http.delete<unknown>(endpoints.DEPARTMENTS.DELETE(id))
  } catch (error) {
    throw toApiError(error, "Couldn't delete the department.")
  }
}
