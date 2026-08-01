import { Controller } from 'react-hook-form'
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import { Building2, MapPin, Phone } from 'lucide-react'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import type { StateSelect } from '@/features/master/state'
import type { DistrictSelect } from '@/features/master/district'
import { OFFICE_TYPE_OPTIONS } from '../constants'
import type { OfficeAddressFormValues } from '../schemas'

interface OfficeAddressFormFieldsProps {
  register: UseFormRegister<OfficeAddressFormValues>
  control: Control<OfficeAddressFormValues>
  errors: FieldErrors<OfficeAddressFormValues>
  /** Scroll-lazy state dropdown — options page in as the list is scrolled. */
  state: StateSelect
  /** Scroll-lazy district dropdown, scoped to the chosen state. */
  district: DistrictSelect
  /** District stays empty until a state is chosen — it cascades off it. */
  hasState: boolean
  changeState: (value: string, onChange: (value: string) => void) => void
  /** What the office belongs to, for the section copy — e.g. `PF`. */
  officeLabel: string
  /** Only the PF screen classifies its offices. */
  showOfficeType?: boolean
}

/**
 * The office address field grid — who the office is, how to reach it and where
 * it sits. Shared by all five screens; District cascades off the selected state.
 */
export function OfficeAddressFormFields({
  register,
  control,
  errors,
  state,
  district,
  hasState,
  changeState,
  officeLabel,
  showOfficeType,
}: OfficeAddressFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <FormSection
        icon={Building2}
        title="Office Information"
        description={`How this ${officeLabel} office is identified`}
        className="mt-0"
      />
      <Field label="Office Name" required error={errors.officeName?.message}>
        <Input placeholder="Office Name" {...register('officeName')} />
      </Field>
      <Field label="Office Code" error={errors.officeCode?.message}>
        <Input placeholder="Office Code" {...register('officeCode')} />
      </Field>
      {showOfficeType && (
        <Field label="Office Type" error={errors.officeType?.message}>
          <Controller
            control={control}
            name="officeType"
            render={({ field }) => (
              <Combobox
                className="w-full"
                value={field.value}
                onChange={field.onChange}
                options={OFFICE_TYPE_OPTIONS}
                searchable={false}
                placeholder="Select Office Type"
              />
            )}
          />
        </Field>
      )}

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
      <Field label="State" required error={errors.stateId?.message}>
        <Controller
          control={control}
          name="stateId"
          render={({ field }) => (
            <Combobox
              className="w-full"
              value={field.value}
              onChange={(value) => changeState(value, field.onChange)}
              {...state}
              placeholder="Select State"
              searchPlaceholder="Search state"
            />
          )}
        />
      </Field>
      <Field label="District" required error={errors.districtId?.message}>
        <Controller
          control={control}
          name="districtId"
          render={({ field }) => (
            <Combobox
              className="w-full"
              value={field.value}
              onChange={field.onChange}
              {...district}
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
