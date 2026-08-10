import { CopyPlus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Field } from '@/components/common/form-field'
import type { useShiftRotationForm } from '../hooks/use-shift-rotation-form'

/**
 * The cycle editor — one row per week, each naming the shift worked that week.
 *
 * There is no add / remove per row: the cycle has to cover weeks 1..length exactly
 * once, so the length field owns how many rows exist. A row that could be deleted
 * on its own would let the user build the one thing the API refuses.
 */
export function RotationWeeksField({
  form,
}: {
  form: ReturnType<typeof useShiftRotationForm>
}) {
  const weeksError =
    typeof form.errors.weeks?.message === 'string' ? form.errors.weeks.message : undefined

  return (
    <div className="col-span-full space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          The cycle
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            — week 1 starts on each employee's own effective date, so two people
            assigned a week apart are out of phase by design
          </span>
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={form.fillFromFirstWeek}
        >
          <CopyPlus className="size-4" />
          Fill from week 1
        </Button>
      </div>

      {form.hasNoShifts ? (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          This company has no shifts yet. Add them on the company's Shift tab first
          — a rotation is built from the company's own shifts.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {form.weeks.map((week, index) => (
            <Field
              key={week.weekNumber}
              label={`Week ${week.weekNumber}`}
              required
              error={form.errors.weeks?.[index]?.shiftId?.message}
            >
              {/*
                A shift's label carries its window as well as its name, which the
                field's own width truncates — `panelMinWidth` lets the option list
                open wider than the control it hangs off.
              */}
              <Combobox
                className="w-full"
                panelMinWidth={320}
                value={week.shiftId}
                onChange={(value) => form.setWeekShift(week.weekNumber, value)}
                options={form.shiftSelectOptions}
                placeholder={form.isShiftsLoading ? 'Loading…' : 'Select shift'}
                searchPlaceholder="Search shift"
              />
            </Field>
          ))}
        </div>
      )}

      {weeksError && <p className="text-xs text-destructive">{weeksError}</p>}

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <RefreshCw className="mt-0.5 size-3.5 shrink-0" />
        After the last week the cycle starts again at week 1.
      </p>
    </div>
  )
}
