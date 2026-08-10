import { Controller } from 'react-hook-form'
import { ArrowLeft, Building2, Clock, Lock, MapPin, Phone } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Forbidden } from '@/features/error'
import { CompanyShiftTab } from '@/features/master/shift'
import { YEAR_OPTIONS } from '../constants'
import { CompanyLogoField } from '../components/company-logo-field'
import { useCompanyForm, type CompanyFormTab } from '../hooks/use-company-form'

interface CompanyCreatePageProps {
  /**
   * Encrypted company id from the `?data=` search param. When present the page
   * switches to edit mode (GET to seed, PATCH to save); otherwise it's a fresh
   * create. The same page and form handle both.
   */
  data?: string
}

/**
 * Create/edit a company record. One screen for both: a `?data=` token edits the
 * record it carries (hydrates the form + updates on submit), no token creates a
 * new one.
 */
export function CompanyCreatePage({ data }: CompanyCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const companyId = decryptId(data)

  const {
    register,
    control,
    errors,
    tab,
    selectTab,
    canEditShifts,
    companyId: savedCompanyId,
    state,
    district,
    hasState,
    changeState,
    onSubmit,
    isEdit,
    isPending,
    isUploadingLogo,
    logoFile,
    pickLogoFile,
    isLoading,
    isError,
    loadError,
    isForbidden,
    forbiddenMessage,
    goToList,
  } = useCompanyForm(companyId)

  // Reading this record was refused — show the 403 screen, not a broken form.
  if (isForbidden) {
    return <Forbidden description={forbiddenMessage} />
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Company' : 'Add New Company'}
        description={isEdit ? 'Update this company record' : 'Create a new company record'}
        actions={
          <Button variant="outline" onClick={goToList}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">
              {loadError instanceof Error
                ? loadError.message
                : "Couldn't load this company."}
            </p>
          ) : (
            <Tabs
              value={tab}
              onValueChange={(value) => selectTab(value as CompanyFormTab)}
            >
              <TabsList>
                <TabsTrigger value="detail">
                  <Building2 className="mr-1.5 size-4" />
                  Company Details
                </TabsTrigger>
                {/*
                  A shift is keyed by company id, so the tab stays shut until the
                  company has been saved. Locked rather than `disabled`: a
                  disabled trigger swallows the click, and a click that says
                  nothing is worse than one that says why.
                */}
                <TabsTrigger
                  value="shift"
                  className={canEditShifts ? undefined : 'text-muted-foreground'}
                >
                  {canEditShifts ? (
                    <Clock className="mr-1.5 size-4" />
                  ) : (
                    <Lock className="mr-1.5 size-4" />
                  )}
                  Shift
                </TabsTrigger>
              </TabsList>

              <TabsContent value="detail">
              <form
                onSubmit={onSubmit}
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
                {/* Full-width so the square picker isn't stretched by the grid. */}
                <Field
                  label="Logo"
                  error={errors.logo?.message}
                  className="col-span-full"
                >
                  <Controller
                    control={control}
                    name="logo"
                    render={({ field }) => (
                      <CompanyLogoField
                        value={field.value}
                        onChange={field.onChange}
                        pendingFile={logoFile}
                        onPickFile={pickLogoFile}
                        isUploading={isUploadingLogo}
                        disabled={isPending}
                      />
                    )}
                  />
                </Field>
                <Field label="Company Name" required error={errors.companyName?.message}>
                  <Input placeholder="Company Name" {...register('companyName')} />
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
                <Field
                  label="Registration Number"
                  error={errors.registrationNumber?.message}
                >
                  <Input
                    placeholder="Registration Number"
                    {...register('registrationNumber')}
                  />
                </Field>
                <Field label="GST Number" error={errors.gstNumber?.message}>
                  <Input
                    placeholder="GST Number"
                    className="uppercase placeholder:normal-case"
                    {...register('gstNumber')}
                  />
                </Field>
                <Field label="PAN Number" required error={errors.panNumber?.message}>
                  <Input
                    placeholder="PAN Number"
                    className="uppercase placeholder:normal-case"
                    {...register('panNumber')}
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

                {/* Contact Details */}
                <FormSection
                  icon={Phone}
                  title="Contact Details"
                  description="How to reach the company"
                />
                <Field label="Phone" error={errors.phone?.message}>
                  <Input placeholder="Phone" {...register('phone')} />
                </Field>
                <Field label="Primary Mobile Number" required error={errors.mobile1?.message}>
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
                <Field label="Email" required error={errors.email?.message}>
                  <Input type="email" placeholder="example@email.com" {...register('email')} />
                </Field>

                {/* Actions */}
                <div className="col-span-full mt-4 flex items-center justify-end gap-3 border-t border-border pt-5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goToList}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Company'}
                  </Button>
                </div>
              </form>
              </TabsContent>

              {/*
                The shift list is its own resource with its own saves, so it only
                mounts once the company id it hangs off is known.
              */}
              <TabsContent value="shift">
                {savedCompanyId !== undefined && (
                  <CompanyShiftTab companyId={savedCompanyId} />
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
