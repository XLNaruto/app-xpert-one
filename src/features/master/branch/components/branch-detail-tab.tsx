import { Controller } from 'react-hook-form'
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import { Building2, MapPin } from 'lucide-react'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import type { BranchFormValues } from '../schemas'

interface BranchDetailTabProps {
  register: UseFormRegister<BranchFormValues>
  control: Control<BranchFormValues>
  errors: FieldErrors<BranchFormValues>
  stateOptions: ComboboxOption[]
  districtOptions: ComboboxOption[]
  changeState: (value: string, onChange: (value: string) => void) => void
}

/** "Branch Detail" tab — branch identity and address fields. */
export function BranchDetailTab({
  register,
  control,
  errors,
  stateOptions,
  districtOptions,
  changeState,
}: BranchDetailTabProps) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <FormSection
        icon={Building2}
        title="Branch Information"
        description="How this branch is identified"
        className="mt-0"
      />
      <Field label="Branch Name" required error={errors.branchName?.message}>
        <Input placeholder="Branch Name" {...register('branchName')} />
      </Field>

      <FormSection
        icon={MapPin}
        title="Address Details"
        description="Where the branch is located"
      />
      <Field label="Address Line 1" required error={errors.addressLine1?.message}>
        <Input placeholder="Address Line 1" {...register('addressLine1')} />
      </Field>
      <Field label="Address Line 2" error={errors.addressLine2?.message}>
        <Input placeholder="Address Line 2" {...register('addressLine2')} />
      </Field>
      <Field label="Address Line 3" error={errors.addressLine3?.message}>
        <Input placeholder="Address Line 3" {...register('addressLine3')} />
      </Field>
      <Field label="State" error={errors.state?.message}>
        <Controller
          control={control}
          name="state"
          render={({ field }) => (
            <Combobox
              className="w-full"
              value={field.value}
              onChange={(value) => changeState(value, field.onChange)}
              options={stateOptions}
              placeholder="Select State"
              searchPlaceholder="Search state"
            />
          )}
        />
      </Field>
      <Field label="District" error={errors.district?.message}>
        <Controller
          control={control}
          name="district"
          render={({ field }) => (
            <Combobox
              className="w-full"
              value={field.value}
              onChange={field.onChange}
              options={districtOptions}
              placeholder="Select District"
              searchPlaceholder="Search district"
            />
          )}
        />
      </Field>
      <Field label="City" error={errors.city?.message}>
        <Input placeholder="City" {...register('city')} />
      </Field>
      <Field label="Pin Code" error={errors.pinCode?.message}>
        <Input
          inputMode="numeric"
          maxLength={6}
          placeholder="Pin Code"
          {...register('pinCode')}
        />
      </Field>
    </div>
  )
}
