import type { LeaveTypeFormValues } from '../schemas'
import type { LeaveType } from '../types'

/** Hydrate the edit form from a stored leave type. */
export function leaveTypeToFormValues(leaveType: LeaveType): LeaveTypeFormValues {
  return {
    leaveName: leaveType.leaveName,
    shortName: leaveType.shortName,
    payType: leaveType.payType,
  }
}
