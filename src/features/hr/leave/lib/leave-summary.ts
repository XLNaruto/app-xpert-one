import type { LeaveApplication, LeaveGroup } from '../types'

/**
 * The sentences a leave screen says about paid / unpaid days — pure, no React.
 *
 * They exist because the desk cannot see the split coming. Nobody chose paid or
 * unpaid: the server spent whatever was left of the type's yearly allowance and
 * the rest fell through as unpaid. So every confirmation, warning and register
 * line has to SAY which part was which, because payroll will read it that way.
 */

/**
 * A day count as the UI shows it. Counts are FRACTIONAL — a half day is `0.5` —
 * so they can't be rendered as integers, but a whole number shouldn't gain a
 * trailing `.0` either.
 */
export function formatDays(days: number): string {
  const value = Number.isInteger(days) ? String(days) : String(Number(days.toFixed(2)))
  return `${value} ${days === 1 ? 'day' : 'days'}`
}

/**
 * The paid/unpaid breakdown, e.g. `2 days paid, 3 days unpaid`.
 *
 * An all-paid or all-unpaid application says only the half that applies — "0 days
 * unpaid" is noise on a leave that was fully covered.
 */
export function formatSplit({
  paidDays,
  unpaidDays,
}: {
  paidDays: number
  unpaidDays: number
}): string {
  const parts: string[] = []
  if (paidDays > 0) parts.push(`${formatDays(paidDays)} paid`)
  if (unpaidDays > 0) parts.push(`${formatDays(unpaidDays)} unpaid`)
  // A range the server counted as nothing — a single weekly off, say.
  return parts.join(', ') || 'no chargeable days'
}

/**
 * The confirmation after a write: ONE line for the application, never two for its
 * halves. When the request split, it says so outright — the desk needs to know
 * part of what it just recorded is unpaid.
 */
export function describeApplication(
  application: LeaveApplication,
  leaveTypeLabel: string,
): string {
  const type = leaveTypeLabel || application.rows[0]?.leaveType || 'Leave'
  const breakdown = formatSplit(application)
  if (!application.split) {
    // Unsplit and entirely unpaid means the allowance was already spent.
    return application.paidDays === 0 && application.unpaidDays > 0
      ? `${type} — all ${formatDays(application.unpaidDays)} unpaid, the paid allowance is exhausted.`
      : `${type} — ${breakdown}.`
  }
  return `${type} — ${breakdown}. The paid allowance ran out inside the range, so part of it is unpaid.`
}

/**
 * The warning before removing or deciding a grouped line. A split application is
 * removed and decided as ONE thing, so the confirmation has to name the days on
 * both sides of the split rather than the row that was clicked.
 */
export function describeGroupSpan(group: LeaveGroup): string {
  const total = group.paidDays + group.unpaidDays
  if (!group.split) return formatDays(total)
  return `all ${formatDays(total)} (${formatSplit(group)})`
}
