import { useState } from 'react'
import { Field } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/utils'
import { ProofStrip } from '@/features/office-task/common'
import { useVerdictForm } from '../hooks/use-verdict-form'
import type { VerdictRequest } from '../types'

const SHOWN = 4

function VerdictForm({ request, onClose, onDone }: { request: VerdictRequest; onClose: () => void; onDone: () => void }) {
  const { form, onSubmit, isPending } = useVerdictForm(request, onDone)
  const [showAll, setShowAll] = useState(false)
  const approve = request.verdict === 'approved'
  const n = request.rows.length
  const rows = showAll ? request.rows : request.rows.slice(0, SHOWN)

  return (
    <form onSubmit={onSubmit} noValidate>
      <DialogHeader>
        <DialogTitle className="pr-10">
          {approve ? 'Approve' : 'Reject'} {n} task{n === 1 ? '' : 's'}?
        </DialogTitle>
        <DialogDescription>
          {approve
            ? 'They are marked complete and signed off against your name.'
            : 'They go back to the employee to redo and submit again.'}
        </DialogDescription>
      </DialogHeader>

      <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-border p-3">
            <p className="text-sm font-medium">{r.task}</p>
            <p className="text-xs text-muted-foreground">
              {r.employeeName} · {'date' in r ? formatDate(r.date) : formatDate(r.submittedAt ?? '')}
            </p>
            {r.note && <p className="mt-1 text-sm italic">“{r.note}”</p>}
            <div className="mt-2">
              <ProofStrip files={r.proof} required={r.photoRequired} size="sm" />
            </div>
          </li>
        ))}
      </ul>
      {n > SHOWN && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 cursor-pointer text-sm font-medium text-primary hover:underline"
        >
          Show {n - SHOWN} more
        </button>
      )}

      <Field
        label={approve ? 'Remarks' : 'Reason for rejection'}
        required={!approve}
        error={form.formState.errors.remarks?.message}
        className="mt-4"
      >
        <Textarea
          rows={3}
          placeholder={approve ? 'Optional' : 'Say what needs redoing — the employee sees this'}
          {...form.register('remarks')}
        />
      </Field>

      <DialogFooter className="mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" variant={approve ? 'default' : 'destructive'} disabled={isPending}>
          {isPending ? 'Saving…' : approve ? 'Approve' : 'Reject'}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Approve / reject one or many hand-ins, with their proof in view. */
export function VerdictDialog({
  request,
  onClose,
  onDone,
}: {
  request: VerdictRequest | null
  onClose: () => void
  onDone: () => void
}) {
  return (
    <Dialog open={request !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl" onClose={onClose}>
        {request && <VerdictForm request={request} onClose={onClose} onDone={onDone} />}
      </DialogContent>
    </Dialog>
  )
}
