import { z } from 'zod'
import { presentDaysProblem } from './lib/salary-calculations'

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
 * One allowance or deduction head as the *form* holds it — the head's own cell.
 *
 * `overridden` is what a double-click leaves behind. A head normally follows the
 * designation's configuration: a percentage head earns its share of the earned
 * basic and so moves with the present days, a fixed head stays at its rupee
 * amount. Typing over the cell pins it — from then on the figure is this one,
 * whatever the days do — which is the whole point of being allowed to type it.
 */
const amountCell = z.object({
  amount: gridNumber({
    min: -99999999,
    max: 99999999,
    blank: 'auto',
    label: 'Amount',
  }),
  /** Typed over by hand, so it no longer follows whatever was deciding it. */
  overridden: z.boolean(),
})

export const salaryHeadCellSchema = amountCell.extend({
  payComponentId: z.number(),
})

/**
 * The statutory deductions as the form holds them.
 *
 * Each is worked out by `salary-statutory` from the wage structure's act settings
 * and the period's rate masters, so it follows the present days along with the
 * rest of the row. The cell is the **override**, not the source: typing into one
 * pins it, exactly as typing over a head does, and a month where an act was
 * deducted differently is the case the API's "every figure is stored as sent" is
 * built for. There is nowhere else on the screen to say so.
 */
export const salaryStatutorySchema = z.object({
  pf: amountCell,
  esic: amountCell,
  pt: amountCell,
  lwf: amountCell,
  tds: amountCell,
})

/** Which statutory figure a cell is — also the key the API routes it by. */
export type SalaryStatutoryKey = keyof z.infer<typeof salaryStatutorySchema>

/**
 * One posting's row on the register.
 *
 * **The client decides the pay.** `POST /salary/bulk-save` takes the full
 * snapshot a row was priced at — every head, every total — and stores each figure
 * as sent, because payroll may override any of it at salary time and no override
 * survives in the designation's wage structure afterwards. So the row carries its
 * heads as well as its days, and the arithmetic that joins them lives in
 * `salary-calculations`.
 *
 * The days split three ways. Present days is typed. Working days is shown but not
 * editable — it comes off the wage structure or the attendance and is sent as
 * part of the snapshot. Overtime hours is typed where the structure allows it.
 */
const salaryRowFields = z.object({
  /** The posting — what the upsert is keyed on, with the year and month. */
  employeeServiceId: z.number(),
  /** Sent alongside the posting; the API checks the two agree. */
  employeeId: z.number(),
  /** For the toast and the confirmation, so neither needs a second lookup. */
  employeeName: z.string(),
  /**
   * Days to pay for. Opens on the attendance's payable days, and is bounded by
   * the row's own working days rather than by the calendar — see the refinement
   * below, which is where that check lives because it needs both fields.
   */
  presentDays: z.string(),
  /** The month's working days — read-only on the grid, sent with the snapshot. */
  workingDays: gridNumber({ min: 1, max: 31, blank: 'auto', label: 'Working days' }),
  /** Overtime hours; blank is none. Only asked when OT applies to the row. */
  otHours: gridNumber({ min: 0, max: 400, blank: 'auto', label: 'OT hours' }),
  /** Aligned with the grid's head columns, so a column index is a cell index. */
  allowances: z.array(salaryHeadCellSchema),
  deductions: z.array(salaryHeadCellSchema),
  /** PF, ESIC, PT, LWF and TDS — priced from the acts, typeable. */
  statutory: salaryStatutorySchema,
})

/**
 * The row, with the one rule that needs two of its fields at once.
 *
 * Present days is bounded by the row's **working days**, not by the calendar: a
 * 26-day month cannot pay 27. The check can't sit on the field the way the other
 * day counts' checks do — a field schema sees only its own value — so it is a
 * refinement over the whole row, raised against `presentDays` so the error lands
 * on the cell that caused it.
 *
 * `presentDaysProblem` is shared with the grid, which shows the same message
 * inline as it is typed. Two copies of "how many days is too many" would be one
 * copy too many.
 */
export const salaryRowSchema = salaryRowFields.superRefine((row, ctx) => {
  const problem = presentDaysProblem(row.presentDays, row.workingDays)
  if (!problem) return
  ctx.addIssue({ code: 'custom', path: ['presentDays'], message: problem })
})

export const salaryFormSchema = z.object({ rows: z.array(salaryRowSchema) })

export type SalaryFormValues = z.infer<typeof salaryFormSchema>
export type SalaryRow = SalaryFormValues['rows'][number]

/* ── API shapes ─────────────────────────────────────────────────────────── */

/**
 * A head as a *stored* month carries it — the figure, plus the id of the saved
 * component row and the acts it counted towards.
 *
 * There is no longer a second shape beside it. The register used to answer the
 * same money twice — once as `computed`, the pay that *would* be saved — and no
 * longer does: `GET /salary/register` hands over the attendance, the wage
 * structure and the rate masters, and **the client prices the row**. So a
 * pending row has no heads to read, only a configuration to price, and this
 * shape describes the processed side alone.
 */
const storedComponentSchema = z.object({
  id: z.number(),
  pay_component_id: z.number(),
  pay_component_name: z.string().nullable(),
  pay_component_short_code: z.string().nullable(),
  pay_component_type: z.string().nullable(),
  amount: z.number(),
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

/**
 * The wage structure in force for the row's designation.
 *
 * This is now the *whole* act configuration rather than a handful of flags for
 * display, because the screen prices the statutory deductions from it: how PF is
 * worked out, what ESIC is deducted on, whether PT and LWF follow their rate
 * master or a hand-entered figure, and at what percentage TDS applies.
 */
const wageStructureSchema = z
  .object({
    id: z.number(),
    designation_id: z.number(),
    applicable_date: z.string().nullable().optional(),
    salary_type: z.string(),
    basic_pay: z.number().nullable(),
    wages_per_day: z.number().nullable(),
    working_day_calculation_type: z.string().nullable().optional(),
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
    /* How each act resolves — read by `salary-statutory`, echoed on the save. */
    pf_deduction_type: z.string().nullable().optional(),
    pf_deduction_amount: z.number().nullable().optional(),
    esic_deduction_basis: z.string().nullable().optional(),
    pt_act_type: z.string().nullable().optional(),
    pt_amount: z.number().nullable().optional(),
    lwf_act_type: z.string().nullable().optional(),
    lwf_amount: z.number().nullable().optional(),
    tds_percentage: z.number().nullable().optional(),
  })
  .nullable()

/**
 * `rates` — the PF / ESIC / PT / LWF masters in force for the period.
 *
 * New, and the reason this screen can finally price a statutory deduction. The
 * register used to answer PF and ESIC as figures it had computed; it now answers
 * the *rates* instead and leaves the arithmetic to the client, which is the same
 * move it already made for the allowance heads. Any of the four is `null` when
 * no rate is on the master for the period — the act then deducts nothing rather
 * than falling back to a stale one.
 */
const ratesSchema = z.object({
  pf: z
    .object({
      id: z.number(),
      effective_date: z.string().nullable(),
      deduction: z.number().nullable(),
      wage_ceiling_limit: z.number().nullable(),
      employee_pf_contribution: z.number().nullable(),
      employer_pf_contribution: z.number().nullable(),
    })
    .nullable(),
  esic: z
    .object({
      id: z.number(),
      effective_date: z.string().nullable(),
      wage_ceiling_limit: z.number().nullable(),
      employee_esic_contribution: z.number().nullable(),
      employer_esic_contribution: z.number().nullable(),
    })
    .nullable(),
  pt: z
    .object({
      id: z.number(),
      state_id: z.number().nullable(),
      effective_date: z.string().nullable(),
      slabs: z.array(
        z.object({
          id: z.number(),
          min_salary: z.number().nullable(),
          max_salary: z.number().nullable(),
          /** `'0'` is every month, otherwise `'01'`–`'12'`. */
          month: z.string().nullable(),
          gender: z.string().nullable(),
          min_age: z.string().nullable(),
          amount: z.number().nullable(),
        }),
      ),
    })
    .nullable(),
  lwf: z
    .object({
      id: z.number(),
      state_id: z.number().nullable(),
      effective_date: z.string().nullable(),
      /** `'0'` is every month, otherwise `'01'`–`'12'`. */
      month: z.string().nullable(),
      employee_contribution: z.number().nullable(),
      employer_contribution: z.number().nullable(),
    })
    .nullable(),
})

/**
 * `salary_components` — how the structure the row was priced on configures each
 * head: `amount_type` is `Percentage` or `Fixed`, and `amount` is the percent or
 * the flat figure.
 *
 * It sits on the **row**, beside `wage_structure` rather than inside it, and it
 * is what lets a percentage head follow the present days. It is also the
 * version-correct source: these are the components of the very structure the row
 * was priced on, which for a back-dated month is not the one in force today —
 * so nothing has to go and read the designation's history to find out what a
 * head is.
 *
 * `component_type` puts the head on its side of the grid, spelled as the
 * pay-component master spells it (`ALLOWANCE` / `DEDUCTION`), and `sort_order` is
 * the order the master keeps them in.
 */
const salaryComponentSchema = z.object({
  pay_component_id: z.number(),
  pay_component_name: z.string().nullable(),
  pay_component_short_code: z.string().nullable(),
  component_type: z.string().nullable(),
  sort_order: z.number().optional(),
  amount: z.number(),
  amount_type: z.string(),
  pf_applicable: z.boolean().nullable(),
  esic_applicable: z.boolean().nullable(),
  pt_applicable: z.boolean().nullable(),
})

/**
 * `salary` — the stored month, present only on a processed row.
 *
 * It carries the act settings the month was *actually* priced on, not just the
 * figures: a stored row is read back through its own `pf_deduction_type`,
 * `esic_deduction_basis` and the rest rather than through whatever the
 * designation says today, so revising a back-dated month can't quietly re-price
 * it on this quarter's configuration.
 */
const storedSalarySchema = z
  .object({
    id: z.number(),
    present_days: z.number().nullable(),
    working_days: z.number().nullable(),
    working_hour: z.number().nullable().optional(),
    weekly_off: z.string().nullable().optional(),
    basic_pay: z.number().nullable(),
    wages_per_day: z.number().nullable(),
    basic_pay_for_present_days: z.number().nullable(),
    total_allowance: z.number().nullable(),
    total_deduction: z.number().nullable(),
    gross_pay: z.number().nullable(),
    net_pay: z.number().nullable(),
    is_pf_act_applicable: z.boolean().nullable().optional(),
    pf_deduction_type: z.string().nullable().optional(),
    pf_deduction_amount: z.number().nullable().optional(),
    employee_pf: z.number().nullable(),
    employer_pf: z.number().nullable(),
    is_esic_act_applicable: z.boolean().nullable().optional(),
    esic_deduction_basis: z.string().nullable().optional(),
    employee_esic_deduction_percentage: z.number().nullable().optional(),
    employer_esic_deduction_percentage: z.number().nullable().optional(),
    employee_esic: z.number().nullable(),
    employer_esic: z.number().nullable(),
    is_pt_act_applicable: z.boolean().nullable().optional(),
    pt_act_type: z.string().nullable().optional(),
    employee_pt: z.number().nullable(),
    is_lwf_act_applicable: z.boolean().nullable().optional(),
    employee_lwf: z.number().nullable(),
    is_tds_act_applicable: z.boolean().nullable().optional(),
    tds_percentage: z.number().nullable().optional(),
    employee_tds: z.number().nullable(),
    extra_days: z.number().nullable(),
    extra_days_amount: z.number().nullable(),
    is_overtime_applicable: z.boolean().nullable().optional(),
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
 * `rates` — the PF / ESIC / PT / LWF masters in force — is parsed, because the
 * grid now prices the statutory deductions from it. The register no longer
 * answers them as figures; it answers the attendance, the wage structure, the
 * head configuration and these rates, and the client does the arithmetic.
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
  rates: ratesSchema,
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
      /* Defaulted rather than required: a posting with no structure in force has
         no components either, and that row still has to parse. */
      salary_components: z.array(salaryComponentSchema).optional().default([]),
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

/**
 * What an import answers: the period it actually ran for, and the three lists
 * every row lands in.
 *
 * `period` is echoed because the sheet's own period wins over the one sent —
 * importing May's template with June on screen processes May, and this is how
 * the screen finds out. `saved` is what was created, `skipped` what was refused
 * (already processed, unknown code, an ambiguous posting) and `errors` what the
 * row itself was wrong about.
 */
export const salaryImportResponseSchema = z.object({
  period: z.object({
    month: z.number(),
    year: z.number(),
    from: z.string(),
    to: z.string(),
    cycle_start_day: z.number(),
    total_days_in_month: z.number(),
  }),
  saved: z.array(z.object({ employee_code: z.string(), salary_id: z.number() })),
  skipped: z.array(z.object({ employee_code: z.string(), reason: z.string() })),
  errors: z.array(z.object({ employee_code: z.string(), reason: z.string() })),
})

/** What the import screen sends once the workbook is in storage. */
export interface SalaryImportPayload {
  company_id: number
  month: number
  year: number
  file_key: string
  department_id?: number
}

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

/** One head as the save body carries it, on either side of the breakdown. */
export interface SalaryComponentPayload {
  pay_component_id: number
  amount: number
  pf_applicable: boolean
  esic_applicable: boolean
  pt_applicable: boolean
}

/**
 * One row of the save body — the **full snapshot** the screen priced the month
 * at: the wage settings it used, the figures that came out, and the per-head
 * breakdown behind them.
 *
 * Every figure is stored as sent. That is deliberate on the API's side: payroll
 * may override any of it at salary time and no override is recoverable from the
 * designation's wage structure afterwards. Four things are checked rather than
 * trusted — the posting must be on this register, every `pay_component_id` must
 * be in the company's catalog, a paid month is refused, and **the row must add
 * up**: `total_allowance`, `total_deduction`, `gross_pay` and `net_pay` are
 * verified against the parts sent with them (±2 for rounding), so a half-updated
 * screen cannot store a net pay its own breakdown contradicts.
 *
 * PF / ESIC / PT / LWF travel as `employee_component.deduction` lines, as the
 * register reports them. The server routes them by catalog short code onto the
 * salary row's own columns rather than storing them as breakdown rows, so they
 * are counted in `total_deduction` exactly once.
 */
export interface SalarySaveRow {
  employee_id: number
  employee_service_id: number
  /** Echoed on a revision; the upsert keys on the posting and the period. */
  salary_id?: number | null
  designation_id?: number | null
  department_id?: number | null
  designation_wage_structure_id?: number | null

  /* What the month was priced on. */
  salary_type?: 'DAILY' | 'MONTHLY' | null
  basic_pay?: number | null
  wages_per_day?: number | null
  working_days?: number | null
  working_hour?: number | null
  weekly_off?: string | null
  present_days: number
  basic_pay_for_present_days?: number | null

  /* The acts, as the wage structure in force has them — every setting the
     statutory figures were worked out from, so a stored month can be read back
     through its own configuration rather than through today's. */
  pf_act_applicable?: boolean | null
  pf_deduction_type?: 'Percentage' | 'Fixed' | null
  pf_deduction_amount?: number | null
  employee_pf_contribution_on_wage_limit?: boolean | null
  employer_pf_contribution_on_wage_limit?: boolean | null
  employer_pf?: number | null
  eps_applicable?: boolean | null
  deferred_pension_applicable?: boolean | null
  deferred_pension_allowed_upto_max_age?: number | null
  esic_act_applicable?: boolean | null
  esic_deduction_basis?: 'Wage Ceiling' | 'Gross Salary' | 'As Per Act' | null
  employee_esic_deduction_percentage?: number | null
  employer_esic_deduction_percentage?: number | null
  employer_esic?: number | null
  pt_act_applicable?: boolean | null
  pt_act_type?: 'AUTO' | 'FIXED' | null
  lwf_act_applicable?: boolean | null
  lwf_deduct_from_wages?: boolean | null
  tds_act_applicable?: boolean | null
  tds_percentage?: number | null
  employee_tds?: number | null

  /* Overtime and extra days. */
  overtime_applicable?: boolean | null
  overtime_rate_per_hour?: number | null
  pf_applicable_on_overtime?: boolean | null
  esic_applicable_on_overtime?: boolean | null
  pt_applicable_on_overtime?: boolean | null
  ot_hours?: number | null
  ot_amount?: number | null
  extra_days?: number | null
  extra_days_amount?: number | null

  /* The figures the row came to — checked against the breakdown below. */
  total_allowance: number
  total_deduction: number
  gross_pay: number
  net_pay: number

  employee_component: {
    allowance: SalaryComponentPayload[]
    deduction: SalaryComponentPayload[]
  }
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
