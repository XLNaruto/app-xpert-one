import { Controller } from 'react-hook-form'
import { ShieldCheck } from 'lucide-react'
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
import { formatDuration, ProofUploader } from '@/features/office-task/common'
import { useHandInForm } from '../hooks/use-hand-in-form'
import type { CompleteTarget } from '../types'

function CompleteTaskForm({
  target,
  workedSeconds,
  onClose,
}: {
  target: CompleteTarget
  workedSeconds?: number
  onClose: () => void
}) {
  const { form, rules, needsApproval, onSubmit, isPending } = useHandInForm(target, onClose)
  const { register, control, formState: { errors } } = form

  return (
    <form onSubmit={onSubmit} noValidate>
      <DialogHeader>
        <DialogTitle className="pr-10">
          {needsApproval ? 'Submit for Approval' : 'Complete this Task'}
        </DialogTitle>
        <DialogDescription>{target.row.task}</DialogDescription>
      </DialogHeader>

      <div className="mt-5 space-y-4">
        {workedSeconds !== undefined && (
          <p className="text-sm text-muted-foreground">
            Time worked: <span className="font-medium text-foreground">{formatDuration(workedSeconds)}</span>
          </p>
        )}
        {needsApproval && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            An approver marks it complete after reviewing your work.
          </p>
        )}
        <Field label="What did you do?" required={rules.noteRequired} error={errors.note?.message}>
          <Textarea rows={3} placeholder="Describe the work done" {...register('note')} />
        </Field>
        <Field label="Proof" required={rules.proofRequired} error={errors.proof?.message}>
          <Controller
            control={control}
            name="proof"
            render={({ field }) => (
              <ProofUploader
                value={field.value}
                onChange={field.onChange}
                invalid={!!errors.proof}
              />
            )}
          />
        </Field>
      </div>

      <DialogFooter className="mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : needsApproval ? 'Submit' : 'Complete'}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Complete / Submit a task — a note, proof when required, and the approval notice. */
export function CompleteTaskDialog({
  target,
  workedSeconds,
  onClose,
}: {
  target: CompleteTarget | null
  workedSeconds?: number
  onClose: () => void
}) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg" onClose={onClose}>
        {target && (
          // Keyed so each task opens a fresh form with its own rules.
          <CompleteTaskForm
            key={`${target.kind}-${target.row.id}`}
            target={target}
            workedSeconds={workedSeconds}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
