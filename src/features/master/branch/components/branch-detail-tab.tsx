import { Controller } from 'react-hook-form'
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import { Building2, MapPin, Phone } from 'lucide-react'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import type { StateSelect } from '@/features/master/state'
import type { DistrictSelect } from '@/features/master/district'
import type { BranchFormValues } from '../schemas'

interface BranchDetailTabProps {
  register: UseFormRegister<BranchFormValues>
  control: Control<BranchFormValues>
  errors: FieldErrors<BranchFormValues>
  /** Scroll-lazy dropdown props — spread straight onto `<Combobox>`. */
  state: StateSelect
  district: DistrictSelect
  /** Districts cascade off the state, so the placeholder says so until one is picked. */
  hasState: boolean
  changeState: (value: string, onChange: (value: string) => void) => void
}

/**
 * "Branch Detail" tab — the branch's identity, address and contact fields, i.e.
 * everything `/user/branches` itself stores.
 */
export function BranchDetailTab({
  register,
  control,
  errors,
  state,
  district,
  hasState,
  changeState,
}: BranchDetailTabProps) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <FormSection
        icon={Building2}
        title="Branch Information"
        description="Identity and registration details"
        className="mt-0"
      />
      <Field label="Branch Name" required error={errors.branchName?.message}>
        <Input placeholder="Branch Name" {...register('branchName')} />
      </Field>
      <Field label="Registration Number" error={errors.registrationNumber?.message}>
        <Input placeholder="Registration Number" {...register('registrationNumber')} />
      </Field>
      <Field label="PAN Number" error={errors.panNumber?.message}>
        <Input
          placeholder="PAN Number"
          className="uppercase placeholder:normal-case"
          {...register('panNumber')}
        />
      </Field>
      <Field label="GST Number" error={errors.gstNumber?.message}>
        <Input
          placeholder="GST Number"
          className="uppercase placeholder:normal-case"
          {...register('gstNumber')}
        />
      </Field>

      <FormSection
        icon={MapPin}
        title="Address Details"
        description="Where the branch is located"
      />
      <Field
        label="Address Line 1"
        error={errors.addressLine1?.message}
        className="md:col-span-2"
      >
        <Input placeholder="Address Line 1" {...register('addressLine1')} />
      </Field>
      <Field label="Address Line 2" error={errors.addressLine2?.message}>
        <Input placeholder="Address Line 2" {...register('addressLine2')} />
      </Field>
      <Field label="Address Line 3" error={errors.addressLine3?.message}>
        <Input placeholder="Address Line 3" {...register('addressLine3')} />
      </Field>
      <Field label="State" error={errors.stateId?.message}>
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
      <Field label="District" error={errors.districtId?.message}>
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
        <Input
          inputMode="numeric"
          maxLength={6}
          placeholder="Pin Code"
          {...register('pinCode')}
        />
      </Field>

      <FormSection
        icon={Phone}
        title="Contact Details"
        description="How to reach the branch"
      />
      <Field label="Phone" error={errors.phone?.message}>
        <Input placeholder="Phone" {...register('phone')} />
      </Field>
      <Field label="Primary Mobile Number" error={errors.mobile1?.message}>
        <Input
          inputMode="numeric"
          maxLength={10}
          placeholder="Primary Mobile Number"
          {...register('mobile1')}
        />
      </Field>
      <Field label="Secondary Mobile Number" error={errors.mobile2?.message}>
        <Input
          inputMode="numeric"
          maxLength={10}
          placeholder="Secondary Mobile Number"
          {...register('mobile2')}
        />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <Input type="email" placeholder="example@email.com" {...register('email')} />
      </Field>
    </div>
  )
}
