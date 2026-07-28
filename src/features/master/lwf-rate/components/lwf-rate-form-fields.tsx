import { Controller } from 'react-hook-form'
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import { Landmark } from 'lucide-react'
import { DateField } from '@/components/common/date-field'
import { Field } from '@/components/common/form-field'
import { FormSection } from '@/components/common/form-section'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { LWF_LABELS, MONTH_OPTIONS } from '../constants'
import type { LwfRateFormValues } from '../schemas'

interface LwfRateFormFieldsProps {
  register: UseFormRegister<LwfRateFormValues>
  control: Control<LwfRateFormValues>
  errors: FieldErrors<LwfRateFormValues>
  stateOptions: ComboboxOption[]
  isStatesLoading?: boolean
}

/**
 * The LWF rate's field grid — when and where the contribution applies, the
 * month it's collected in and the two flat amounts.
 */
export function LwfRateFormFields({
  register,
  control,
  errors,
  stateOptions,
  isStatesLoading,
}: LwfRateFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <FormSection
        icon={Landmark}
        title="LWF Rate Settings"
        description="Configure Labour Welfare Fund contribution details"
        className="mt-0"
      />

      <DateField
        control={control}
        name="wef"
        label={LWF_LABELS.wef}
        required
        error={errors.wef?.message}
      />

      <Field
        label={LWF_LABELS.state}
        required
        error={errors.stateId?.message}
      >
        <Controller
          control={control}
          name="stateId"
          render={({ field }) => (
            <Combobox
              className="w-full"
              value={field.value}
              onChange={field.onChange}
              options={stateOptions}
              loading={isStatesLoading}
              placeholder="Select State"
              searchPlaceholder="Search state"
            />
          )}
        />
      </Field>

      <Field
        label={LWF_LABELS.month}
        required
        error={errors.month?.message}
      >
        <Controller
          control={control}
          name="month"
          render={({ field }) => (
            <Combobox
              className="w-full"
              value={field.value}
              onChange={field.onChange}
              options={MONTH_OPTIONS}
              searchable={false}
              placeholder="Select Month"
            />
          )}
        />
      </Field>

      <Field
        label={LWF_LABELS.employeeContribution}
        required
        error={errors.employeeContribution?.message}
      >
        <Input
          inputMode="decimal"
          placeholder={LWF_LABELS.employeeContribution}
          {...register('employeeContribution')}
        />
      </Field>

      <Field
        label={LWF_LABELS.employerContribution}
        required
        error={errors.employerContribution?.message}
      >
        <Input
          inputMode="decimal"
          placeholder={LWF_LABELS.employerContribution}
          {...register('employerContribution')}
        />
      </Field>
    </div>
  )
}
