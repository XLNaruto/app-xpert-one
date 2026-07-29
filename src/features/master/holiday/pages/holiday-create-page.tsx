import { ArrowLeft, CalendarHeart } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { DateField } from '@/components/common/date-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { HOLIDAY_LABELS } from '../constants'
import { useHolidayForm } from '../hooks/use-holiday-form'

interface HolidayCreatePageProps {
  /**
   * Encrypted holiday id from the `?data=` search param. When present the page
   * switches to edit mode; otherwise it's a fresh create.
   */
  data?: string
}

/**
 * Create/edit a holiday record. One screen for both: a `?data=` token edits the
 * record it carries, no token creates a new one.
 */
export function HolidayCreatePage({ data }: HolidayCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const holidayId = decryptId(data)

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
  } = useHolidayForm(holidayId)

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Holiday' : 'Add Holiday'}
        description="Configure holiday details."
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
                : "Couldn't load this holiday."}
            </p>
          ) : (
            <form
              onSubmit={onSubmit}
              noValidate
              className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <FormSection
                icon={CalendarHeart}
                title="Holiday Detail"
                description="Name and the dates it spans"
                className="mt-0"
              />

              <Field
                label={HOLIDAY_LABELS.holidayName}
                required
                error={errors.holidayName?.message}
              >
                <Input
                  placeholder={HOLIDAY_LABELS.holidayName}
                  {...register('holidayName')}
                />
              </Field>

              <DateField
                control={control}
                name="fromDate"
                label={HOLIDAY_LABELS.fromDate}
                required
                error={errors.fromDate?.message}
              />

              <DateField
                control={control}
                name="toDate"
                label={HOLIDAY_LABELS.toDate}
                required
                error={errors.toDate?.message}
              />

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
                  {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Holiday'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
