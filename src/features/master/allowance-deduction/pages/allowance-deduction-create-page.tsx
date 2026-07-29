import { Controller } from 'react-hook-form'
import { ArrowLeft, Wallet } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ALLOWANCE_DEDUCTION_LABELS, TYPE_OPTIONS } from '../constants'
import { useAllowanceDeductionForm } from '../hooks/use-allowance-deduction-form'

interface AllowanceDeductionCreatePageProps {
  /**
   * Encrypted record id from the `?data=` search param. When present the page
   * switches to edit mode; otherwise it's a fresh create.
   */
  data?: string
}

/**
 * Create/edit an allowance / deduction record. One screen for both: a `?data=`
 * token edits the record it carries, no token creates a new one.
 */
export function AllowanceDeductionCreatePage({
  data,
}: AllowanceDeductionCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const recordId = decryptId(data)

  const {
    register,
    control,
    errors,
    onSubmit,
    isEdit,
    isPending,
    isLoading,
    isError,
    loadError,
    goToList,
  } = useAllowanceDeductionForm(recordId)

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Allowance / Deduction' : 'Add Allowance / Deduction'}
        description="Configure allowance and deduction details."
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
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">
              {loadError instanceof Error
                ? loadError.message
                : "Couldn't load this record."}
            </p>
          ) : (
            <form
              onSubmit={onSubmit}
              noValidate
              className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <FormSection
                icon={Wallet}
                title="Allowance / Deduction Detail"
                description="Whether it adds to or subtracts from pay, and its identity"
                className="mt-0"
              />

              <Field
                label={ALLOWANCE_DEDUCTION_LABELS.type}
                required
                error={errors.type?.message}
              >
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Combobox
                      className="w-full"
                      value={field.value}
                      onChange={field.onChange}
                      options={TYPE_OPTIONS}
                      placeholder="Select"
                      searchPlaceholder="Search type"
                    />
                  )}
                />
              </Field>

              <Field
                label={ALLOWANCE_DEDUCTION_LABELS.name}
                required
                error={errors.name?.message}
              >
                <Input
                  placeholder={ALLOWANCE_DEDUCTION_LABELS.name}
                  {...register('name')}
                />
              </Field>

              <Field
                label={ALLOWANCE_DEDUCTION_LABELS.shortName}
                required
                error={errors.shortName?.message}
              >
                <Input
                  placeholder={ALLOWANCE_DEDUCTION_LABELS.shortName}
                  {...register('shortName')}
                />
              </Field>

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
                  {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Record'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
