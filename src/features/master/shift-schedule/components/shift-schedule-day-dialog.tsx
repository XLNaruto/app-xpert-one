import { Clock, RotateCcw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Field } from '@/components/common/form-field'
import { cn, formatDate } from '@/lib/utils'
import type { ShiftScheduleDayState } from '../hooks/use-shift-schedule-day'

interface ShiftScheduleDayDialogProps {
  state: ShiftScheduleDayState
  /** `shift-schedules:delete` — "Reset to policy" shows only with it. */
  canDelete: boolean
}

/**
 * One date, opened: Off or Working, the shift for the date, and handing the date
 * back to the week-off policy.
 */
export function ShiftScheduleDayDialog({ state, canDelete }: ShiftScheduleDayDialogProps) {
  const { target } = state
  const busy = state.isSaving || state.isResetting
  const isEditorOpen = target !== null

  return (
    <Dialog open={isEditorOpen} onOpenChange={(open) => !open && !busy && state.close()}>
      {isEditorOpen && (
        <DialogContent className="sm:max-w-md" onClose={busy ? undefined : state.close}>
          <DialogHeader className="pr-10">
            <DialogTitle>{formatDate(target.date, 'EEEE, dd MMM yyyy')}</DialogTitle>
            <DialogDescription>
              {target.employee.employeeName}
              {target.employee.employeeCode ? ` · ${target.employee.employeeCode}` : ''}
              {' — '}
              {target.day?.isWeekOff == null
                ? 'not scheduled; the week-off policy decides.'
                : target.day.sourceType === 'MANUAL'
                  ? 'set by hand.'
                  : 'from the week-off policy.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field label="This day is" required>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: true, label: 'Off' },
                  { value: false, label: 'Working' },
                ].map((choice) => (
                  <button
                    key={choice.label}
                    type="button"
                    aria-pressed={state.isWeekOff === choice.value}
                    onClick={() => state.setIsWeekOff(choice.value)}
                    className={cn(
                      'h-10 cursor-pointer rounded-lg border text-sm font-medium transition-colors',
                      state.isWeekOff === choice.value
                        ? choice.value
                          ? 'border-success bg-success/15 text-success'
                          : 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field
              label="Shift"
              hint="“Normal shift” means the employee's usual shift — their assignment, or the department or company default."
            >
              <Combobox
                value={state.shiftValue}
                onChange={(value) => value && state.setShiftValue(value)}
                {...state.shiftSelect}
                icon={Clock}
                placeholder="Normal shift"
                searchPlaceholder="Search shifts…"
              />
            </Field>
          </div>

          <DialogFooter className="mt-6 flex-wrap gap-2">
            {canDelete && state.canReset && (
              <Button
                type="button"
                variant="outline"
                className="sm:mr-auto"
                onClick={state.reset}
                disabled={busy}
              >
                <RotateCcw className="size-4" />
                {state.isResetting ? 'Resetting…' : 'Reset to policy'}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={state.close} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={state.save} disabled={busy || state.isWeekOff === null}>
              {state.isSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
}
