import { z } from 'zod'
import { ptHeaderSchema, reportPeriodSchema } from '@/features/reports/common'

/**
 * `GET /user/pt-reports/pt-report` — the Professional Tax statement.
 *
 * `header` carries no rates, and that is not an omission: PT is a slab table, so
 * there is no single rate to print. What it carries instead is the
 * establishment — the branch's enrolment (EC) and registration (RC) numbers with
 * the corporation the return is filed with — all null when no department was
 * selected or that department has no branch.
 */

const ptItemSchema = z.object({
  salary_id: z.number(),
  employee_id: z.number(),
  employee_name: z.string().nullable(),
  employee_code: z.string().nullable(),
  department_name: z.string().nullable(),
  designation_name: z.string().nullable(),
  /** The month's WHOLE gross — PT is assessed on the gross. */
  gross_wages: z.number().nullable(),
  /**
   * NOT recomputed here, and it cannot be: the register either took the fixed
   * amount the wage structure names or matched the state's slab on the wage
   * band, gender and AGE AT PRICING TIME. Re-walking the slabs today would
   * return a different one for anyone who has since had a birthday, so the
   * stored figure is the only one that agrees with the payslip.
   */
  pt_amount: z.number().nullable(),
})

export const ptReportResponseSchema = z.object({
  period: reportPeriodSchema,
  header: ptHeaderSchema,
  items: z.array(ptItemSchema),
  total: z.number(),
})

export type PtItemResponse = z.infer<typeof ptItemSchema>
