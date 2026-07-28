import { Controller } from 'react-hook-form'
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import { Building2, MapPin, Phone } from 'lucide-react'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import type { FactoryOfficeAddressFormValues } from '../schemas'

interface FactoryOfficeAddressFormFieldsProps {
  register: UseFormRegister<FactoryOfficeAddressFormValues>
  control: Control<FactoryOfficeAddressFormValues>
  errors: FieldErrors<FactoryOfficeAddressFormValues>
  stateOptions: ComboboxOption[]
  isStatesLoading?: boolean
  districtOptions: ComboboxOption[]
  isDistrictsLoading?: boolean
  /** District stays disabled until a state is chosen — it cascades off it. */
  hasState: boolean
  changeState: (value: string, onChange: (value: string) => void) => void
}

/**
 * The factory office address field grid — who the office is, how to reach it and
 * where it sits. District cascades off the selected state.
 */
export function FactoryOfficeAddressFormFields({
  register,
  control,
  errors,
  stateOptions,
  isStatesLoading,
  districtOptions,
  isDistrictsLoading,
  hasState,
  changeState,
}: FactoryOfficeAddressFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <FormSection
        icon={Building2}
        title="Office Information"
        description="How this factory office is identified"
        className="mt-0"
      />
      <Field label="Office Name" required error={errors.officeName?.message}>
        <Input placeholder="Office Name" {...register('officeName')} />
      </Field>
      <Field label="Office Code" error={errors.officeCode?.message}>
        <Input placeholder="Office Code" {...register('officeCode')} />
      </Field>

      <FormSection
        icon={Phone}
        title="Contact Details"
        description="How to reach this office"
      />
      <Field label="Mobile Number" error={errors.mobile?.message}>
        <Input inputMode="numeric" placeholder="Mobile Number" {...register('mobile')} />
      </Field>
      <Field label="Phone Number" error={errors.phone?.message}>
        <Input inputMode="tel" placeholder="Phone Number" {...register('phone')} />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <Input type="email" placeholder="Email" {...register('email')} />
      </Field>

      <FormSection
        icon={MapPin}
        title="Address Details"
        description="Where the office is located"
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
      <Field label="State" required error={errors.state?.message}>
        <Controller
          control={control}
          name="state"
          render={({ field }) => (
            <Combobox
              className="w-full"
              value={field.value}
              onChange={(value) => changeState(value, field.onChange)}
              options={stateOptions}
              loading={isStatesLoading}
              placeholder="Select State"
              searchPlaceholder="Search state"
            />
          )}
        />
      </Field>
      <Field label="District" required error={errors.district?.message}>
        <Controller
          control={control}
          name="district"
          render={({ field }) => (
            <Combobox
              className="w-full"
              value={field.value}
              onChange={field.onChange}
              options={districtOptions}
              loading={isDistrictsLoading}
              placeholder={hasState ? 'Select District' : 'Select a state first'}
              searchPlaceholder="Search district"
            />
          )}
        />
      </Field>
      <Field label="City" error={errors.city?.message}>
        <Input placeholder="City" {...register('city')} />
      </Field>
      <Field label="Pin Code" error={errors.pinCode?.message}>
        <Input inputMode="numeric" placeholder="Pin Code" {...register('pinCode')} />
      </Field>
    </div>
  )
}
