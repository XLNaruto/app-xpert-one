import { Controller, type Control } from 'react-hook-form'
import { parseISO } from 'date-fns'
import { Field } from '@/components/common/form-field'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'
import { formatIst, toIstFields } from '../lib/ist'
import type { CompanySettingsFormValues } from '../schemas'

/**
 * The required "Effective from" date + time, picked as IST wall-clock. The
 * calendar can't go below the minimum's date; a too-early time on that date is
 * reported through `error`.
 */
export function EffectiveFromField({
  control,
  earliest,
  error,
  disabled,
}: {
  control: Control<CompanySettingsFormValues>
  /** `earliest_effective_from` — the floor. */
  earliest?: string
  error?: string
  disabled?: boolean
}) {
  const minDate = earliest ? parseISO(toIstFields(earliest).date) : undefined

  return (
    <Field
      label="Effective from (IST)"
      required
      hint="Changes Take Effect at Least 7 Days Ahead, Counting Today, at the Same Clock Time."
      error={error}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Controller
          control={control}
          name="effectiveDate"
          render={({ field }) => (
            <DatePicker
              value={field.value}
              onChange={field.onChange}
              minDate={minDate}
              clearable={false}
              disabled={disabled}
            />
          )}
        />
        <Controller
          control={control}
          name="effectiveTime"
          render={({ field }) => (
            <TimePicker value={field.value} onChange={field.onChange} disabled={disabled} />
          )}
        />
      </div>
      {earliest && (
        <p className="text-xs text-muted-foreground">
          Earliest allowed: {formatIst(earliest)}
        </p>
      )}
    </Field>
  )
}
