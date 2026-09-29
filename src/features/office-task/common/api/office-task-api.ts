import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import { uploadFile } from '@/lib/uploads'
import type { PageParams, Paginated } from '@/lib/pagination'
import type { DropzoneFile } from '@/components/common/file-dropzone'
import { PROOF_CONTENT_TYPES } from '../constants'
import { officeTaskEmployeesResponseSchema, type ProofPayload } from '../schemas'
import { toOfficeTaskEmployee } from '../lib/office-task-mappers'
import type { OfficeTaskEmployee, PickBy } from '../types'
import { pageQuery, requireCompany, toOfficeTaskError } from './office-task-request'

/** Who the shared picker lists: one designation OR one role, plus an optional group. */
export interface EmployeePickerFilter {
  pickBy: PickBy
  targetId: number
  /** Sent from SOP Tasks tab 2 — rows then carry `already_assigned` for that group. */
  sopGroupId?: number
}

/**
 * GET /user/office-task/employees — ACTIVE employees of the current company with
 * a current posting, holding the designation (or, through their panel login,
 * the role). Gated on the authoring screens' write codes.
 */
export async function fetchOfficeTaskEmployees(
  filter: EmployeePickerFilter,
  params: PageParams,
): Promise<Paginated<OfficeTaskEmployee>> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(endpoints.OFFICE_TASK.EMPLOYEES, {
      params: {
        ...pageQuery(params),
        [filter.pickBy === 'designation' ? 'designation_id' : 'role_id']: filter.targetId,
        ...(filter.sopGroupId ? { sop_group_id: filter.sopGroupId } : {}),
      },
    })
    const { items, total } = officeTaskEmployeesResponseSchema.parse(raw)
    return { items: items.map(toOfficeTaskEmployee), total }
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load the employees.")
  }
}

/**
 * Presign + PUT each freshly picked proof file (POST /user/uploads/office-task-proof),
 * answering the `{ key, name }` pairs a hand-in or progress note sends. One
 * presign serves all three owners — the file goes up before any row claims it.
 */
export async function uploadProofFiles(files: DropzoneFile[]): Promise<ProofPayload[]> {
  const out: ProofPayload[] = []
  for (const f of files) {
    if (!f.file) continue
    const key = await uploadFile(endpoints.UPLOADS.OFFICE_TASK_PROOF, f.file, PROOF_CONTENT_TYPES)
    out.push({ key, name: f.name })
  }
  return out
}
