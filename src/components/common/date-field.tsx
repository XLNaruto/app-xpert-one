import { Controller } from 'react-hook-form'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { Field } from '@/components/common/form-field'
import { DatePicker } from '@/components/ui/date-picker'

interface DateFieldProps<T extends FieldValues> {
  control: Control<T>
  /** Form field holding a `yyyy-MM-dd` string. */
  name: FieldPath<T>
  label: string
  required?: boolean
  /** Spell out that the date may be left blank — an "(Optional)" label suffix. */
  optional?: boolean
  /** Help text shown behind an info icon beside the label. */
  hint?: string
  error?: string
  minDate?: Date
  maxDate?: Date
  className?: string
}

/**
 * A labelled date field — `Field` + the react-date-picker control wired to
 * react-hook-form. Use this instead of hand-rolling a Controller for every date
 * on a form.
 */
export function DateField<T extends FieldValues>({
  control,
  name,
  label,
  required = false,
  optional = false,
  hint,
  error,
  minDate,
  maxDate,
  className,
}: DateFieldProps<T>) {
  return (
    <Field
      label={label}
      required={required}
      optional={optional}
      hint={hint}
      error={error}
      className={className}
    >
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <DatePicker
            value={(field.value as string) ?? ''}
            onChange={field.onChange}
            minDate={minDate}
            maxDate={maxDate}
          />
        )}
      />
    </Field>
  )
}
