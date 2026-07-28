import { Controller } from 'react-hook-form'
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import { HeartPulse } from 'lucide-react'
import { DateField } from '@/components/common/date-field'
import { Field } from '@/components/common/form-field'
import { FormSection } from '@/components/common/form-section'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import {
  ESIC_RATE_VALUE_FIELDS,
  MONTH_OPTIONS,
  PERIOD_FIELDS_AFTER,
} from '../constants'
import type { EsicRateFormValues } from '../schemas'

interface EsicRateFormFieldsProps {
  register: UseFormRegister<EsicRateFormValues>
  control: Control<EsicRateFormValues>
  errors: FieldErrors<EsicRateFormValues>
}

/** The two contribution-period dropdowns, keyed by their form field. */
const PERIOD_FIELDS = [
  {
    name: 'contributionEndPeriod1',
    label: 'Contribution Period 1',
  },
  {
    name: 'contributionEndPeriod2',
    label: 'Contribution Period 2',
  },
] as const

/**
 * The ESIC rate slab's field grid — the effective date, the contribution period
 * months and every rate and limit, generated from `ESIC_RATE_VALUE_FIELDS` so
 * the form, the list columns and the history columns can never drift apart.
 */
export function EsicRateFormFields({
  register,
  control,
  errors,
}: EsicRateFormFieldsProps) {
  const valueField = (field: (typeof ESIC_RATE_VALUE_FIELDS)[number]) => (
    <Field
      key={field.key}
      label={field.label}
      required
      error={errors[field.key]?.message}
    >
      <Input inputMode="decimal" placeholder={field.label} {...register(field.key)} />
    </Field>
  )

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <FormSection
        icon={HeartPulse}
        title="ESIC Rate Settings"
        description="Configure the basic rate setup for ESIC"
        className="mt-0"
      />

      <DateField
        control={control}
        name="wef"
        label="W.E.F (With Effect From)"
        required
        error={errors.wef?.message}
      />

      {ESIC_RATE_VALUE_FIELDS.slice(0, PERIOD_FIELDS_AFTER).map(valueField)}

      {PERIOD_FIELDS.map((period) => (
        <Field
          key={period.name}
          label={period.label}
          required
          error={errors[period.name]?.message}
        >
          <Controller
            control={control}
            name={period.name}
            render={({ field }) => (
              <Combobox
                className="w-full"
                value={field.value}
                onChange={field.onChange}
                options={MONTH_OPTIONS}
                placeholder="Select month"
                searchPlaceholder="Search month"
              />
            )}
          />
        </Field>
      ))}

      {ESIC_RATE_VALUE_FIELDS.slice(PERIOD_FIELDS_AFTER).map(valueField)}
    </div>
  )
}
