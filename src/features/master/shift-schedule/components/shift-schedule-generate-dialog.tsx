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
      title="Generate the Schedule?"
      description={
        state.canRun
          ? `This will fill ${formatDate(state.from)} – ${formatDate(state.to)} from the week-off policy for everyone the filters match. Dates you changed by hand are kept.`
          : 'The Whole Window Has Passed. Past Dates Can Only Be Changed One at a Time on the Grid.'
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
            label="Only These Employees"
            hint="Leave It Clear to Generate for Everyone the Filters Match."
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
              placeholder="All Matching Employees"
              searchPlaceholder="Search Employees…"
            />
          </Field>
        </div>
      )}
    </ConfirmDialog>
  )
}
