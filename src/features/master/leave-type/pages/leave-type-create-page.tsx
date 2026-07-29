import { Controller } from 'react-hook-form'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { PAY_TYPE_OPTIONS } from '../constants'
import { useLeaveTypeForm } from '../hooks/use-leave-type-form'

interface LeaveTypeCreatePageProps {
  /**
   * Encrypted leave type id from the `?data=` search param. When present the
   * page switches to edit mode; otherwise it's a fresh create.
   */
  data?: string
}

/**
 * Create/edit a leave type record. One screen for both: a `?data=` token edits
 * the record it carries, no token creates a new one.
 */
export function LeaveTypeCreatePage({ data }: LeaveTypeCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const leaveTypeId = decryptId(data)

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
  } = useLeaveTypeForm(leaveTypeId)

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Leave Type' : 'Add Leave Type'}
        description="Configure leave type details."
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
                : "Couldn't load this leave type."}
            </p>
          ) : (
            <form
              onSubmit={onSubmit}
              noValidate
              className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <FormSection
                icon={CalendarDays}
                title="Leave Type Detail"
                description="Name, short code and pay treatment"
                className="mt-0"
              />

              <Field label="Leave Name" required error={errors.leaveName?.message}>
                <Input placeholder="Leave Name" {...register('leaveName')} />
              </Field>
              <Field label="Short Name" required error={errors.shortName?.message}>
                <Input placeholder="Short Name" {...register('shortName')} />
              </Field>
              <Field label="Pay Type" required error={errors.payType?.message}>
                <Controller
                  control={control}
                  name="payType"
                  render={({ field }) => (
                    <Combobox
                      className="w-full"
                      value={field.value}
                      onChange={field.onChange}
                      options={PAY_TYPE_OPTIONS}
                      placeholder="Select"
                      searchPlaceholder="Search pay type"
                    />
                  )}
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
                  {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Leave Type'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
