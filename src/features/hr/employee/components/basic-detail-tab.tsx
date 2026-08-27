import { Controller, FormProvider, useWatch } from 'react-hook-form'
import {
  DoorOpen,
  HeartPulse,
  Home,
  MapPin,
  MessageSquare,
  Phone,
  UserRound,
} from 'lucide-react'
import { Field } from '@/components/common/form-field'
import { FormSection } from '@/components/common/form-section'
import { DateField } from '@/components/common/date-field'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  BLOOD_GROUP_OPTIONS,
  GENDER_OPTIONS,
  HEIGHT_UNIT_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  MINIMUM_EMPLOYEE_AGE,
  PREFIX_OPTIONS,
  RELATION_OPTIONS,
  WEIGHT_UNIT_OPTIONS,
} from '../constants'
import { useEmployeeBasicForm } from '../hooks/use-employee-basic-form'
import { ContractDatesSync, SameAsCurrentMirror } from './basic-detail-sync'
import { AddressBlock } from './address-block'
import {
  CURRENT_ADDRESS_FIELDS,
  PERMANENT_ADDRESS_FIELDS,
} from '../lib/address-fields'
import { EmployeePhotoField } from './employee-photo-field'
import { PostingSection } from './posting-section'
import { StepFormFooter } from './step-form-footer'
import type { Employee } from '../types'

/**
 * Step 1 — Basic Detail.
 *
 * The one step that creates something: `POST /user/employees` establishes the
 * person *and* their first posting in one call, which is why the Service section
 * lives on this form rather than only in the transfer tab. Everything after this
 * step is addressed by the id that save returns.
 *
 * Editing here writes onto the *current* posting in place. A genuine move — a
 * different company, branch, department or designation — belongs in Transfer
 * History, which closes the old posting instead of overwriting it; the note under
 * the Service heading says so, because overwriting is the mistake this screen
 * makes easy.
 */
export function BasicDetailTab({
  employee,
  onCreated,
  onSaved,
  onBack,
}: {
  employee: Employee | undefined
  onCreated: (id: number) => void
  onSaved: () => void
  onBack: () => void
}) {
  const {
    form,
    register,
    control,
    errors,
    isEdit,
    isPending,
    isUploadingPhoto,
    photoFile,
    pickPhotoFile,
    sameAsCurrent,
    currentState,
    currentDistrict,
    permanentState,
    permanentDistrict,
    changeCurrentState,
    changePermanentState,
    hasCurrentState,
    hasPermanentState,
    postingOptions,
    onSubmit,
  } = useEmployeeBasicForm({ employee, onCreated, onSaved })

  // Subscribed by name rather than through `form.watch`, which subscribes this
  // component — the whole step — to the form's value stream.
  const photo = useWatch({ control, name: 'photo' })

  /** Newest date of birth that clears the minimum-age rule. */
  const maxBirthDate = new Date()
  maxBirthDate.setFullYear(maxBirthDate.getFullYear() - MINIMUM_EMPLOYEE_AGE)

  return (
    <FormProvider {...form}>
      {/* Headless: they watch their own fields and render nothing. */}
      <SameAsCurrentMirror />
      <ContractDatesSync />
      <form onSubmit={onSubmit} noValidate>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <FormSection
            icon={UserRound}
            title="Personal Details"
            description="Who the employee is"
            className="mt-0"
          />

          <div className="col-span-full">
            <EmployeePhotoField
              value={photo}
              onChange={(key) => form.setValue('photo', key)}
              pendingFile={photoFile}
              onPickFile={pickPhotoFile}
              isUploading={isUploadingPhoto}
            />
          </div>

          <Field
            label="Employee Name"
            required
            error={errors.prefix?.message ?? errors.name?.message}
          >
            {/* One control, two inputs: the prefix trigger and the name field
                share an edge, so the pair reads as a single bordered box. */}
            <div className="flex">
              <Controller
                control={control}
                name="prefix"
                render={({ field }) => (
                  <Combobox
                    className="w-18 shrink-0"
                    triggerClassName="rounded-r-none border-r-0 pr-2"
                    searchable={false}
                    value={field.value}
                    onChange={field.onChange}
                    options={PREFIX_OPTIONS}
                    placeholder="Mr"
                  />
                )}
              />
              <Input
                placeholder="Full name"
                className="flex-1 rounded-l-none"
                aria-invalid={errors.name ? true : undefined}
                {...register('name')}
              />
            </div>
          </Field>

          <Field label="Gender" required error={errors.gender?.message}>
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <Combobox
                  className="w-full"
                  searchable={false}
                  value={field.value}
                  onChange={field.onChange}
                  options={GENDER_OPTIONS}
                  placeholder="Select gender"
                />
              )}
            />
          </Field>

          <DateField
            control={control}
            name="birthDate"
            label="Date of Birth"
            required
            error={errors.birthDate?.message}
            hint={`An employee must be at least ${MINIMUM_EMPLOYEE_AGE} years old.`}
            maxDate={maxBirthDate}
          />

          <Field label="Marital Status" required error={errors.maritalStatus?.message}>
            <Controller
              control={control}
              name="maritalStatus"
              render={({ field }) => (
                <Combobox
                  className="w-full"
                  searchable={false}
                  value={field.value}
                  onChange={field.onChange}
                  options={MARITAL_STATUS_OPTIONS}
                  placeholder="Select marital status"
                />
              )}
            />
          </Field>

          {/* The relation only ever qualifies the name beside it, so the two
              share an edge and read as one control — as with the prefix. */}
          <Field
            label="Relative Name"
            required
            error={errors.relation?.message ?? errors.relativeName?.message}
          >
            <div className="flex">
              <Controller
                control={control}
                name="relation"
                render={({ field }) => (
                  <Combobox
                    className="w-28 shrink-0"
                    triggerClassName="rounded-r-none border-r-0 pr-2"
                    value={field.value}
                    onChange={field.onChange}
                    options={RELATION_OPTIONS}
                    placeholder="Relation"
                    searchPlaceholder="Search relation"
                    panelMinWidth={200}
                  />
                )}
              />
              <Input
                placeholder="Father's / husband's name"
                className="flex-1 rounded-l-none"
                aria-invalid={errors.relativeName ? true : undefined}
                {...register('relativeName')}
              />
            </div>
          </Field>

          {/* ── Current address ─────────────────────────────────────────── */}

          <FormSection
            icon={Home}
            title="Current Address"
            description="Where the employee lives now"
          />

          <AddressBlock
            names={CURRENT_ADDRESS_FIELDS}
            control={control}
            register={register}
            errors={errors}
            state={currentState}
            district={currentDistrict}
            onStateChange={changeCurrentState}
            hasState={hasCurrentState}
            requireLine1
          />

          {/* ── Permanent address ───────────────────────────────────────── */}

          <FormSection
            icon={MapPin}
            title="Permanent Address"
            description="The employee's home address"
          />

          {/*
            The API stores both address sets, so this switch copies real values
            rather than setting a flag — see the mirror in `useEmployeeBasicForm`.
          */}
          <Field label="Same as current address" className="col-span-full">
            <Controller
              control={control}
              name="sameAsCurrent"
              render={({ field }) => (
                <div className="flex h-10 items-center gap-3">
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Permanent address is the same as the current address"
                  />
                  <span className="text-sm text-muted-foreground">
                    {field.value
                      ? 'Copied from the current address'
                      : 'Enter the permanent address separately'}
                  </span>
                </div>
              )}
            />
          </Field>

          {!sameAsCurrent && (
            <AddressBlock
              names={PERMANENT_ADDRESS_FIELDS}
              control={control}
              register={register}
              errors={errors}
              state={permanentState}
              district={permanentDistrict}
              onStateChange={changePermanentState}
              hasState={hasPermanentState}
            />
          )}

          {/* ── Contact ─────────────────────────────────────────────────── */}

          <FormSection
            icon={Phone}
            title="Contact Details"
            description="How the employee is reached"
          />

          <Field label="Mobile Number" required error={errors.mobileNumber1?.message}>
            <Input
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit mobile"
              aria-invalid={errors.mobileNumber1 ? true : undefined}
              {...register('mobileNumber1')}
            />
          </Field>

          <Field label="Alternate Mobile" error={errors.mobileNumber2?.message}>
            <Input
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit mobile"
              {...register('mobileNumber2')}
            />
          </Field>

          <Field label="Landline" error={errors.landlineNumber?.message}>
            <Input inputMode="numeric" placeholder="With STD code" {...register('landlineNumber')} />
          </Field>

          <Field label="Email" required error={errors.email?.message}>
            <Input type="email" placeholder="name@example.com" {...register('email')} />
          </Field>

          {/* ── Health ──────────────────────────────────────────────────── */}

          <FormSection
            icon={HeartPulse}
            title="Health Details"
            description="Recorded for statutory returns and site safety"
          />

          <Field label="Blood Group" error={errors.bloodGroup?.message}>
            <Controller
              control={control}
              name="bloodGroup"
              render={({ field }) => (
                <Combobox
                  className="w-full"
                  searchable={false}
                  value={field.value}
                  onChange={field.onChange}
                  options={BLOOD_GROUP_OPTIONS}
                  placeholder="Select blood group"
                />
              )}
            />
          </Field>

          <Field label="Height" error={errors.height?.message}>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                inputMode="decimal"
                placeholder="e.g. 170"
                aria-invalid={errors.height ? true : undefined}
                {...register('height')}
              />
              <Controller
                control={control}
                name="heightUnit"
                render={({ field }) => (
                  <Combobox
                    className="w-32 shrink-0"
                    searchable={false}
                    value={field.value}
                    onChange={field.onChange}
                    options={HEIGHT_UNIT_OPTIONS}
                  />
                )}
              />
            </div>
          </Field>

          <Field label="Weight" error={errors.weight?.message}>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                inputMode="decimal"
                placeholder="e.g. 68"
                aria-invalid={errors.weight ? true : undefined}
                {...register('weight')}
              />
              <Controller
                control={control}
                name="weightUnit"
                render={({ field }) => (
                  <Combobox
                    className="w-28 shrink-0"
                    searchable={false}
                    value={field.value}
                    onChange={field.onChange}
                    options={WEIGHT_UNIT_OPTIONS}
                  />
                )}
              />
            </div>
          </Field>

          <Field label="Disability">
            <Controller
              control={control}
              name="isDisability"
              render={({ field }) => (
                <div className="flex h-10 items-center">
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Employee has a disability"
                  />
                </div>
              )}
            />
          </Field>

          {/* ── Service ─────────────────────────────────────────────────── */}

          <PostingSection options={postingOptions} />

          {isEdit && (
            <p className="col-span-full -mt-1 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
              Editing these fields rewrites the <strong>current</strong> posting.
              If the employee is actually moving branch, department or designation,
              use <strong>Employee Service History</strong> instead — it closes this
              posting and opens a new one, so the history survives.
            </p>
          )}

          <Field label="Police Verified">
            <Controller
              control={control}
              name="isPoliceVerified"
              render={({ field }) => (
                <div className="flex h-10 items-center">
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Police verification is on file"
                  />
                </div>
              )}
            />
          </Field>

          <Field label="Stamp Agreement">
            <Controller
              control={control}
              name="isStampAgreement"
              render={({ field }) => (
                <div className="flex h-10 items-center">
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Stamped agreement is on file"
                  />
                </div>
              )}
            />
          </Field>

          {/* ── Leaving ─────────────────────────────────────────────────── */}

          <FormSection
            icon={DoorOpen}
            title="Leaving Details"
            description="Only for correcting an exit already recorded — a real exit belongs in Service History"
          />

          <DateField
            control={control}
            name="leavingDate"
            label="Leaving Date"
            error={errors.leavingDate?.message}
          />

          <Field
            label="Leaving Reason"
            error={errors.leavingReason?.message}
            className="md:col-span-2"
          >
            <Input placeholder="Reason for leaving" {...register('leavingReason')} />
          </Field>

          {/* ── Remark ──────────────────────────────────────────────────── */}

          <FormSection icon={MessageSquare} title="Remark" />

          <Field label="Remarks" error={errors.remarks?.message} className="col-span-full">
            <Textarea rows={3} placeholder="Anything worth noting" {...register('remarks')} />
          </Field>

          <div className="col-span-full">
            <StepFormFooter
              onBack={onBack}
              isSaving={isPending}
              saveLabel={isEdit ? 'Save & Next' : 'Create & Next'}
            />
          </div>
        </div>
      </form>
    </FormProvider>
  )
}
