import { mockDelay } from '@/lib/utils'
import { createdStamp, updatedStamp } from '@/lib/audit'
import type { LeaveTypeFormValues } from '../schemas'
import type { LeaveType } from '../types'

/**
 * In-memory leave type master store. No backend yet — records live here for the
 * session. Swap each function's body for the matching REST call when the API
 * lands; the signatures stay the same.
 */

let leaveTypes: LeaveType[] = [
  {
    id: 1,
    leaveName: 'Testing Leave',
    shortName: 'TL',
    payType: 'UNPAID',
    createdBy: 'Roman Rings',
    createdAt: '2026-04-28T10:50:59.382Z',
    updatedBy: null,
    updatedAt: null,
  },
  {
    id: 2,
    leaveName: 'Functional Leave',
    shortName: 'FL',
    payType: 'UNPAID',
    createdBy: 'Rohan Sanghani',
    createdAt: '2026-02-27T13:16:35.815Z',
    updatedBy: 'Rohan Sanghani',
    updatedAt: '2026-04-10T09:14:10.119Z',
  },
  {
    id: 3,
    leaveName: 'Test',
    shortName: 'TE',
    payType: 'PAID',
    createdBy: 'Rohan Sanghani',
    createdAt: '2026-02-27T11:18:26.411Z',
    updatedBy: 'Rohan Sanghani',
    updatedAt: '2026-02-27T11:19:36.394Z',
  },
]

function nextId(): number {
  return leaveTypes.reduce((max, l) => Math.max(max, l.id), 0) + 1
}

/** Map validated form values onto the stored fields shared by create + update. */
function applyForm(values: LeaveTypeFormValues) {
  return {
    leaveName: values.leaveName.trim(),
    shortName: values.shortName.trim(),
    payType: values.payType,
  }
}

export async function fetchLeaveTypes(): Promise<LeaveType[]> {
  return mockDelay([...leaveTypes])
}

export async function fetchLeaveType(id: number): Promise<LeaveType> {
  const found = leaveTypes.find((l) => l.id === id)
  if (!found) throw new Error('Leave type not found')
  return mockDelay({ ...found })
}

export async function createLeaveType(
  values: LeaveTypeFormValues,
): Promise<LeaveType> {
  const record: LeaveType = {
    id: nextId(),
    ...applyForm(values),
    ...createdStamp(),
  }
  leaveTypes = [record, ...leaveTypes]
  return mockDelay({ ...record })
}

export async function updateLeaveType(
  id: number,
  values: LeaveTypeFormValues,
): Promise<LeaveType> {
  const index = leaveTypes.findIndex((l) => l.id === id)
  if (index === -1) throw new Error('Leave type not found')
  const updated: LeaveType = {
    ...leaveTypes[index],
    ...applyForm(values),
    ...updatedStamp(),
  }
  leaveTypes = leaveTypes.map((l) => (l.id === id ? updated : l))
  return mockDelay({ ...updated })
}

export async function deleteLeaveType(id: number): Promise<void> {
  leaveTypes = leaveTypes.filter((l) => l.id !== id)
  return mockDelay(undefined)
}
