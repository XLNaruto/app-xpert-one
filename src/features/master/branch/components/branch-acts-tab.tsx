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

/**
 * The state/district pair an act carries, ready for its two comboboxes. Only
 * Professional Tax has one — every other act records the office it's registered
 * with and nothing more.
 */
interface ActGeography {
  districtOptions: ComboboxOption[]
  hasState: boolean
  /** Pick the state and clear its district — it may not exist under the new one. */
  changeState: (value: string, onChange: (value: string) => void) => void
}

interface BranchActsTabProps {
  register: UseFormRegister<BranchFormValues>
  control: Control<BranchFormValues>
  errors: FieldErrors<BranchFormValues>
  /** The state master, keyed by id — for the Professional Tax card. */
  stateOptions: ComboboxOption[]
  pt: ActGeography
  /** Offices of one statutory body, keyed by id. */
  pfOfficeOptions: ComboboxOption[]
  esicOfficeOptions: ComboboxOption[]
  factoryOfficeOptions: ComboboxOption[]
  lwfOfficeOptions: ComboboxOption[]
  exOfficeOptions: ComboboxOption[]
}

/**
 * "Applicable Acts" tab — the statutory registrations recorded per branch,
 * saved to `/user/act-registrations` as one row.
 *
 * Offices are references: each dropdown lists only the offices of its own body,
 * out of the office-address master.
 */
export function BranchActsTab({
  register,
  control,
  errors,
  stateOptions,
  pt,
  pfOfficeOptions,
  esicOfficeOptions,
  factoryOfficeOptions,
  lwfOfficeOptions,
  exOfficeOptions,
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
        <Field label="PF Office Address" error={errors.pfOfficeAddressId?.message}>
          <Controller
            control={control}
            name="pfOfficeAddressId"
            render={({ field }) => (
              <Combobox
                className="w-full"
                value={field.value}
                onChange={field.onChange}
                options={pfOfficeOptions}
                placeholder="Select PF Office"
                searchPlaceholder="Search office"
              />
            )}
          />
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
        <Field label="ESIC Office Address" error={errors.esicOfficeAddressId?.message}>
          <Controller
            control={control}
            name="esicOfficeAddressId"
            render={({ field }) => (
              <Combobox
                className="w-full"
                value={field.value}
                onChange={field.onChange}
                options={esicOfficeOptions}
                placeholder="Select ESIC Office"
                searchPlaceholder="Search office"
              />
            )}
          />
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
        <Field label="No. of Employees" error={errors.noOfEmployees?.message}>
          <Input
            inputMode="numeric"
            placeholder="No. of Employees"
            {...register('noOfEmployees')}
          />
        </Field>
        <Field label="Electric Horse Power" error={errors.electricHorsePower?.message}>
          <Input
            inputMode="numeric"
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
        <Field
          label="Factory Office Address"
          error={errors.factoryOfficeAddressId?.message}
        >
          <Controller
            control={control}
            name="factoryOfficeAddressId"
            render={({ field }) => (
              <Combobox
                className="w-full"
                value={field.value}
                onChange={field.onChange}
                options={factoryOfficeOptions}
                placeholder="Select Factory Office"
                searchPlaceholder="Search office"
              />
            )}
          />
        </Field>
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
          error={errors.ptPecRegistrationNumber?.message}
        >
          <Input
            placeholder="PEC Registration Number"
            {...register('ptPecRegistrationNumber')}
          />
        </Field>
        <Field
          label="PRC Registration Number"
          error={errors.ptPrcRegistrationNumber?.message}
        >
          <Input
            placeholder="PRC Registration Number"
            {...register('ptPrcRegistrationNumber')}
          />
        </Field>
        <Field
          label="Corporation / Gram Panchayat Name"
          error={errors.ptCorporationName?.message}
        >
          <Input
            placeholder="Corporation / Gram Panchayat Name"
            {...register('ptCorporationName')}
          />
        </Field>
        <Field label="PT State" error={errors.ptStateId?.message}>
          <Controller
            control={control}
            name="ptStateId"
            render={({ field }) => (
              <Combobox
                className="w-full"
                value={field.value}
                onChange={(value) => pt.changeState(value, field.onChange)}
                options={stateOptions}
                placeholder="Select State"
                searchPlaceholder="Search state"
              />
            )}
          />
        </Field>
        <Field label="PT District" error={errors.ptDistrictId?.message}>
          <Controller
            control={control}
            name="ptDistrictId"
            render={({ field }) => (
              <Combobox
                className="w-full"
                value={field.value}
                onChange={field.onChange}
                options={pt.districtOptions}
                placeholder={pt.hasState ? 'Select District' : 'Select a state first'}
                searchPlaceholder="Search district"
              />
            )}
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
        <Field label="LWF Office Address" error={errors.lwfOfficeAddressId?.message}>
          <Controller
            control={control}
            name="lwfOfficeAddressId"
            render={({ field }) => (
              <Combobox
                className="w-full"
                value={field.value}
                onChange={field.onChange}
                options={lwfOfficeOptions}
                placeholder="Select LWF Office"
                searchPlaceholder="Search office"
              />
            )}
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
          name="exRegistrationDate"
          label="Registration Date"
          error={errors.exRegistrationDate?.message}
        />
        <Field label="Registration Number" error={errors.exRegistrationNumber?.message}>
          <Input
            placeholder="Registration Number"
            {...register('exRegistrationNumber')}
          />
        </Field>
        <Field label="Office Address" error={errors.exOfficeAddressId?.message}>
          <Controller
            control={control}
            name="exOfficeAddressId"
            render={({ field }) => (
              <Combobox
                className="w-full"
                value={field.value}
                onChange={field.onChange}
                options={exOfficeOptions}
                placeholder="Select Office"
                searchPlaceholder="Search office"
              />
            )}
          />
        </Field>
      </ActCard>
    </div>
  )
}
