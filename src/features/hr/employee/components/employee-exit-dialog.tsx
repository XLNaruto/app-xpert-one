import { DateField } from '@/components/common/date-field'
import { Field } from '@/components/common/form-field'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { getApiErrorMessage } from '@/lib/api-error'
import type { useEmployeeExit } from '../hooks/use-employee-exit'
import { StepDialog } from './step-dialog'

/** "Exit Employee" from the list — the Leave Service dialog for one row. */
export function EmployeeExitDialog({ exit }: { exit: ReturnType<typeof useEmployeeExit> }) {
  const errors = exit.form.formState.errors
  const name = exit.target ? exit.target.name || 'this employee' : ''

  return (
    <StepDialog
      open={exit.target !== null}
      onOpenChange={(open) => !open && exit.close()}
      title="Exit Employee"
      description={`Closes ${name}'s open posting without opening another — they move to De-active.`}
      onSubmit={exit.onSubmit}
      isPending={exit.isPending}
      submitLabel="Exit Employee"
    >
      {exit.isLoading ? (
        <>
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-24 w-full sm:col-span-2" />
        </>
      ) : exit.loadError || exit.noOpenPosting ? (
        <p className="text-sm text-muted-foreground sm:col-span-2">
          {exit.loadError
            ? getApiErrorMessage(exit.loadError, "Couldn't load this employee's posting.")
            : `${name} has no open posting to close — their service has already ended or was never started.`}
        </p>
      ) : (
      <>
      <DateField
        control={exit.form.control}
        name="leavingDate"
        label="Leaving Date"
        required
        error={errors.leavingDate?.message}
        minDate={exit.joiningDate ? new Date(`${exit.joiningDate}T00:00:00`) : undefined}
      />

      <Field
        label="Leaving Reason"
        required
        error={errors.leavingReason?.message}
        className="sm:col-span-2"
      >
        <Textarea
          rows={3}
          placeholder="e.g. Resigned, contract ended, absconded"
          aria-invalid={errors.leavingReason ? true : undefined}
          {...exit.form.register('leavingReason')}
        />
      </Field>
      </>
      )}
    </StepDialog>
  )
}
