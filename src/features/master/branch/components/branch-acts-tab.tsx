import { Controller } from 'react-hook-form'
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import {
  Briefcase,
  Building2,
  HeartPulse,
  IndianRupee,
  ShieldCheck,
  UserRoundSearch,
} from 'lucide-react'
import { DateField } from '@/components/common/date-field'
import { Field } from '@/components/common/form-field'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { ESIC_DEDUCTS_ON_OPTIONS } from '../constants'
import type { BranchFormValues } from '../schemas'
import { ActCard } from './act-card'

interface BranchActsTabProps {
  register: UseFormRegister<BranchFormValues>
  control: Control<BranchFormValues>
  errors: FieldErrors<BranchFormValues>
  stateOptions: ComboboxOption[]
  pfDistrictOptions: ComboboxOption[]
  esicDistrictOptions: ComboboxOption[]
  changePfState: (value: string, onChange: (value: string) => void) => void
  changeEsicState: (value: string, onChange: (value: string) => void) => void
}

/** "Applicable Acts" tab — the statutory registrations recorded per branch. */
export function BranchActsTab({
  register,
  control,
  errors,
  stateOptions,
  pfDistrictOptions,
  esicDistrictOptions,
  changePfState,
  changeEsicState,
}: BranchActsTabProps) {
  return (
    <div className="space-y-5">
      {/* PF act */}
      <ActCard
        icon={ShieldCheck}
        title="PF Act"
        tone="border-primary/20 bg-primary/5"
        iconTone="text-primary"
      >
        <Field label="PF Code" error={errors.pfCode?.message}>
          <Input placeholder="PF Code" {...register('pfCode')} />
        </Field>
        <DateField
          control={control}
          name="epfActDate"
          label="EPF Act Date"
          error={errors.epfActDate?.message}
        />
        <DateField
          control={control}
          name="fpfActDate"
          label="FPF Act Date"
          error={errors.fpfActDate?.message}
        />
        <Field label="PF State" error={errors.pfState?.message}>
          <Controller
            control={control}
            name="pfState"
            render={({ field }) => (
              <Combobox
                className="w-full"
                value={field.value}
                onChange={(value) => changePfState(value, field.onChange)}
                options={stateOptions}
                placeholder="Select State"
                searchPlaceholder="Search state"
              />
            )}
          />
        </Field>
        <Field label="PF District" error={errors.pfDistrict?.message}>
          <Controller
            control={control}
            name="pfDistrict"
            render={({ field }) => (
              <Combobox
                className="w-full"
                value={field.value}
                onChange={field.onChange}
                options={pfDistrictOptions}
                placeholder="Select District"
                searchPlaceholder="Search district"
              />
            )}
          />
        </Field>
        <Field label="PF Office Address" error={errors.pfOfficeAddress?.message}>
          <Input placeholder="PF Office Address" {...register('pfOfficeAddress')} />
        </Field>
        <Field label="PF Username" error={errors.pfUsername?.message}>
          <Input placeholder="PF Username" {...register('pfUsername')} />
        </Field>
        <Field label="PF Password" error={errors.pfPassword?.message}>
          <PasswordInput
            autoComplete="new-password"
            placeholder="PF Password"
            {...register('pfPassword')}
          />
        </Field>
      </ActCard>

      {/* ESIC act */}
      <ActCard
        icon={HeartPulse}
        title="ESIC Act Settings"
        tone="border-emerald-500/20 bg-emerald-500/5"
        iconTone="text-emerald-600 dark:text-emerald-400"
      >
        <Field label="ESIC Code" error={errors.esicCode?.message}>
          <Input placeholder="ESIC Code" {...register('esicCode')} />
        </Field>
        <Field label="ESIC Deducts On" error={errors.esicDeductsOn?.message}>
          <Controller
            control={control}
            name="esicDeductsOn"
            render={({ field }) => (
              <Combobox
                className="w-full"
                value={field.value}
                onChange={field.onChange}
                options={ESIC_DEDUCTS_ON_OPTIONS}
                placeholder="Select Deduction Type"
                searchable={false}
              />
            )}
          />
        </Field>
        <DateField
          control={control}
          name="esicRegistrationDate"
          label="ESIC Registration Date"
          error={errors.esicRegistrationDate?.message}
        />
        <Field label="ESIC State" error={errors.esicState?.message}>
          <Controller
            control={control}
            name="esicState"
            render={({ field }) => (
              <Combobox
                className="w-full"
                value={field.value}
                onChange={(value) => changeEsicState(value, field.onChange)}
                options={stateOptions}
                placeholder="Select State"
                searchPlaceholder="Search state"
              />
            )}
          />
        </Field>
        <Field label="ESIC District" error={errors.esicDistrict?.message}>
          <Controller
            control={control}
            name="esicDistrict"
            render={({ field }) => (
              <Combobox
                className="w-full"
                value={field.value}
                onChange={field.onChange}
                options={esicDistrictOptions}
                placeholder="Select District"
                searchPlaceholder="Search district"
              />
            )}
          />
        </Field>
        <Field label="ESIC Office Address" error={errors.esicOfficeAddress?.message}>
          <Input placeholder="ESIC Office Address" {...register('esicOfficeAddress')} />
        </Field>
        <Field label="ESIC Username" error={errors.esicUsername?.message}>
          <Input placeholder="ESIC Username" {...register('esicUsername')} />
        </Field>
        <Field label="ESIC Password" error={errors.esicPassword?.message}>
          <PasswordInput
            autoComplete="new-password"
            placeholder="ESIC Password"
            {...register('esicPassword')}
          />
        </Field>
      </ActCard>

      {/* Factory act */}
      <ActCard
        icon={Building2}
        title="Factory Act Settings"
        tone="border-rose-500/20 bg-rose-500/5"
        iconTone="text-rose-600 dark:text-rose-400"
      >
        <DateField
          control={control}
          name="factoryActDate"
          label="Factory Act Date"
          error={errors.factoryActDate?.message}
        />
        <Field
          label="Factory License Number"
          error={errors.factoryLicenseNumber?.message}
        >
          <Input
            placeholder="Factory License Number"
            {...register('factoryLicenseNumber')}
          />
        </Field>
        <Field label="Factory FIN Number" error={errors.factoryFinNumber?.message}>
          <Input placeholder="Factory FIN Number" {...register('factoryFinNumber')} />
        </Field>
        <Field label="No. of Employees" error={errors.employeeCount?.message}>
          <Input
            inputMode="numeric"
            placeholder="No. of Employees"
            {...register('employeeCount')}
          />
        </Field>
        <Field label="Electric Horse Power" error={errors.electricHorsePower?.message}>
          <Input
            placeholder="Electric Horse Power"
            {...register('electricHorsePower')}
          />
        </Field>
        <DateField
          control={control}
          name="licenseExpiryDate"
          label="License Expiry Date"
          error={errors.licenseExpiryDate?.message}
        />
        <DateField
          control={control}
          name="stabilityExpiryDate"
          label="Stability Expiry Date"
          error={errors.stabilityExpiryDate?.message}
        />
      </ActCard>

      {/* Professional tax act */}
      <ActCard
        icon={IndianRupee}
        title="Professional Tax Act Settings"
        tone="border-violet-500/20 bg-violet-500/5"
        iconTone="text-violet-600 dark:text-violet-400"
      >
        <DateField
          control={control}
          name="ptRegistrationDate"
          label="PT Registration Date"
          error={errors.ptRegistrationDate?.message}
        />
        <Field
          label="PEC Registration Number"
          error={errors.pecRegistrationNumber?.message}
        >
          <Input
            placeholder="PEC Registration Number"
            {...register('pecRegistrationNumber')}
          />
        </Field>
        <Field
          label="PRC Registration Number"
          error={errors.prcRegistrationNumber?.message}
        >
          <Input
            placeholder="PRC Registration Number"
            {...register('prcRegistrationNumber')}
          />
        </Field>
        <Field
          label="Corporation / Gram Panchayat Name"
          error={errors.corporationName?.message}
        >
          <Input
            placeholder="Corporation / Gram Panchayat Name"
            {...register('corporationName')}
          />
        </Field>
      </ActCard>

      {/* LWF act */}
      <ActCard
        icon={Briefcase}
        title="LWF Act Settings"
        tone="border-amber-500/20 bg-amber-500/5"
        iconTone="text-amber-600 dark:text-amber-400"
      >
        <DateField
          control={control}
          name="lwfRegistrationDate"
          label="LWF Registration Date"
          error={errors.lwfRegistrationDate?.message}
        />
        <Field
          label="LWF Registration Number"
          error={errors.lwfRegistrationNumber?.message}
        >
          <Input
            placeholder="LWF Registration Number"
            {...register('lwfRegistrationNumber')}
          />
        </Field>
        <Field label="LWF Office Address ID" error={errors.lwfOfficeAddressId?.message}>
          <Input
            placeholder="LWF Office Address ID"
            {...register('lwfOfficeAddressId')}
          />
        </Field>
        <Field label="LWF Username" error={errors.lwfUsername?.message}>
          <Input placeholder="LWF Username" {...register('lwfUsername')} />
        </Field>
        <Field label="LWF Password" error={errors.lwfPassword?.message}>
          <PasswordInput
            autoComplete="new-password"
            placeholder="LWF Password"
            {...register('lwfPassword')}
          />
        </Field>
      </ActCard>

      {/* Employment exchange act */}
      <ActCard
        icon={UserRoundSearch}
        title="Employment Exchange Act Settings"
        tone="border-sky-500/20 bg-sky-500/5"
        iconTone="text-sky-600 dark:text-sky-400"
      >
        <DateField
          control={control}
          name="eeRegistrationDate"
          label="Registration Date"
          error={errors.eeRegistrationDate?.message}
        />
        <Field label="Registration Number" error={errors.eeRegistrationNumber?.message}>
          <Input
            placeholder="Registration Number"
            {...register('eeRegistrationNumber')}
          />
        </Field>
      </ActCard>
    </div>
  )
}
