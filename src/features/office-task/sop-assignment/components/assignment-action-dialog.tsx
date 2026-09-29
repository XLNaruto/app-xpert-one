import { CirclePlay, CircleStop, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import type { useAssignmentActions } from '../hooks/use-assignment-actions'

/** Confirm for Start / Stop / Delete — worded for what each actually does to the runs. */
export function AssignmentActionDialog({
  actions,
}: {
  actions: ReturnType<typeof useAssignmentActions>
}) {
  const { pending } = actions
  const kind = pending?.kind ?? 'stop'
  const who = pending ? `${pending.row.employeeName} — ${pending.row.templateName}` : ''

  const copy = {
    start: {
      icon: CirclePlay,
      title: 'Start this assignment again?',
      description: `${who}: tasks are created again from today, with no end date. Days it was stopped stay empty — if any were skipped, this starts a new assignment and the stopped one stays as history.`,
      confirm: 'Start',
    },
    stop: {
      icon: CircleStop,
      title: 'Stop this assignment?',
      description: `${who}: no new tasks will be created after today. Tasks already created keep their status, and one running right now keeps running.`,
      confirm: 'Stop',
    },
    delete: {
      icon: Trash2,
      title: 'Delete this assignment?',
      description: `${who}: the assignment and its tasks are removed. Nobody has started work on it yet, so no history is lost.`,
      confirm: 'Delete',
    },
  }[kind]

  return (
    <ConfirmDialog
      open={pending !== null}
      onOpenChange={(open) => !open && actions.cancel()}
      variant={kind === 'start' ? 'default' : 'destructive'}
      icon={copy.icon}
      title={copy.title}
      description={copy.description}
      confirmLabel={copy.confirm}
      cancelLabel="Cancel"
      loading={actions.isWorking}
      keepOpenOnConfirm
      onConfirm={actions.confirm}
    />
  )
}
