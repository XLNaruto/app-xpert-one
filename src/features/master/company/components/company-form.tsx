import type { ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, MapPin, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormSection } from '@/components/common/form-section'
import { cn } from '@/lib/utils'
import { companySchema, type CompanyFormValues } from '../schemas'
import {
  EMPTY_COMPANY_FORM,
  STATE_OPTIONS,
  YEAR_OPTIONS,
  cityOptions,
} from '../constants'

interface CompanyFormProps {
  /** Initial values (edit) — falls back to a blank company when omitted. */
  defaultValues?: CompanyFormValues
  onSubmit: (values: CompanyFormValues) => void
  isPending?: boolean
  submitLabel?: string
  /** Called when the user cancels (usually navigate back). */
  onCancel?: () => void
}

/**
 * Create/edit form for a company master record. Owns its react-hook-form wiring
 * and mirrors the three sections of the spec: Company Information, Address
 * Details, Contact Details. Consumers supply the submit handler + pending state.
 */
export function CompanyForm({
  defaultValues,
  onSubmit,
  isPending = false,
  submitLabel = 'Save Company',
  onCancel,
}: CompanyFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: defaultValues ?? EMPTY_COMPANY_FORM,
  })

  const selectedState = watch('state')

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {/* Company Information */}
      <FormSection
        icon={Building2}
        title="Company Information"
        description="Identity and registration details"
        className="mt-0"
      />
      <Field label="Company Name" required error={errors.companyName?.message}>
        <Input placeholder="Company Name" {...register('companyName')} />
      </Field>
      <Field label="Company Code" required error={errors.companyCode?.message}>
        <Input placeholder="Company Code" {...register('companyCode')} />
      </Field>
      <Field label="Establish Year" required error={errors.establishYear?.message}>
        <Controller
          control={control}
          name="establishYear"
          render={({ field }) => (
            <Combobox
              className="w-full"
              value={field.value}
              onChange={field.onChange}
              options={YEAR_OPTIONS}
              placeholder="Select Year"
              searchPlaceholder="Search year"
            />
          )}
        />
      </Field>
      <Field label="Registration Number" error={errors.registrationNumber?.message}>
        <Input placeholder="Registration Number" {...register('registrationNumber')} />
      </Field>
      <Field label="PAN Number" required error={errors.panNumber?.message}>
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

      {/* Address Details */}
      <FormSection
        icon={MapPin}
        title="Address Details"
        description="Where the company is located"
      />
      <Field
        label="Address Line 1"
        required
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
      <Field label="State" required error={errors.state?.message}>
        <Controller
          control={control}
          name="state"
          render={({ field }) => (
            <Combobox
              className="w-full"
              value={field.value}
              onChange={(value) => {
                field.onChange(value)
                // The chosen city may not exist under the new state — reset it.
                setValue('city', '')
              }}
              options={STATE_OPTIONS}
              placeholder="Select State"
              searchPlaceholder="Search state"
            />
          )}
        />
      </Field>
      <Field label="City" error={errors.city?.message}>
        <Controller
          control={control}
          name="city"
          render={({ field }) => (
            <Combobox
              className="w-full"
              value={field.value}
              onChange={field.onChange}
              options={cityOptions(selectedState)}
              placeholder={selectedState ? 'Select City' : 'Select a state first'}
              searchPlaceholder="Search city"
            />
          )}
        />
      </Field>
      <Field label="Pin Code" error={errors.pinCode?.message}>
        <Input inputMode="numeric" maxLength={6} placeholder="Pin Code" {...register('pinCode')} />
      </Field>

      {/* Contact Details */}
      <FormSection
        icon={Phone}
        title="Contact Details"
        description="How to reach the company"
      />
      <Field label="Phone" error={errors.phone?.message}>
        <Input placeholder="Phone" {...register('phone')} />
      </Field>
      <Field label="Mobile Number 1" required error={errors.mobile1?.message}>
        <Input inputMode="numeric" maxLength={10} placeholder="Mobile Number 1" {...register('mobile1')} />
      </Field>
      <Field label="Mobile Number 2" error={errors.mobile2?.message}>
        <Input inputMode="numeric" maxLength={10} placeholder="Mobile Number 2" {...register('mobile2')} />
      </Field>
      <Field label="Email" required error={errors.email?.message}>
        <Input type="email" placeholder="example@email.com" {...register('email')} />
      </Field>

      {/* Actions */}
      <div className="col-span-full mt-4 flex items-center justify-end gap-3 border-t border-border pt-5">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

/** A labelled form field with an optional-marker, control slot, and error text. */
function Field({
  label,
  required = false,
  error,
  className,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-foreground/90">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
