import { Controller } from 'react-hook-form'
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import { MapPin } from 'lucide-react'
import { DateField } from '@/components/common/date-field'
import { Field } from '@/components/common/form-field'
import { FormSection } from '@/components/common/form-section'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import type { PtRateFormValues } from '../schemas'

interface PtRateFormFieldsProps {
  register: UseFormRegister<PtRateFormValues>
  control: Control<PtRateFormValues>
  errors: FieldErrors<PtRateFormValues>
  stateOptions: ComboboxOption[]
  isStatesLoading?: boolean
}

/**
 * The PT rate's header — the effective date, the state the slabs belong to and
 * an optional note. The slab rows below are laid out by `PtRateSlabRows`.
 */
export function PtRateFormFields({
  register,
  control,
  errors,
  stateOptions,
  isStatesLoading,
}: PtRateFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3">
      <FormSection
        icon={MapPin}
        title="Basic Details"
        description="When this Professional Tax rate applies, and where"
        className="mt-0"
      />

      <DateField
        control={control}
        name="wef"
        label="W.E.F (With Effect From)"
        required
        error={errors.wef?.message}
      />

      <Field label="State" required error={errors.stateId?.message}>
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

      <Field label="Detail" error={errors.detail?.message}>
        <Input placeholder="Detail" {...register('detail')} />
      </Field>
    </div>
  )
}
