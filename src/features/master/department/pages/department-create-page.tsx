import { Controller } from 'react-hook-form'
import { ArrowLeft, Building } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { BRANCH_OPTIONS, MONTH_DAY_OPTIONS } from '../constants'
import { useDepartmentForm } from '../hooks/use-department-form'

/**
 * Create/edit a department record. One screen for both: pass `departmentId` to
 * edit an existing record, or omit it to create a new one.
 */
export function DepartmentManagePage({ departmentId }: { departmentId?: number }) {
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
  } = useDepartmentForm(departmentId)

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Department' : 'Add New Department'}
        description={
          isEdit ? 'Update this department record' : 'Create a new department record'
        }
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
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">
              {loadError instanceof Error
                ? loadError.message
                : "Couldn't load this department."}
            </p>
          ) : (
            <form
              onSubmit={onSubmit}
              noValidate
              className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <FormSection
                icon={Building}
                title="Department Detail"
                description="Branch and department identity"
                className="mt-0"
              />

              <Field label="Branch" required error={errors.branch?.message}>
                <Controller
                  control={control}
                  name="branch"
                  render={({ field }) => (
                    <Combobox
                      className="w-full"
                      value={field.value}
                      onChange={field.onChange}
                      options={BRANCH_OPTIONS}
                      placeholder="Select Branch"
                      searchPlaceholder="Search branch"
                    />
                  )}
                />
              </Field>
              <Field
                label="Department Name"
                required
                error={errors.departmentName?.message}
              >
                <Input placeholder="Department Name" {...register('departmentName')} />
              </Field>
              <Field
                label="Department Code"
                required
                error={errors.departmentCode?.message}
              >
                <Input placeholder="Department Code" {...register('departmentCode')} />
              </Field>
              <Field
                label="Month Start Date"
                required
                error={errors.monthStartDate?.message}
              >
                <Controller
                  control={control}
                  name="monthStartDate"
                  render={({ field }) => (
                    <Combobox
                      className="w-full"
                      value={field.value}
                      onChange={field.onChange}
                      options={MONTH_DAY_OPTIONS}
                      placeholder="Select Day"
                      searchPlaceholder="Search day"
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
                  {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Department'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
