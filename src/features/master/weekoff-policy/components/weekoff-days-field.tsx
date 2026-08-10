import { Controller } from 'react-hook-form'
import { CalendarOff, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Switch } from '@/components/ui/switch'
import { Field } from '@/components/common/form-field'
import { cn } from '@/lib/utils'
import { WEEK_DAYS, WEEK_DAY_OPTIONS, WEEK_NUMBER_OPTIONS, WEEKOFF_PRESETS } from '../constants'
import type { useWeekoffPolicyForm } from '../hooks/use-weekoff-policy-form'

/**
 * The rule editor — the whole of what a week-off policy is.
 *
 * Split in two because that's how the pattern is actually spoken. The seven
 * toggles are the plain "this weekday is always off" rules; the rows below them
 * are the occurrence-specific ones, which is what makes alternate Saturdays
 * expressible at all (two rules, the 2nd and the 4th) and what lets a broad rule
 * carry an exception (`Off` turned off on one occurrence = a working day).
 *
 * A flat list of rules would have been closer to the wire, but it would have made
 * the ordinary case — Sundays off — a form to fill in rather than one tick.
 */
export function WeekoffDaysField({
  form,
}: {
  form: ReturnType<typeof useWeekoffPolicyForm>
}) {
  const { errors } = form

  return (
    <div className="col-span-full space-y-6">
      {/* ── Presets ─────────────────────────────────────────────────────── */}

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5" />
          Start from a common pattern
        </p>
        <div className="flex flex-wrap gap-2">
          {WEEKOFF_PRESETS.map((preset, index) => (
            <Button
              key={preset.label}
              type="button"
              size="sm"
              variant="outline"
              title={preset.description}
              onClick={() => form.applyPreset(index)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Every-week days ─────────────────────────────────────────────── */}

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">
          Off every week
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            — the days that are off in every week of the month
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          {WEEK_DAYS.map((day) => {
            const selected = form.everyWeekDays.includes(day.value)
            return (
              <button
                key={day.value}
                type="button"
                aria-pressed={selected}
                onClick={() => form.toggleWeekDay(day.value)}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground dark:text-foreground',
                )}
              >
                {selected && <CalendarOff className="size-3.5" />}
                {day.label}
              </button>
            )
          })}
        </div>
        {errors.everyWeekDays?.message && (
          <p className="mt-2 text-xs text-destructive">{errors.everyWeekDays.message}</p>
        )}
      </div>

      {/* ── Occurrence rules ────────────────────────────────────────────── */}

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">
            Occurrence rules
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              — for a pattern that only applies to some weeks of the month
            </span>
          </p>
          <Button type="button" size="sm" variant="outline" onClick={form.addRule}>
            <Plus className="size-4" />
            Add Rule
          </Button>
        </div>

        {form.rules.fields.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
            No occurrence rules. Add one for alternate Saturdays (the 2nd and the
            4th), or to mark one occurrence of an off day as working.
          </p>
        ) : (
          <div className="space-y-3">
            {form.rules.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 items-start gap-x-4 gap-y-3 rounded-xl border border-border bg-card px-3 py-3 sm:grid-cols-[1fr_1fr_auto_auto]"
              >
                <Field
                  label="Day"
                  required
                  error={errors.rules?.[index]?.weekDay?.message}
                >
                  <Controller
                    control={form.form.control}
                    name={`rules.${index}.weekDay`}
                    render={({ field: control }) => (
                      <Combobox
                        className="w-full"
                        searchable={false}
                        value={control.value}
                        onChange={control.onChange}
                        options={WEEK_DAY_OPTIONS}
                        placeholder="Select day"
                      />
                    )}
                  />
                </Field>

                <Field
                  label="Occurrence"
                  error={errors.rules?.[index]?.weekNumber?.message}
                  hint="Which occurrence of that weekday in the month. 'Every occurrence' is the whole month."
                >
                  <Controller
                    control={form.form.control}
                    name={`rules.${index}.weekNumber`}
                    render={({ field: control }) => (
                      <Combobox
                        className="w-full"
                        searchable={false}
                        value={control.value}
                        onChange={control.onChange}
                        options={WEEK_NUMBER_OPTIONS}
                        placeholder="Every occurrence"
                      />
                    )}
                  />
                </Field>

                {/*
                  Off by default. Turned off, the row becomes a WORKING-day
                  exception — a dated rule outranks an every-week one, so this is
                  how "Saturdays are off, except the 1st" is expressed.
                */}
                <Field label="Is Off">
                  <div className="flex h-9 items-center gap-2">
                    <Controller
                      control={form.form.control}
                      name={`rules.${index}.isOff`}
                      render={({ field: control }) => (
                        <>
                          <Switch
                            checked={control.value}
                            onCheckedChange={control.onChange}
                            aria-label="Day off"
                          />
                          <span className="whitespace-nowrap text-xs text-muted-foreground">
                            {control.value ? 'Week off' : 'Working day'}
                          </span>
                        </>
                      )}
                    />
                  </div>
                </Field>

                <div className="flex h-9 items-end sm:mt-[22px]">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label="Remove rule"
                    onClick={() => form.rules.remove(index)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {typeof errors.rules?.message === 'string' && (
          <p className="mt-2 text-xs text-destructive">{errors.rules.message}</p>
        )}
      </div>

      {/* ── Live summary ────────────────────────────────────────────────── */}

      <div className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
        <p className="text-xs text-muted-foreground">
          This pattern reads as{' '}
          <span className="font-medium text-foreground">{form.summary}</span>
        </p>
      </div>
    </div>
  )
}
