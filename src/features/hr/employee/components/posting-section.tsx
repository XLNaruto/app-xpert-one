import { useEffect } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { Briefcase } from 'lucide-react'
import { Field } from '@/components/common/form-field'
import { FormSection } from '@/components/common/form-section'
import { DateField } from '@/components/common/date-field'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import {
  CONTRACT_PERIOD_TYPE_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  GRADE_OPTIONS,
  PERMANENT_EMPLOYMENT_TYPE,
} from '../constants'
import type { PostingOptions } from '../hooks/use-posting-options'

/**
 * The fields that make up one posting — where the employee sits and on what
 * terms. Shared by step 1's Service section, step 8's transfer dialog and its
 * restricted edit, because all three write the same `employee_service` shape.
 *
 * It reads the form off `useFormContext`, so each host wraps its form in a
 * `<FormProvider>` and passes nothing but the dropdown options. That's what lets
 * one component serve three differently-shaped forms: they differ in what
 * surrounds these fields, never in the fields themselves.
 */
export interface PostingSectionValues {
  branchId: string
  departmentId: string
  designationId: string
  grade: string
  employmentType: string
  contractPeriod: string
  contractPeriodType: string
  joiningDate: string
  confirmationDate: string
  renewalDate: string
}

export function PostingSection({
  options,
  /** Hide the heading when the host already provides one (a dialog, typically). */
  showHeading = true,
  /**
   * Hide the joining, confirmation and renewal dates. The restricted edit is a
   * correction of *where* the posting sits, not of when it ran — its dates stay
   * as the record holds them and travel back to the API untouched.
   */
  showDates = true,
}: {
  options: PostingOptions
  showHeading?: boolean
  showDates?: boolean
}) {
  const {
    register,
    control,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useFormContext<PostingSectionValues>()

  const employmentType = watch('employmentType')
  const joiningDate = watch('joiningDate')
  const confirmationDate = watch('confirmationDate')
  const renewalDate = watch('renewalDate')

  /*
   * Confirmation and renewal only make sense from the joining date onward, so a
   * joining date moved past them drags them along rather than leaving the form
   * in a state the user has to repair by hand.
   */
  useEffect(() => {
    if (!showDates || !joiningDate) return
    if (confirmationDate && confirmationDate < joiningDate) {
      setValue('confirmationDate', joiningDate, { shouldValidate: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joiningDate])

  /*
   * Those two are validated *against* the joining date, but a resolver-backed
   * form refreshes the error of the field that just changed and no other. So
   * moving the joining date up to meet a confirmation date leaves that field
   * still showing "cannot be before the joining date" against two dates that now
   * match. Re-check the dependants whenever any of the three moves — including
   * the dependant itself, since the value written above lands a render later
   * than the joining date that prompted it.
   */
  useEffect(() => {
    const stale = (['confirmationDate', 'renewalDate'] as const).filter(
      (name) => errors[name],
    )
    if (stale.length) void trigger(stale)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joiningDate, confirmationDate, renewalDate])
  // A permanent posting has no period to run out, so the contract block and the
  // renewal date have nothing to say — and the mappers drop them from the body.
  const isContractual = employmentType !== PERMANENT_EMPLOYMENT_TYPE

  const placeholder = options.isLoading ? 'Loading…' : undefined

  return (
    <>
      {showHeading && (
        <FormSection
          icon={Briefcase}
          title="Service Details"
          description="Where the employee is posted and on what terms"
        />
      )}

      <Field label="Branch" error={errors.branchId?.message}>
        <Controller
          control={control}
          name="branchId"
          render={({ field }) => (
            <Combobox
              className="w-full"
              clearable
              value={field.value}
              onChange={(next) => {
                field.onChange(next)
                // Departments are listed per branch, so the chosen one may not
                // belong to the new branch any more.
                setValue('departmentId', '')
              }}
              options={options.branches}
              placeholder={placeholder ?? 'Select branch'}
              searchPlaceholder="Search branch"
            />
          )}
        />
      </Field>

      <Field
        label="Department"
        error={errors.departmentId?.message}
        hint="Only departments of the chosen branch are listed, plus any that belong to the company as a whole."
      >
        <Controller
          control={control}
          name="departmentId"
          render={({ field }) => (
            <Combobox
              className="w-full"
              clearable
              value={field.value}
              onChange={field.onChange}
              options={options.departments}
              placeholder={placeholder ?? 'Select department'}
              searchPlaceholder="Search department"
            />
          )}
        />
      </Field>

      <Field
        label="Designation"
        required
        error={errors.designationId?.message}
        hint="The wage structure comes from the designation — it isn't stored per employee."
      >
        <Controller
          control={control}
          name="designationId"
          render={({ field }) => (
            <Combobox
              className="w-full"
              value={field.value}
              onChange={field.onChange}
              options={options.designations}
              placeholder={placeholder ?? 'Select designation'}
              searchPlaceholder="Search designation"
            />
          )}
        />
      </Field>

      <Field label="Grade" required error={errors.grade?.message}>
        <Controller
          control={control}
          name="grade"
          render={({ field }) => (
            <Combobox
              className="w-full"
              searchable={false}
              value={field.value}
              onChange={field.onChange}
              options={GRADE_OPTIONS}
              placeholder="Select grade"
            />
          )}
        />
      </Field>

      <Field label="Employment Type" required error={errors.employmentType?.message}>
        <Controller
          control={control}
          name="employmentType"
          render={({ field }) => (
            <Combobox
              className="w-full"
              searchable={false}
              value={field.value}
              onChange={field.onChange}
              options={EMPLOYMENT_TYPE_OPTIONS}
              placeholder="Select employment type"
            />
          )}
        />
      </Field>

      {isContractual && (
        <Field
          label="Contract Period"
          required
          error={errors.contractPeriod?.message ?? errors.contractPeriodType?.message}
        >
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              placeholder="e.g. 1"
              className="flex-1"
              aria-invalid={errors.contractPeriod ? true : undefined}
              {...register('contractPeriod')}
            />
            <Controller
              control={control}
              name="contractPeriodType"
              render={({ field }) => (
                <Combobox
                  className="w-28 shrink-0"
                  searchable={false}
                  value={field.value}
                  onChange={field.onChange}
                  options={CONTRACT_PERIOD_TYPE_OPTIONS}
                />
              )}
            />
          </div>
        </Field>
      )}

      {showDates && (
        <>
          <DateField
            control={control}
            name="joiningDate"
            label="Joining Date"
            required
            error={errors.joiningDate?.message}
          />

          <DateField
            control={control}
            name="confirmationDate"
            label="Confirmation Date"
            required
            error={errors.confirmationDate?.message}
            // Confirmation is an event within the posting, so it can't precede its start.
            minDate={joiningDate ? new Date(`${joiningDate}T00:00:00`) : undefined}
          />

          {isContractual && (
            <DateField
              control={control}
              name="renewalDate"
              label="Renewal Date"
              required
              error={errors.renewalDate?.message}
              hint="Filled in from the joining date and the contract period — override it if the contract says otherwise."
              minDate={joiningDate ? new Date(`${joiningDate}T00:00:00`) : undefined}
            />
          )}
        </>
      )}
    </>
  )
}
