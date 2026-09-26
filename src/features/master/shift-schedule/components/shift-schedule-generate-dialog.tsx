import { CalendarCog, UsersRound } from 'lucide-react'
import { Combobox } from '@/components/ui/combobox'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Field } from '@/components/common/form-field'
import { formatDate } from '@/lib/utils'
import { SCHEDULE_GENERATE_MAX_EMPLOYEES } from '../constants'
import type { ShiftScheduleGenerateState } from '../hooks/use-shift-schedule-generate'

/**
 * The confirm before Generate runs — what window it fills, that hand-set dates
 * survive, and (optionally) the few people to regenerate instead of everyone.
 */
export function ShiftScheduleGenerateDialog({ state }: { state: ShiftScheduleGenerateState }) {
  return (
    <ConfirmDialog
      open={state.isOpen}
      onOpenChange={(open) => !open && state.close()}
      icon={CalendarCog}
      title="Generate the schedule?"
      description={
        state.canRun
          ? `This will fill ${formatDate(state.from)} – ${formatDate(state.to)} from the week-off policy for everyone the filters match. Dates you changed by hand are kept.`
          : 'The whole window has passed. Past dates can only be changed one at a time on the grid.'
      }
      confirmLabel={state.isRunning ? 'Generating…' : 'Generate'}
      cancelLabel="Cancel"
      loading={state.isRunning}
      confirmDisabled={!state.canRun}
      keepOpenOnConfirm
      onConfirm={state.run}
    >
      {state.canRun && (
        <div className="space-y-3">
          {state.isTrimmed && (
            <p className="text-xs text-muted-foreground">
              Generate can't fill past dates, so it starts from today.
            </p>
          )}
          <Field
            label="Only these employees"
            hint="Leave it clear to generate for everyone the filters match."
          >
            <Combobox
              multiple
              value={state.employeeIds.map(String)}
              onChange={(value) =>
                state.setEmployeeIds(
                  value.slice(0, SCHEDULE_GENERATE_MAX_EMPLOYEES).map(Number),
                )
              }
              {...state.employees}
              icon={UsersRound}
              placeholder="All matching employees"
              searchPlaceholder="Search employees…"
            />
          </Field>
        </div>
      )}
    </ConfirmDialog>
  )
}
