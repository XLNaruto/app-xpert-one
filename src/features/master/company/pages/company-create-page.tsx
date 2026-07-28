import { Controller } from 'react-hook-form'
import { ArrowLeft, Building2, MapPin, Phone } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { STATE_OPTIONS, YEAR_OPTIONS } from '../constants'
import { useCompanyForm } from '../hooks/use-company-form'

interface CompanyCreatePageProps {
  /**
   * Encrypted company id from the `?data=` search param. When present the page
   * switches to edit mode (GET to seed, PUT to save); otherwise it's a fresh
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
    districtOptions,
    changeState,
    onSubmit,
    isEdit,
    isPending,
    isLoading,
    isError,
    loadError,
    goToList,
  } = useCompanyForm(companyId)

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
              <Field label="State" required error={errors.state?.message}>
                <Controller
                  control={control}
                  name="state"
                  render={({ field }) => (
                    <Combobox
                      className="w-full"
                      value={field.value}
                      onChange={(value) => changeState(value, field.onChange)}
                      options={STATE_OPTIONS}
                      placeholder="Select State"
                      searchPlaceholder="Search state"
                    />
                  )}
                />
              </Field>
              <Field label="District" error={errors.district?.message}>
                <Controller
                  control={control}
                  name="district"
                  render={({ field }) => (
                    <Combobox
                      className="w-full"
                      value={field.value}
                      onChange={field.onChange}
                      options={districtOptions}
                      placeholder="Select District"
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
