import { Controller } from 'react-hook-form'
import { parseISO } from 'date-fns'
import { Briefcase, GraduationCap } from 'lucide-react'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { MonthPicker } from '@/components/ui/month-picker'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { YearPicker } from '@/components/ui/year-picker'
import { Field } from '@/components/common/form-field'
import { Forbidden } from '@/features/error'
import { EARLIEST_PASSING_DATE, EXPERIENCE_CTC_TYPE_OPTIONS } from '../constants'
import { useEmployeeEducationTab } from '../hooks/use-employee-education-tab'
import { RepeatCard, RepeatCardBadge, RepeatSection } from './repeat-card'
import { StepFormFooter } from './step-form-footer'

/**
 * Step 5 — Education / Experience: two card lists on one screen, saved together.
 *
 * The experience dates are **months, not dates** — the API takes and returns
 * `YYYY-MM` and rejects a full date — so those two fields use a month picker.
 * That's honest about the data too: nobody remembers the day they left a job four
 * employers ago.
 *
 * **The verification block** is one statement, not two controls: the switch is
 * what authorises a remark, so the textarea stays disabled until it's on and is
 * cleared when it goes off. The API enforces the same pairing with a CHECK, and it
 * stamps the verifier itself — the form never sends one.
 *
 * **Is Fresher** hides the experience half rather than disabling it, and on save it
 * clears anything already recorded there. The switch has no column behind it: an
 * employee with no experience rows *is* a fresher, which is why it opens on for
 * exactly those employees.
 */
/**
 * A `yyyy-MM` form value as the first day of that month, for the month
 * pickers' `minDate`/`maxDate`. `undefined` while the field is empty or
 * half-typed, so the bound stays open until the other end is a real month.
 */
function monthStart(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const parsed = parseISO(`${value}-01`)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

export function EducationExperienceTab({
  employeeId,
  onContinue,
  onBack,
}: {
  employeeId: number
  onContinue: () => void
  onBack: () => void
}) {
  const {
    form,
    educationFields,
    experienceFields,
    addEducation,
    removeEducation,
    addExperience,
    removeExperience,
    isFresher,
    isLoading,
    isError,
    error,
    isForbidden,
    forbiddenMessage,
    onSubmit,
    isSaving,
  } = useEmployeeEducationTab({ employeeId, onSaved: onContinue })

  if (isForbidden) return <Forbidden description={forbiddenMessage} />

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error instanceof Error
          ? error.message
          : "Couldn't load education & experience."}
      </p>
    )
  }

  const educationErrors = form.formState.errors.educations
  const experienceErrors = form.formState.errors.experiences

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <RepeatSection
        first
        icon={GraduationCap}
        title="Education Details"
        count={educationFields.length}
        addLabel="Add"
        onAdd={addEducation}
      >
        {educationFields.map((field, index) => {
          const errors = educationErrors?.[index]
          const row = form.watch(`educations.${index}`)

          return (
            <RepeatCard
              key={field.id}
              index={index}
              title={row?.educationName?.trim() || `Education ${index + 1}`}
              badge={
                row?.passingYear ? (
                  <RepeatCardBadge>{row.passingYear}</RepeatCardBadge>
                ) : undefined
              }
              hasError={Boolean(errors)}
              onRemove={() => removeEducation(index)}
              canRemove={educationFields.length > 1 || Boolean(row?.id)}
            >
              <Field
                label="Education Name"
                required
                error={errors?.educationName?.message}
              >
                <Input
                  placeholder="Education Name"
                  aria-invalid={errors?.educationName ? true : undefined}
                  {...form.register(`educations.${index}.educationName`)}
                />
              </Field>

              <Field label="Board / University" error={errors?.board?.message}>
                <Input
                  placeholder="Select Board / University"
                  {...form.register(`educations.${index}.board`)}
                />
              </Field>

              {/* A year, not a date — the calendar opens on decade tiles. */}
              <Field label="Passing Year" required error={errors?.passingYear?.message}>
                <Controller
                  control={form.control}
                  name={`educations.${index}.passingYear`}
                  render={({ field: year }) => (
                    <YearPicker
                      value={year.value}
                      onChange={year.onChange}
                      minDate={EARLIEST_PASSING_DATE}
                      maxDate={new Date()}
                      invalid={Boolean(errors?.passingYear)}
                    />
                  )}
                />
              </Field>

              <Field label="Percentage" error={errors?.percentage?.message}>
                <Input
                  inputMode="decimal"
                  placeholder="Percentage"
                  aria-invalid={errors?.percentage ? true : undefined}
                  {...form.register(`educations.${index}.percentage`)}
                />
              </Field>
            </RepeatCard>
          )
        })}
      </RepeatSection>

      <RepeatSection
        icon={Briefcase}
        title="Experience Details"
        count={experienceFields.length}
        addLabel="Add"
        onAdd={addExperience}
        collapsed={isFresher}
        collapsedMessage="Marked as a fresher — no prior employment is recorded. Any experience already on the record is removed when you save."
        headerExtra={
          <Controller
            control={form.control}
            name="isFresher"
            render={({ field: fresher }) => (
              <label className="flex cursor-pointer items-center gap-2.5">
                <span className="text-sm text-foreground/90">Is Fresher</span>
                <Switch
                  checked={fresher.value}
                  onCheckedChange={fresher.onChange}
                  aria-label="Employee is a fresher with no prior employment"
                />
              </label>
            )}
          />
        }
      >
        {experienceFields.map((field, index) => {
          const errors = experienceErrors?.[index]
          const row = form.watch(`experiences.${index}`)

          return (
            <RepeatCard
              key={field.id}
              index={index}
              title={row?.companyName?.trim() || `Experience ${index + 1}`}
              badge={
                row?.designation ? (
                  <RepeatCardBadge>{row.designation}</RepeatCardBadge>
                ) : undefined
              }
              hasError={Boolean(errors)}
              onRemove={() => removeExperience(index)}
              canRemove={experienceFields.length > 1 || Boolean(row?.id)}
            >
              <Field label="Company Name" required error={errors?.companyName?.message}>
                <Input
                  placeholder="Company Name"
                  aria-invalid={errors?.companyName ? true : undefined}
                  {...form.register(`experiences.${index}.companyName`)}
                />
              </Field>

              {/* Months, not dates — the endpoint stores no day for prior employment. */}
              <Field label="From Date" required error={errors?.fromDate?.message}>
                <Controller
                  control={form.control}
                  name={`experiences.${index}.fromDate`}
                  render={({ field: from }) => (
                    <MonthPicker
                      value={from.value}
                      onChange={from.onChange}
                      maxDate={monthStart(row?.toDate) ?? new Date()}
                      invalid={Boolean(errors?.fromDate)}
                    />
                  )}
                />
              </Field>

              <Field label="To Date" required error={errors?.toDate?.message}>
                <Controller
                  control={form.control}
                  name={`experiences.${index}.toDate`}
                  render={({ field: to }) => (
                    <MonthPicker
                      value={to.value}
                      onChange={to.onChange}
                      minDate={monthStart(row?.fromDate)}
                      maxDate={new Date()}
                      invalid={Boolean(errors?.toDate)}
                    />
                  )}
                />
              </Field>

              <Field label="Designation" required error={errors?.designation?.message}>
                <Input
                  placeholder="Designation"
                  aria-invalid={errors?.designation ? true : undefined}
                  {...form.register(`experiences.${index}.designation`)}
                />
              </Field>

              <Field label="Salary" error={errors?.salary?.message}>
                <Input
                  inputMode="decimal"
                  placeholder="Salary"
                  aria-invalid={errors?.salary ? true : undefined}
                  {...form.register(`experiences.${index}.salary`)}
                />
              </Field>

              {/*
                Nullable on the record: rows entered before this field existed
                don't say what the salary was quoted for, and defaulting to a guess
                would turn a blank into a claim.
              */}
              <Field label="Salary Is" error={errors?.ctcType?.message}>
                <Controller
                  control={form.control}
                  name={`experiences.${index}.ctcType`}
                  render={({ field: ctc }) => (
                    <Combobox
                      className="w-full"
                      searchable={false}
                      value={ctc.value}
                      onChange={ctc.onChange}
                      options={EXPERIENCE_CTC_TYPE_OPTIONS}
                      placeholder="Not stated"
                    />
                  )}
                />
              </Field>

              <Field
                label="Contact Person"
                error={errors?.contactPersonName?.message}
              >
                <Input
                  placeholder="Reference at that employer"
                  {...form.register(`experiences.${index}.contactPersonName`)}
                />
              </Field>

              <Field
                label="Contact Number"
                error={errors?.contactPersonNumber?.message}
              >
                <Input
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile"
                  aria-invalid={errors?.contactPersonNumber ? true : undefined}
                  {...form.register(`experiences.${index}.contactPersonNumber`)}
                />
              </Field>

              <Field
                label="Contact Email"
                error={errors?.contactPersonEmail?.message}
              >
                <Input
                  inputMode="email"
                  maxLength={255}
                  placeholder="verifier@employer.com"
                  aria-invalid={errors?.contactPersonEmail ? true : undefined}
                  {...form.register(`experiences.${index}.contactPersonEmail`)}
                />
              </Field>

              <Field
                label="Reason for Leaving"
                error={errors?.leavingReason?.message}
              >
                <Textarea
                  rows={2}
                  placeholder="Why the employee left"
                  {...form.register(`experiences.${index}.leavingReason`)}
                />
              </Field>

              {/* ── The verification block — switch, then remark ─────────── */}
              <div className="sm:col-span-2 rounded-lg border border-border bg-muted/30 p-3">
                <Controller
                  control={form.control}
                  name={`experiences.${index}.isVerified`}
                  render={({ field: verified }) => (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Verified with the verifier
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {verified.value
                            ? row?.verifiedByName
                              ? `Vouched for by ${row.verifiedByName}.`
                              : 'Saving stamps you as the verifier.'
                            : 'Turn this on once somebody has actually contacted the verifier.'}
                        </p>
                      </div>
                      <Switch
                        checked={verified.value}
                        onCheckedChange={(checked) => {
                          verified.onChange(checked)
                          /*
                            Turning it off clears the remark rather than hiding it:
                            the API rejects a review on an unverified row, and the
                            two only ever move together.
                          */
                          if (!checked) {
                            form.setValue(
                              `experiences.${index}.verificationReview`,
                              '',
                              { shouldValidate: true },
                            )
                          }
                        }}
                      />
                    </div>
                  )}
                />

                <div className="mt-3">
                  <Field
                    label="What the Verifier Said"
                    error={errors?.verificationReview?.message}
                  >
                    <Textarea
                      rows={2}
                      maxLength={2000}
                      disabled={!row?.isVerified}
                      placeholder={
                        row?.isVerified
                          ? 'What the verifier said about this employment'
                          : 'Available once the row is marked verified'
                      }
                      {...form.register(`experiences.${index}.verificationReview`)}
                    />
                  </Field>
                </div>
              </div>
            </RepeatCard>
          )
        })}
      </RepeatSection>

      <StepFormFooter
        onBack={onBack}
        isSaving={isSaving}
        hint="At least one qualification is required; extra blank cards are ignored."
      />
    </form>
  )
}
