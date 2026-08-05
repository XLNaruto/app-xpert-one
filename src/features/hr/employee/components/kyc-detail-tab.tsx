import { Controller } from 'react-hook-form'
import { BadgeCheck, CarFront, Landmark, Plane, ShieldCheck } from 'lucide-react'
import { Field } from '@/components/common/form-field'
import { FormSection } from '@/components/common/form-section'
import { DateField } from '@/components/common/date-field'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Forbidden } from '@/features/error'
import { useEmployeeKycForm } from '../hooks/use-employee-kyc-form'

/**
 * Step 2 — KYC Detail: statutory numbers, the bank the salary is paid into, and
 * the identity documents on file.
 *
 * Aadhaar and the bank block are required client-side even though the API accepts
 * them empty — payroll can't be run without an account to credit or a number to
 * file returns against, and an employee saved without them fails much later, in
 * the payroll run, where the cause is far less obvious.
 */
export function KycDetailTab({
  employeeId,
  onSaved,
  onClose,
}: {
  employeeId: number
  onSaved: () => void
  onClose: () => void
}) {
  const {
    register,
    control,
    errors,
    bank,
    isPending,
    isLoading,
    isError,
    loadError,
    isForbidden,
    forbiddenMessage,
    onSubmit,
    onSubmitAndClose,
  } = useEmployeeKycForm({ employeeId, onSaved, onClose })

  if (isForbidden) return <Forbidden description={forbiddenMessage} />

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        {loadError instanceof Error
          ? loadError.message
          : "Couldn't load the KYC detail."}
      </p>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <FormSection
        icon={ShieldCheck}
        title="PF & Statutory Details"
        description="The numbers the PF and ESIC returns are filed against"
        className="mt-0"
      />

      <Field label="PF Number" error={errors.pfNumber?.message}>
        <Input placeholder="PF account number" {...register('pfNumber')} />
      </Field>

      <Field
        label="UAN Number"
        error={errors.uanNumber?.message}
        hint="The Universal Account Number — 12 digits, and the same across employers."
      >
        <Input
          inputMode="numeric"
          maxLength={12}
          placeholder="12-digit UAN"
          aria-invalid={errors.uanNumber ? true : undefined}
          {...register('uanNumber')}
        />
      </Field>

      <Field label="ESIC Number" error={errors.esicNumber?.message}>
        <Input
          inputMode="numeric"
          placeholder="ESIC insurance number"
          aria-invalid={errors.esicNumber ? true : undefined}
          {...register('esicNumber')}
        />
      </Field>

      <FormSection
        icon={Landmark}
        title="Bank Details"
        description="Where the salary is credited"
      />

      <Field label="Bank Name" required error={errors.bankId?.message}>
        <Controller
          control={control}
          name="bankId"
          render={({ field }) => (
            <Combobox
              className="w-full"
              value={field.value}
              onChange={field.onChange}
              options={bank.options}
              loading={bank.loading}
              onScrollEnd={bank.onScrollEnd}
              onSearchChange={bank.onSearchChange}
              placeholder="Select bank"
              searchPlaceholder="Search bank"
            />
          )}
        />
      </Field>

      <Field label="Account Number" required error={errors.bankAccountNumber?.message}>
        <Input
          inputMode="numeric"
          maxLength={18}
          placeholder="9 to 18 digits"
          aria-invalid={errors.bankAccountNumber ? true : undefined}
          {...register('bankAccountNumber')}
        />
      </Field>

      <Field label="Bank Branch" error={errors.bankBranchName?.message}>
        <Input placeholder="Branch name" {...register('bankBranchName')} />
      </Field>

      <Field
        label="IFSC Code"
        required
        error={errors.ifscCode?.message}
        hint="Four letters, a zero, then six characters — e.g. HDFC0001234."
      >
        <Input
          maxLength={11}
          placeholder="HDFC0001234"
          className="uppercase"
          aria-invalid={errors.ifscCode ? true : undefined}
          {...register('ifscCode')}
        />
      </Field>

      <FormSection
        icon={BadgeCheck}
        title="Identity Documents"
        description="Aadhaar, PAN and the rest of the identity file"
      />

      <Field label="Aadhaar Number" required error={errors.aadharNumber?.message}>
        <Input
          inputMode="numeric"
          maxLength={12}
          placeholder="12 digits"
          aria-invalid={errors.aadharNumber ? true : undefined}
          {...register('aadharNumber')}
        />
      </Field>

      <Field
        label="Name as per Aadhaar"
        required
        error={errors.nameAsPerAadhar?.message}
        hint="Recorded separately because statutory filings must match the Aadhaar spelling exactly."
      >
        <Input
          placeholder="Exactly as printed"
          aria-invalid={errors.nameAsPerAadhar ? true : undefined}
          {...register('nameAsPerAadhar')}
        />
      </Field>

      <Field label="PAN Number" error={errors.panNumber?.message}>
        <Input
          maxLength={10}
          placeholder="ABCDE1234F"
          className="uppercase"
          aria-invalid={errors.panNumber ? true : undefined}
          {...register('panNumber')}
        />
      </Field>

      <Field label="Voter ID (EPIC)" error={errors.epicNumber?.message}>
        <Input
          placeholder="EPIC number"
          className="uppercase"
          {...register('epicNumber')}
        />
      </Field>

      <Field label="Ration Card Number" error={errors.rationCardNumber?.message}>
        <Input placeholder="Ration card number" {...register('rationCardNumber')} />
      </Field>

      <FormSection icon={CarFront} title="Driving Licence" />

      <Field label="Licence Number" error={errors.drivingLicenceNumber?.message}>
        <Input
          placeholder="Licence number"
          className="uppercase"
          aria-invalid={errors.drivingLicenceNumber ? true : undefined}
          {...register('drivingLicenceNumber')}
        />
      </Field>

      <DateField
        control={control}
        name="drivingLicenceExpiryDate"
        label="Expiry Date"
        error={errors.drivingLicenceExpiryDate?.message}
      />

      <FormSection icon={Plane} title="Passport Details" />

      <Field label="Passport Number" error={errors.passportNumber?.message}>
        <Input
          maxLength={8}
          placeholder="A1234567"
          className="uppercase"
          aria-invalid={errors.passportNumber ? true : undefined}
          {...register('passportNumber')}
        />
      </Field>

      <DateField
        control={control}
        name="passportValidFrom"
        label="Valid From"
        error={errors.passportValidFrom?.message}
      />

      <DateField
        control={control}
        name="passportValidTo"
        label="Valid To"
        error={errors.passportValidTo?.message}
      />

      <div className="col-span-full mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onSubmitAndClose}
          disabled={isPending}
        >
          {isPending ? 'Saving…' : 'Save & Close'}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save & Continue'}
        </Button>
      </div>
    </form>
  )
}
