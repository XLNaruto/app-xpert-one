import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import { Percent } from 'lucide-react'
import { DateField } from '@/components/common/date-field'
import { Field } from '@/components/common/form-field'
import { FormSection } from '@/components/common/form-section'
import { Input } from '@/components/ui/input'
import { PF_RATE_VALUE_FIELDS, WEF_HINT } from '../constants'
import type { PfRateFormValues } from '../schemas'

interface PfRateFormFieldsProps {
  register: UseFormRegister<PfRateFormValues>
  control: Control<PfRateFormValues>
  errors: FieldErrors<PfRateFormValues>
}

/**
 * The PF rate slab's field grid — the effective date plus every rate and limit,
 * generated from `PF_RATE_VALUE_FIELDS` so the form, the list columns and the
 * history columns can never drift apart.
 */
export function PfRateFormFields({ register, control, errors }: PfRateFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <FormSection
        icon={Percent}
        title="PF Rate Settings"
        description="Configure the rate setup for Provident Fund"
        className="mt-0"
      />

      <DateField
        control={control}
        name="wef"
        label="W.E.F (With Effect From)"
        required
        hint={WEF_HINT}
        error={errors.wef?.message}
      />

      {PF_RATE_VALUE_FIELDS.map((field) => (
        <Field
          key={field.key}
          label={field.label}
          required={!field.locked}
          hint={field.hint}
          error={errors[field.key]?.message}
        >
          {/* Locked fields stay registered (so their value still saves) but
              read as disabled — the value isn't the user's to key in. */}
          <Input
            inputMode="decimal"
            placeholder={field.label}
            disabled={field.locked}
            {...register(field.key)}
          />
        </Field>
      ))}
    </div>
  )
}
