import { z } from 'zod'

/* ── The form ───────────────────────────────────────────────────────────── */

/**
 * A numeric grid cell. Kept as a string because that's what an uncontrolled
 * `<input>` holds — the number is made at the boundary, in `salary-mappers`.
 *
 * `blank` is what an empty cell means: `'required'` for the one figure a save
 * can't do without, `'auto'` for the overrides the server fills in itself.
 */
function gridNumber({
  min,
  max,
  blank,
  label,
}: {
  min: number
  max: number
  blank: 'required' | 'auto'
  label: string
}) {
  return z
    .string()
    .trim()
    .refine((value) => blank === 'auto' || value !== '', `${label} is required`)
    .refine(
      (value) => value === '' || !Number.isNaN(Number(value)),
      `${label} must be a number`,
    )
    .refine(
      (value) => value === '' || (Number(value) >= min && Number(value) <= max),
      `${label} must be between ${min} and ${max}`,
    )
}

/**
 * One posting's row on the register. Three cells, because three is everything
 * the save takes: **the server computes the pay**, from the wage structure in
 * force at the cycle's close, so there is no gross, net or per-head amount for
 * the screen to send — or to get wrong.
 *
 * The rest of the row (who it is, what they're paid, what the month comes to) is
 * the server's answer and is held beside the form, never in it.
 */
export const salaryRowSchema = z.object({
  /** The posting — what the upsert is keyed on, with the year and month. */
  employeeServiceId: z.number(),
  /** For the toast and the confirmation, so neither needs a second lookup. */
  employeeName: z.string(),
  /** Days to pay for. Opens on the attendance's payable days. */
  presentDays: gridNumber({ min: 0, max: 31, blank: 'required', label: 'Present days' }),
  /** Override for the month's working days — blank leaves it to the server. */
  workingDays: gridNumber({ min: 1, max: 31, blank: 'auto', label: 'Working days' }),
  /** Overtime hours; blank is none. Only asked when OT applies to the row. */
  otHours: gridNumber({ min: 0, max: 400, blank: 'auto', label: 'OT hours' }),
})

export const salaryFormSchema = z.object({ rows: z.array(salaryRowSchema) })

export type SalaryFormValues = z.infer<typeof salaryFormSchema>
export type SalaryRow = SalaryFormValues['rows'][number]

/* ── API shapes ─────────────────────────────────────────────────────────── */

/** An allowance / deduction head as the preview carries it. */
const computedHeadSchema = z.object({
  pay_component_id: z.number(),
  pay_component_name: z.string().nullable(),
  pay_component_short_code: z.string().nullable(),
  amount: z.number(),
})

/**
 * A head as a *stored* month carries it — the same figure, plus the id of the
 * saved component row and the acts it counted towards.
 */
const storedComponentSchema = computedHeadSchema.extend({
  id: z.number(),
  pay_component_type: z.string().nullable(),
  pf_applicable: z.boolean(),
  esic_applicable: z.boolean(),
  pt_applicable: z.boolean(),
})

const attendanceSchema = z.object({
  present_days: z.number(),
  full_days: z.number(),
  holiday_days: z.number(),
  paid_leave_days: z.number(),
  unpaid_leave_days: z.number(),
  weekly_off_days: z.number(),
  payable_days: z.number(),
  working_days: z.number(),
})

/** The parts of the wage structure in force that the grid reads. */
const wageStructureSchema = z
  .object({
    id: z.number(),
    designation_id: z.number(),
    salary_type: z.string(),
    basic_pay: z.number().nullable(),
    wages_per_day: z.number().nullable(),
    working_days: z.number().nullable(),
    weekly_off: z.string().nullable(),
    extra_day_amount_per_day: z.number().nullable(),
    is_overtime_applicable: z.boolean(),
    overtime_rate_per_hour: z.number().nullable(),
    is_pf_act_applicable: z.boolean().nullable(),
    is_esic_act_applicable: z.boolean().nullable(),
    is_pt_act_applicable: z.boolean().nullable(),
    is_lwf_act_applicable: z.boolean().nullable(),
    is_tds_act_applicable: z.boolean().nullable(),
  })
  .nullable()

/** `computed` — the pay that would be saved if the row were committed as it is. */
const computedSchema = z
  .object({
    basic_pay: z.number().nullable(),
    wages_per_day: z.number().nullable(),
    basic_pay_for_present_days: z.number().nullable(),
    total_allowance: z.number().nullable(),
    total_deduction: z.number().nullable(),
    gross_pay: z.number().nullable(),
    net_pay: z.number().nullable(),
    employee_pf: z.number().nullable(),
    employer_pf: z.number().nullable(),
    employee_esic: z.number().nullable(),
    employer_esic: z.number().nullable(),
    employee_pt: z.number().nullable(),
    employee_lwf: z.number().nullable(),
    employee_tds: z.number().nullable(),
    extra_days: z.number().nullable(),
    extra_days_amount: z.number().nullable(),
    ot_hours: z.number().nullable(),
    ot_amount: z.number().nullable(),
    allowances: z.array(computedHeadSchema),
    deductions: z.array(computedHeadSchema),
  })
  .nullable()

/** `salary` — the stored month, present only on a processed row. */
const storedSalarySchema = z
  .object({
    id: z.number(),
    present_days: z.number().nullable(),
    working_days: z.number().nullable(),
    basic_pay: z.number().nullable(),
    wages_per_day: z.number().nullable(),
    basic_pay_for_present_days: z.number().nullable(),
    total_allowance: z.number().nullable(),
    total_deduction: z.number().nullable(),
    gross_pay: z.number().nullable(),
    net_pay: z.number().nullable(),
    employee_pf: z.number().nullable(),
    employer_pf: z.number().nullable(),
    employee_esic: z.number().nullable(),
    employer_esic: z.number().nullable(),
    employee_pt: z.number().nullable(),
    employee_lwf: z.number().nullable(),
    employee_tds: z.number().nullable(),
    extra_days: z.number().nullable(),
    extra_days_amount: z.number().nullable(),
    ot_hours: z.number().nullable(),
    ot_amount: z.number().nullable(),
    overtime_rate_per_hour: z.number().nullable(),
    is_paid: z.boolean(),
    payment_date: z.string().nullable(),
    is_import_from_sheet: z.boolean(),
  })
  .nullable()

/**
 * `GET /user/salary/register` — one page of the register.
 *
 * `total` counts the side being shown (`pending` or `complete`), while `totals`
 * always describes the whole company: the pager and the progress chips are
 * answering two different questions.
 *
 * `rates` — the PF / ESIC / PT / LWF masters in force — comes back too, so a
 * screen can explain a statutory figure. It's not parsed here: nothing on this
 * grid reads it, and the register is heavy enough without validating a slab
 * table the UI never opens.
 */
export const salaryRegisterResponseSchema = z.object({
  period: z.object({
    month: z.number(),
    year: z.number(),
    from: z.string(),
    to: z.string(),
    cycle_start_day: z.number(),
    total_days_in_month: z.number(),
  }),
  totals: z.object({
    total_employees: z.number(),
    salary_done: z.number(),
    salary_pending: z.number(),
  }),
  items: z.array(
    z.object({
      employee_id: z.number(),
      employee_service_id: z.number(),
      employee_code: z.string().nullable(),
      employee_name: z.string().nullable(),
      employee_prefix: z.string().nullable(),
      photo: z.string().nullable(),
      designation_id: z.number().nullable(),
      designation_name: z.string().nullable(),
      department_id: z.number().nullable(),
      department_name: z.string().nullable(),
      joining_date: z.string().nullable(),
      leaving_date: z.string().nullable(),
      status: z.string(),
      attendance: attendanceSchema,
      wage_structure: wageStructureSchema,
      computed: computedSchema,
      salary: storedSalarySchema,
      components: z.array(storedComponentSchema).optional(),
    }),
  ),
  total: z.number(),
})

export type SalaryRegisterResponse = z.infer<typeof salaryRegisterResponseSchema>
export type SalaryRegisterItemResponse = SalaryRegisterResponse['items'][number]

/** The `saved` / `skipped` report a bulk save answers with. */
export const salarySaveResponseSchema = z.object({
  saved: z.array(
    z.object({
      employee_service_id: z.number(),
      salary_id: z.number(),
      action: z.string(),
    }),
  ),
  skipped: z.array(
    z.object({ employee_service_id: z.number(), reason: z.string() }),
  ),
})

/** The `deleted` / `skipped` report a bulk discard answers with. */
export const salaryDeleteResponseSchema = z.object({
  deleted: z.array(z.number()),
  skipped: z.array(z.object({ salary_id: z.number(), reason: z.string() })),
})

/** Which side of the register is being read. */
export type SalaryStatus = 'pending' | 'complete'

/**
 * What picks a register out: the company, the period, the designation whose
 * heads the columns are built from, and the side being shown. Every one of them
 * travels in the query key — a different filter is a different register.
 */
export interface SalaryRegisterFilters {
  companyId: number
  /** 1–12. */
  month: number
  year: number
  /** Required by the screen, optional to the API — see `use-salary-register`. */
  designationId: number | null
  status: SalaryStatus
}

/** One row of the save body: the posting, and the days it is paid for. */
export interface SalarySaveRow {
  employee_service_id: number
  present_days: number
  /** Omitted to leave the month's working days to the server. */
  working_days?: number
  ot_hours?: number
}

/**
 * `POST /user/salary/bulk-save` — process the month for many postings at once,
 * in one transaction. A row already processed is revised, one never processed is
 * created, and a paid month is refused into `skipped`.
 */
export interface SalarySavePayload {
  company_id: number
  month: number
  year: number
  salaries: SalarySaveRow[]
}
