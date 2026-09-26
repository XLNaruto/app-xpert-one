import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useCompanyStore } from '@/stores/company-store'
import { holidayYearSchema, type HolidayYearFormValues } from '../schemas'
import {
  EMPTY_HOLIDAY_YEAR_ROW,
  HOLIDAY_YEAR_INITIAL_ROWS,
  HOLIDAY_YEAR_MAX_ROWS,
} from '../constants'
import { useCreateHolidayYear } from '../api/use-holiday-mutations'
import {
  accountingYearOf,
  accountingYearOptions,
  accountingYearRange,
  formatAccountingYear,
  accountingYearStart,
  isAccountingYear,
  toPickerDate,
} from '../lib/accounting-year'

/** The coming accounting year — what the form opens on when nothing is passed. */
function nextAccountingYear(): string {
  const current = accountingYearStart(accountingYearOf(new Date())) as number
  return formatAccountingYear(current + 1)
}

/**
 * Owns the "Add year's holidays" form: a year picker over an editable list of
 * rows, saved in one all-or-nothing call. `initialYear` comes pre-filled from
 * the list's filter or the dashboard reminder; otherwise it opens on next year,
 * which is the one people add ahead of time. `companyId` (from the reminder)
 * saves for that company; omitted, the active company.
 */
export function useHolidayYearForm({
  initialYear,
  companyId,
  companyName: passedCompanyName,
}: {
  initialYear?: string
  companyId?: number
  companyName?: string
} = {}) {
  const navigate = useNavigate()
  const activeCompanyId = useCompanyStore((s) => s.selectedCompanyId)
  const activeCompanyName = useCompanyStore((s) => s.selectedCompanyName)
  // Only worth naming a company the session isn't already on.
  const forOtherCompany = companyId !== undefined && companyId !== activeCompanyId
  const companyName = forOtherCompany
    ? (passedCompanyName ?? `Company ${companyId}`)
    : activeCompanyName
  const createYear = useCreateHolidayYear(forOtherCompany ? companyId : undefined)

  const startYear =
    initialYear && isAccountingYear(initialYear) ? initialYear : nextAccountingYear()

  const form = useForm<HolidayYearFormValues>({
    resolver: zodResolver(holidayYearSchema),
    defaultValues: {
      accountingYear: startYear,
      rows: Array.from({ length: HOLIDAY_YEAR_INITIAL_ROWS }, () => ({
        ...EMPTY_HOLIDAY_YEAR_ROW,
      })),
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'rows',
  })

  const accountingYear = form.watch('accountingYear')
  const range = accountingYearRange(accountingYear)
  const yearMin = range ? toPickerDate(range.from) : undefined
  const yearMax = range ? toPickerDate(range.to) : undefined

  const yearOptions = accountingYearOptions(new Date(), startYear).map((year) => ({
    value: year,
    label: `FY ${year}`,
  }))

  const canAddRow = fields.length < HOLIDAY_YEAR_MAX_ROWS
  const addRow = () => {
    if (canAddRow) append({ ...EMPTY_HOLIDAY_YEAR_ROW })
  }
  // Keep one row on screen — the page disables the last row's delete.
  const removeRow = (index: number) => {
    if (fields.length > 1) remove(index)
  }

  /** Switching year re-checks the dates already entered against the new range. */
  const changeYear = (year: string) => {
    form.setValue('accountingYear', year, { shouldValidate: form.formState.isSubmitted })
    if (form.formState.isSubmitted) void form.trigger('rows')
  }

  const goToList = () => navigate({ to: '/master/holiday' })

  const onSubmit = form.handleSubmit((values) => {
    createYear.mutate(values, {
      onSuccess: (created) => {
        toast.success(
          `${created.length} holiday${created.length === 1 ? '' : 's'} added for ${values.accountingYear}${
            forOtherCompany && companyName ? ` (${companyName})` : ''
          }`,
        )
        goToList()
      },
      // 409 names the start dates that already have a holiday — the user
      // removes those rows and saves again, so the message is shown verbatim.
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Failed to save the year's holidays"),
    })
  })

  return {
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
    isPending: createYear.isPending,
    goToList,
    companyName,
  }
}
