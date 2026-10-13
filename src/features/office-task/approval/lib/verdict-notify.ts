import type { VerdictRequest } from '../types'

/**
 * Who a project verdict reaches. Approve / reject (either outcome) notifies each
 * share's assignee and delegate, remarks included. An "other" has no app inbox,
 * so a share of theirs with no delegate reaches nobody. SOP verdicts send nothing.
 */
export function verdictNotice(request: VerdictRequest): { text: string; unreachable: number } | null {
  if (request.kind !== 'project') return null
  const unreachable = request.rows.filter(
    (r) => 'taskOtherId' in r && r.taskOtherId !== null && !r.delegateName,
  ).length
  return {
    text: `The assignee${request.rows.length === 1 ? '' : 's'} (and any delegate) will be notified${request.verdict === 'rejected' ? ', with your reason' : ''}.`,
    unreachable,
  }
}
