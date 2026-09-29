import { Field } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ProgressBar } from '@/features/office-task/common'
import { useProgressForm } from '../hooks/use-progress-form'
import type { MyProjectRow } from '../types'

function ProgressForm({ row, onClose }: { row: MyProjectRow; onClose: () => void }) {
  const { form, percentInput, percent, goingBack, stopping, onSubmit, isPending } = useProgressForm(row, onClose)
  const { formState: { errors } } = form

  return (
    <DialogForm onSubmit={onSubmit} noValidate>
      <DialogHeader>
        <DialogTitle className="pr-10">{stopping ? 'Stop & Record Progress' : 'Record Progress'}</DialogTitle>
        <DialogDescription>
          {row.task} · update {Math.min(row.updatesToday + 1, row.updatesPerDay)} of {row.updatesPerDay} today
          {row.updatesToday >= row.updatesPerDay && ' (target already met)'}
          {stopping && ' · the clock stops when you save'}
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="mt-5 py-1">
        <Field
          label="Progress %"
          required
          error={errors.percent?.message}
          hint={`Last reported ${row.latestPercent}%.`}
        >
          <div className="flex items-center gap-3">
            <Input className="w-24" autoFocus {...percentInput} />
            <ProgressBar percent={percent} className="h-2" />
          </div>
          {goingBack && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              This is lower than the last reported {row.latestPercent}%.
            </p>
          )}
        </Field>
      </DialogBody>

      <DialogFooter className="mt-6 gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : stopping ? 'Save & Stop' : 'Save Progress'}
        </Button>
      </DialogFooter>
    </DialogForm>
  )
}

/** Stop a project task's clock with its new progress %. */
export function ProgressDialog({ row, onClose }: { row: MyProjectRow | null; onClose: () => void }) {
  return (
    <Dialog open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" onClose={onClose}>
        {row && <ProgressForm key={row.id} row={row} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
