import type { ReportTypeOption } from '@/features/reports/common'

/**
 * PT has one type. The Type dropdown still appears, so the four report screens
 * read identically and so a second PT statement can be added without the screen
 * changing shape.
 */
export type PtReportType = 'pt-report'

const PT_SORTABLE = [
  'employee_name',
  'employee_code',
  'department_name',
  'designation_name',
  'gross_wages',
  'pt_amount',
] as const

export const PT_REPORT_TYPES: readonly ReportTypeOption<PtReportType>[] = [
  {
    value: 'pt-report',
    label: 'PT Statement',
    description:
      'One Line per PT-liable Employee: The Month’s Whole Gross and the Tax Deducted. PT Is Assessed on the Gross, Which Is What Separates This from the ESIC Statement’s Per-Head Wage Base.',
    defaultSort: { id: 'employee_name', desc: false },
    sortable: PT_SORTABLE,
  },
]
