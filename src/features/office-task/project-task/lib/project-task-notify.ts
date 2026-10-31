import type { ProjectTaskFormValues } from '../schemas'

/**
 * What saving the drawer sends (server-side, to the Employee app inbox):
 *  - create → `task_assigned` to every assignee, `task_delegated` to an "other"'s delegate;
 *  - edit   → `task_assigned` to people ADDED only, `task_delegated` when the delegate
 *             is new or changed. Nothing else on an edit notifies anyone.
 * An "other" has no app inbox — only their delegate can be told. A panel user is
 * reached only through the employee their login is linked to.
 */
export interface SaveNotice {
  tone: 'info' | 'warn'
  text: string
}

type Who = Pick<ProjectTaskFormValues, 'pickBy' | 'employeeIds' | 'delegate'>

const PANEL_USER_NOTE =
  ' Panel users hear about it in the Employee app only when their login is linked to an employee.'

export function projectTaskSaveNotice(now: Who, before?: Who): SaveNotice | null {
  if (now.pickBy === 'other') {
    if (!now.delegate) {
      return {
        tone: 'warn',
        text: 'Nobody Will Be Notified — An Outside Person Has No App Inbox. Name a Delegate to Have Someone Told.',
      }
    }
    if (before && before.pickBy === 'other' && before.delegate === now.delegate) return null
    return {
      tone: 'info',
      text: `The delegate will be notified.${now.delegate.startsWith('user:') ? PANEL_USER_NOTE : ''}`,
    }
  }

  const userNote = now.pickBy === 'role' ? PANEL_USER_NOTE : ''
  if (!before || before.pickBy !== now.pickBy) {
    return now.employeeIds.length ? { tone: 'info', text: `Every assignee will be notified.${userNote}` } : null
  }
  const kept = new Set(before.employeeIds)
  const added = now.employeeIds.filter((id) => !kept.has(id)).length
  if (!added) return null
  return {
    tone: 'info',
    text: `The ${added === 1 ? 'person' : `${added} people`} you added will be notified — people already on the task are not.${userNote}`,
  }
}
