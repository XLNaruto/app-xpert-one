import { todayIso } from '@/features/office-task/common'
import type { SopGroupFormValues, SopTaskFormValues } from './schemas'

/** The fields `GET /sop-groups` sorts on — each is the column's id. */
export const SOP_GROUP_SORT = {
  name: 'name',
  sortOrder: 'sort_order',
  createdAt: 'created_at',
} as const

export const SOP_GROUP_DEFAULT_SORT = { id: SOP_GROUP_SORT.createdAt, desc: true }

export const EMPTY_SOP_TASK: SopTaskFormValues = {
  id: '',
  task: '',
  description: '',
  frequency: '1',
  photoRequired: false,
  needsApproval: false,
  hasStartedWork: false,
}

export const emptySopGroupForm = (): SopGroupFormValues => ({
  name: '',
  pickBy: 'designation',
  designationId: '',
  roleId: '',
  items: [{ ...EMPTY_SOP_TASK }],
  assignees: [],
  effectiveFrom: todayIso(),
  effectiveTo: '',
})

/** The two tabs of the Add / Edit SOP Group screen. */
export type SopGroupTab = 'group' | 'assign'
