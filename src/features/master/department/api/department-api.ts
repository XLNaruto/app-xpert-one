import { mockDelay } from '@/lib/utils'
import { ALL_ROWS, paginate, type PageParams, type Paginated } from '@/lib/pagination'
import { createdStamp, updatedStamp } from '@/lib/audit'
import type { DepartmentFormValues } from '../schemas'
import type { Department } from '../types'

/**
 * In-memory department master store. No backend yet — records live here for the
 * session. Swap each function's body for the matching REST call when the API
 * lands; the signatures stay the same.
 */

let departments: Department[] = [
  {
    id: 1,
    branch: 'Head Office',
    departmentName: 'Sales',
    departmentCode: 'SAL',
    monthStartDate: 1,
    createdBy: 'Roman Rings',
    createdAt: '2025-01-14T09:00:00.000Z',
    updatedBy: 'Roman Rings',
    updatedAt: '2025-02-02T11:20:00.000Z',
  },
  {
    id: 2,
    branch: 'Surat Branch',
    departmentName: 'Accounts',
    departmentCode: 'ACC',
    monthStartDate: 1,
    createdBy: 'John Cena',
    createdAt: '2025-01-14T09:00:00.000Z',
    updatedBy: null,
    updatedAt: null,
  },
]

function nextId(): number {
  return departments.reduce((max, d) => Math.max(max, d.id), 0) + 1
}

/** Map validated form values onto the stored fields shared by create + update. */
function applyForm(values: DepartmentFormValues) {
  return {
    branch: values.branch.trim(),
    departmentName: values.departmentName.trim(),
    departmentCode: values.departmentCode.trim(),
    monthStartDate: Number(values.monthStartDate),
  }
}

/** Record fields the list screen's search box matches against. */
const SEARCH_FIELDS: readonly (keyof Department)[] = ['departmentName', 'departmentCode', 'branch']

export async function fetchDepartments(params: PageParams = ALL_ROWS): Promise<Paginated<Department>> {
  return mockDelay(paginate([...departments], params, SEARCH_FIELDS))
}

export async function fetchDepartment(id: number): Promise<Department> {
  const found = departments.find((d) => d.id === id)
  if (!found) throw new Error('Department not found')
  return mockDelay({ ...found })
}

export async function createDepartment(
  values: DepartmentFormValues,
): Promise<Department> {
  const record: Department = {
    id: nextId(),
    ...applyForm(values),
    ...createdStamp(),
  }
  departments = [record, ...departments]
  return mockDelay({ ...record })
}

export async function updateDepartment(
  id: number,
  values: DepartmentFormValues,
): Promise<Department> {
  const index = departments.findIndex((d) => d.id === id)
  if (index === -1) throw new Error('Department not found')
  const updated: Department = {
    ...departments[index],
    ...applyForm(values),
    ...updatedStamp(),
  }
  departments = departments.map((d) => (d.id === id ? updated : d))
  return mockDelay({ ...updated })
}

export async function deleteDepartment(id: number): Promise<void> {
  departments = departments.filter((d) => d.id !== id)
  return mockDelay(undefined)
}
