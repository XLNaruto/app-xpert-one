import { Controller } from 'react-hook-form'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { Field } from '@/components/common/form-field'
import { TimePicker } from '@/components/ui/time-picker'

/**
 * A labelled time field — `Field` + the `TimePicker` popup, wired to
 * react-hook-form.
 *
 * A picker rather than `<input type="time">`: the native control draws itself
 * from the machine's locale, so the same screen showed a 24-hour dial on one
 * desktop and hh:mm AM/PM on the next, and `lang` only sways some browsers. The
 * popup — hour / minute / AM-PM columns, like the `DatePicker`'s calendar —
 * looks the same everywhere.
 *
 * **The panel is 12-hour; the value is 24-hour.** The field holds `HH:MM` — what
 * the API stores and what the schemas validate — and only what's shown is
 * `hh:mm AM/PM`.
 */

interface TimeFieldProps<T extends FieldValues> {
  control: Control<T>
  /** Form field holding an `HH:MM` string. */
  name: FieldPath<T>
  label: string
  required?: boolean
  /** Help text shown behind an info icon beside the label. */
  hint?: string
  error?: string
  /** Minutes between one offered minute and the next. */
  minuteStep?: number
  className?: string
}

export function TimeField<T extends FieldValues>({
  control,
  name,
  label,
  required = false,
  hint,
  error,
  minuteStep,
  className,
}: TimeFieldProps<T>) {
  return (
    <Field
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={className}
    >
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <TimePicker
            value={(field.value as string) ?? ''}
            onChange={field.onChange}
            minuteStep={minuteStep}
            // Only optional fields get a clear control — a required time has
            // nothing meaningful to clear to.
            clearable={!required}
          />
        )}
      />
    </Field>
  )
}
