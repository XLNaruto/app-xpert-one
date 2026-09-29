import { http } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'
import type { PageParams } from '@/lib/pagination'
import { pageQuery, requireCompany, toOfficeTaskError } from '@/features/office-task/common'
import { APPROVAL_DEFAULT_SORT } from '../constants'
import {
  decideResponseSchema,
  projectApprovalsResponseSchema,
  sopApprovalsResponseSchema,
} from '../schemas'
import { toProjectApprovalRow, toSopApprovalRow } from '../lib/approval-mappers'
import type {
  ApprovalFilters,
  ApprovalPage,
  DecideInput,
  ProjectApprovalRow,
  SopApprovalRow,
} from '../types'

/**
 * Task Approval — `/user/office-task/approvals`. Only work that ASKS for a
 * sign-off lands here. Who may answer is one account-wide grant
 * (`task-approvals:update`), not a chain.
 */

const { APPROVALS } = endpoints.OFFICE_TASK

function filterQuery(filters: ApprovalFilters, params: PageParams) {
  return {
    ...pageQuery(params, APPROVAL_DEFAULT_SORT),
    from: filters.from,
    to: filters.to,
    tab: filters.tab,
    ...(filters.departmentId ? { department_id: Number(filters.departmentId) } : {}),
    ...(filters.employeeId ? { employee_id: Number(filters.employeeId) } : {}),
    ...(filters.userId ? { user_id: Number(filters.userId) } : {}),
  }
}

/** GET /approvals/sop — runs whose item needs approval; reading it materialises today. */
export async function fetchSopApprovals(
  filters: ApprovalFilters,
  params: PageParams,
): Promise<ApprovalPage<SopApprovalRow>> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(APPROVALS.SOP, { params: filterQuery(filters, params) })
    const { items, total, counts } = sopApprovalsResponseSchema.parse(raw)
    return { items: items.map(toSopApprovalRow), total, counts }
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load the SOP approvals.")
  }
}

/** GET /approvals/project — submitted shares of tasks that need verification. */
export async function fetchProjectApprovals(
  filters: ApprovalFilters,
  params: PageParams,
): Promise<ApprovalPage<ProjectApprovalRow>> {
  try {
    requireCompany()
    const raw = await http.get<unknown>(APPROVALS.PROJECT, { params: filterQuery(filters, params) })
    const { items, total, counts } = projectApprovalsResponseSchema.parse(raw)
    return { items: items.map(toProjectApprovalRow), total, counts }
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't load the project approvals.")
  }
}

/**
 * POST /approvals/{sop|project}/decide — single and bulk alike, ALL-OR-NOTHING:
 * any row no longer awaiting fails the whole call with a 409 to refresh on.
 */
async function decide(url: string, input: DecideInput): Promise<number> {
  try {
    const raw = await http.post<unknown>(url, {
      ids: input.ids,
      verdict: input.verdict,
      remarks: input.remarks.trim(),
    })
    return decideResponseSchema.parse(raw).updated
  } catch (error) {
    throw toOfficeTaskError(error, "Couldn't save the verdict.")
  }
}

/** Approve completes a run (back-dated to the hand-in); reject sends it back — or to `missed` if its day is gone. */
export const decideSop = (input: DecideInput) => decide(APPROVALS.SOP_DECIDE, input)

/** Approve completes a share NOW; reject reopens it for the assignee. */
export const decideProject = (input: DecideInput) => decide(APPROVALS.PROJECT_DECIDE, input)
