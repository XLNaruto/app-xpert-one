import { ArrowLeft, CalendarPlus, Plus, Trash2 } from 'lucide-react'
import { decryptParams } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { DateField } from '@/components/common/date-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDate } from '@/lib/utils'
import { HOLIDAY_LABELS, HOLIDAY_YEAR_MAX_ROWS } from '../constants'
import { useHolidayYearForm } from '../hooks/use-holiday-year-form'
import { accountingYearRange } from '../lib/accounting-year'

interface HolidayYearPageProps {
  /**
   * Encrypted `{ accountingYear, companyId?, companyName? }` from the `?data=`
   * search param — set by the list's year filter or the dashboard reminder
   * (which also names the company). Missing opens on next year for the active
   * company.
   */
  data?: string
}

/**
 * Add a whole accounting year's holidays in one save. All or nothing: if any
 * row is refused, none are written. Holidays already in the year are kept.
 */
export function HolidayYearPage({ data }: HolidayYearPageProps) {
  const params = data
    ? decryptParams<{ accountingYear?: string; companyId?: number; companyName?: string }>(
        data,
      )
    : null

  const {
    form,
    fields,
    addRow,
    removeRow,
    canAddRow,
    accountingYear,
    changeYear,
    yearOptions,
    yearMin,
    yearMax,
    onSubmit,
    isPending,
    goToList,
    companyName,
  } = useHolidayYearForm({
    initialYear: params?.accountingYear,
    companyId: typeof params?.companyId === 'number' ? params.companyId : undefined,
    companyName: params?.companyName,
  })

  const errors = form.formState.errors
  const range = accountingYearRange(accountingYear)
  const rowsError = errors.rows?.message ?? errors.rows?.root?.message

  return (
    <div>
      <PageHeader
        title="Add Year's Holidays"
        description={
          companyName
            ? `Enter every holiday for an accounting year for ${companyName} and save them together.`
            : 'Enter every holiday for an accounting year and save them together.'
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
          <form onSubmit={onSubmit} noValidate className="space-y-6">
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <FormSection
                icon={CalendarPlus}
                title="Accounting Year"
                description="Every holiday below must fall inside it"
                className="mt-0"
              />

              <Field
                label={HOLIDAY_LABELS.accountingYear}
                required
                error={errors.accountingYear?.message}
                hint="Holidays already added for this year are kept — this only adds."
              >
                <Combobox
                  className="w-full"
                  options={yearOptions}
                  value={accountingYear}
                  onChange={changeYear}
                  searchable={false}
                />
              </Field>

              {range ? (
                <div className="flex items-end pb-2 text-sm text-muted-foreground">
                  {formatDate(range.from)} – {formatDate(range.to)}
                </div>
              ) : null}
            </div>

            <div>
              <FormSection
                icon={CalendarPlus}
                title="Holidays"
                description={`Up to ${HOLIDAY_YEAR_MAX_ROWS} per save. Blank rows are skipped.`}
                className="mt-0"
              />

              <div className="mt-4 space-y-3">
                {fields.map((field, index) => {
                  const rowErrors = errors.rows?.[index]
                  const fromDate = form.watch(`rows.${index}.fromDate`)
                  return (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 items-start gap-x-4 gap-y-3 rounded-lg border border-border p-3 md:grid-cols-[2rem_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                    >
                      <span className="hidden pt-8 text-center text-sm text-muted-foreground md:block">
                        {index + 1}
                      </span>

                      <Field
                        label={HOLIDAY_LABELS.holidayName}
                        required
                        error={rowErrors?.name?.message}
                      >
                        <Input
                          maxLength={200}
                          placeholder="e.g. Diwali"
                          {...form.register(`rows.${index}.name`)}
                        />
                      </Field>

                      <DateField
                        control={form.control}
                        name={`rows.${index}.fromDate`}
                        label={HOLIDAY_LABELS.fromDate}
                        required
                        error={rowErrors?.fromDate?.message}
                        minDate={yearMin}
                        maxDate={yearMax}
                      />

                      <DateField
                        control={form.control}
                        name={`rows.${index}.toDate`}
                        label={HOLIDAY_LABELS.toDate}
                        required
                        error={rowErrors?.toDate?.message}
                        minDate={fromDate ? new Date(`${fromDate}T00:00:00`) : yearMin}
                        maxDate={yearMax}
                      />

                      <div className="flex justify-end md:pt-6">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove row ${index + 1}`}
                              onClick={() => removeRow(index)}
                              // The last row stays — the form needs somewhere to type.
                              disabled={isPending || fields.length === 1}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove row</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  )
                })}
              </div>

              {rowsError ? <p className="mt-2 text-xs text-destructive">{rowsError}</p> : null}

              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={addRow}
                disabled={!canAddRow || isPending}
              >
                <Plus className="size-4" />
                Add Row
              </Button>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
              <Button type="button" variant="outline" onClick={goToList} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save Holidays'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
