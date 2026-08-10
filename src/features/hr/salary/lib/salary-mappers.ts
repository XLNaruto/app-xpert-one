import type {
  SalaryComponentPayload,
  SalaryRegisterItemResponse,
  SalaryRegisterResponse,
  SalaryRow,
  SalarySaveRow,
} from '../schemas'
import type {
  SalaryAttendance,
  SalaryComponent,
  SalaryFigures,
  SalaryHead,
  SalaryHeadConfigs,
  SalaryPeriod,
  SalaryRates,
  SalaryRegister,
  SalaryRegisterRow,
  SalaryStoredActs,
  SalaryTotals,
  SalaryWageStructure,
} from '../types'
import type { SalaryRowFigures } from './salary-calculations'

/**
 * The register's boundary — API shape in, screen shape out, and the days the
 * screen sends back.
 *
 * The one decision worth naming lives in `figures()`: the API answers the same
 * money twice, once as `computed` (what *would* be saved) and once as `salary` +
 * `components` (what *was*). Which one a cell should show is a property of the
 * row, not of the cell, so it's settled once here and the grid reads a single
 * block. Pure functions only — no React, per the feature layout.
 */

/** `null` reads as zero: an absent figure and a nil figure both pay nothing. */
function amount(value: number | null | undefined): number {
  return value ?? 0
}

function text(value: string | null | undefined): string {
  return value ?? ''
}

export function toPeriod(period: SalaryRegisterResponse['period']): SalaryPeriod {
  return {
    month: period.month,
    year: period.year,
    from: period.from,
    to: period.to,
    cycleStartDay: period.cycle_start_day,
    totalDaysInMonth: period.total_days_in_month,
  }
}

function toTotals(totals: SalaryRegisterResponse['totals']): SalaryTotals {
  return {
    totalEmployees: totals.total_employees,
    salaryDone: totals.salary_done,
    salaryPending: totals.salary_pending,
  }
}

function toAttendance(
  attendance: SalaryRegisterItemResponse['attendance'],
): SalaryAttendance {
  return {
    presentDays: attendance.present_days,
    fullDays: attendance.full_days,
    holidayDays: attendance.holiday_days,
    paidLeaveDays: attendance.paid_leave_days,
    unpaidLeaveDays: attendance.unpaid_leave_days,
    weeklyOffDays: attendance.weekly_off_days,
    payableDays: attendance.payable_days,
    workingDays: attendance.working_days,
  }
}

function toWageStructure(
  wage: SalaryRegisterItemResponse['wage_structure'],
): SalaryWageStructure | null {
  if (!wage) return null
  return {
    id: wage.id,
    designationId: wage.designation_id,
    applicableDate: wage.applicable_date ?? null,
    salaryType: wage.salary_type,
    basicPay: wage.basic_pay,
    wagesPerDay: wage.wages_per_day,
    workingDayCalculationType: wage.working_day_calculation_type ?? null,
    workingDays: wage.working_days,
    weeklyOff: wage.weekly_off,
    extraDayAmountPerDay: wage.extra_day_amount_per_day,
    isOvertimeApplicable: wage.is_overtime_applicable,
    overtimeRatePerHour: wage.overtime_rate_per_hour,
    isPfActApplicable: wage.is_pf_act_applicable ?? false,
    isEsicActApplicable: wage.is_esic_act_applicable ?? false,
    isPtActApplicable: wage.is_pt_act_applicable ?? false,
    isLwfActApplicable: wage.is_lwf_act_applicable ?? false,
    isTdsActApplicable: wage.is_tds_act_applicable ?? false,
    pfDeductionType: wage.pf_deduction_type ?? null,
    pfDeductionAmount: wage.pf_deduction_amount ?? null,
    esicDeductionBasis: wage.esic_deduction_basis ?? null,
    ptActType: wage.pt_act_type ?? null,
    ptAmount: wage.pt_amount ?? null,
    lwfActType: wage.lwf_act_type ?? null,
    lwfAmount: wage.lwf_amount ?? null,
    tdsPercentage: wage.tds_percentage ?? null,
  }
}

/**
 * `rates` — the PF / ESIC / PT / LWF masters in force for the period.
 *
 * The register answers these instead of the statutory figures it used to
 * compute, so this is where the screen's ability to price an act comes from.
 * A missing master stays `null` rather than becoming an empty rate: "no PF rate
 * covers this period" and "PF is zero percent" are different answers, and only
 * the first should leave the deduction at nothing.
 */
function toRates(rates: SalaryRegisterResponse['rates']): SalaryRates {
  return {
    pf: rates.pf && {
      id: rates.pf.id,
      effectiveDate: rates.pf.effective_date,
      deduction: rates.pf.deduction,
      wageCeilingLimit: rates.pf.wage_ceiling_limit,
      employeeContribution: rates.pf.employee_pf_contribution,
      employerContribution: rates.pf.employer_pf_contribution,
    },
    esic: rates.esic && {
      id: rates.esic.id,
      effectiveDate: rates.esic.effective_date,
      wageCeilingLimit: rates.esic.wage_ceiling_limit,
      employeeContribution: rates.esic.employee_esic_contribution,
      employerContribution: rates.esic.employer_esic_contribution,
    },
    pt: rates.pt && {
      id: rates.pt.id,
      stateId: rates.pt.state_id,
      effectiveDate: rates.pt.effective_date,
      /* Cheapest band first, so the first band that covers the wage is the one
         that applies and the search doesn't depend on the master's order. */
      slabs: rates.pt.slabs
        .map((slab) => ({
          id: slab.id,
          minSalary: slab.min_salary,
          maxSalary: slab.max_salary,
          month: text(slab.month) || '0',
          gender: text(slab.gender) || 'Both',
          /* Sent as a string; blank and unparseable both mean "no age bar". */
          minAge: minAge(slab.min_age),
          amount: slab.amount ?? 0,
        }))
        .sort((a, b) => (a.minSalary ?? 0) - (b.minSalary ?? 0)),
    },
    lwf: rates.lwf && {
      id: rates.lwf.id,
      stateId: rates.lwf.state_id,
      effectiveDate: rates.lwf.effective_date,
      month: text(rates.lwf.month) || '0',
      employeeContribution: rates.lwf.employee_contribution,
      employerContribution: rates.lwf.employer_contribution,
    },
  }
}

/** A slab's minimum age, `null` where the band sets no age bar. */
function minAge(value: string | null): number | null {
  const parsed = Number((value ?? '').trim())
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/**
 * One entry of the row's `salary_components` — how the structure it was priced
 * on configures that head.
 */
function toSalaryComponent(
  component: SalaryRegisterItemResponse['salary_components'][number],
): SalaryComponent {
  const type = (component.component_type ?? '').trim().toUpperCase()
  return {
    payComponentId: component.pay_component_id,
    code: headLabel(component.pay_component_short_code, component.pay_component_name),
    name:
      text(component.pay_component_name) ||
      headLabel(component.pay_component_short_code, null),
    componentType: type === 'ALLOWANCE' || type === 'DEDUCTION' ? type : '',
    sortOrder: component.sort_order ?? 0,
    /* Spelled the same on both sides; anything unrecognised reads as a flat
       amount, which is the reading that leaves a figure where it is. */
    valueType: component.amount_type === 'Percentage' ? 'Percentage' : 'Fixed',
    value: component.amount,
    pfApplicable: component.pf_applicable ?? false,
    esicApplicable: component.esic_applicable ?? false,
    ptApplicable: component.pt_applicable ?? false,
  }
}

/** A head's column heading — its short code, falling back to the full name. */
function headLabel(code: string | null, name: string | null): string {
  return (code ?? '').trim() || (name ?? '').trim() || 'Head'
}

function toHead(head: {
  pay_component_id: number
  pay_component_name: string | null
  pay_component_short_code: string | null
  amount: number
  pf_applicable?: boolean
  esic_applicable?: boolean
  pt_applicable?: boolean
}): SalaryHead {
  return {
    payComponentId: head.pay_component_id,
    code: headLabel(head.pay_component_short_code, head.pay_component_name),
    name: text(head.pay_component_name) || headLabel(head.pay_component_short_code, null),
    amount: head.amount,
    /* Only a *stored* head carries its act markers; a preview head takes them
       from the designation's configuration instead, in `rowFigures`. */
    pfApplicable: head.pf_applicable ?? false,
    esicApplicable: head.esic_applicable ?? false,
    ptApplicable: head.pt_applicable ?? false,
  }
}

/**
 * The row's money — the pay a **processed** month was committed at.
 *
 * A pending row has none: the register stopped answering a preview when it
 * started answering `rates`, so the only figures it reports are the ones already
 * stored. Everything a pending row shows is worked out by `rowFigures` from the
 * wage structure, the head configuration and those rates, which is also what a
 * processed row falls back to the moment it is edited.
 *
 * The two fields that come from the *structure* rather than from the stored
 * month are the ones a pending row still needs to be priced at all — the daily
 * wage and the basic — so they are read from `wage_structure` where nothing is
 * stored yet.
 */
function toFigures(item: SalaryRegisterItemResponse): SalaryFigures {
  const stored = item.salary
  const wage = item.wage_structure

  /* Stored heads carry their side in `pay_component_type`. */
  const storedComponents = item.components ?? []
  const storedSide = (type: 'ALLOWANCE' | 'DEDUCTION') =>
    storedComponents
      .filter((component) => (component.pay_component_type ?? '').toUpperCase() === type)
      .map(toHead)

  return {
    basicPay: amount(stored?.basic_pay ?? wage?.basic_pay),
    wagesPerDay: amount(stored?.wages_per_day ?? wage?.wages_per_day),
    earnedBasic: amount(stored?.basic_pay_for_present_days),
    allowances: stored ? storedSide('ALLOWANCE') : [],
    deductions: stored ? storedSide('DEDUCTION') : [],
    totalAllowance: amount(stored?.total_allowance),
    totalDeduction: amount(stored?.total_deduction),
    grossPay: amount(stored?.gross_pay),
    netPay: amount(stored?.net_pay),
    employeePf: amount(stored?.employee_pf),
    employerPf: amount(stored?.employer_pf),
    employeeEsic: amount(stored?.employee_esic),
    employerEsic: amount(stored?.employer_esic),
    employeePt: amount(stored?.employee_pt),
    employeeLwf: amount(stored?.employee_lwf),
    employeeTds: amount(stored?.employee_tds),
    extraDays: amount(stored?.extra_days),
    extraDaysAmount: amount(stored?.extra_days_amount),
    otHours: amount(stored?.ot_hours),
    /* The rate is the wage structure's; a stored month keeps its own copy of the
       one it was paid at, which is the one worth showing on a processed row. */
    otRate: amount(stored?.overtime_rate_per_hour ?? wage?.overtime_rate_per_hour),
    otAmount: amount(stored?.ot_amount),
  }
}

/** The act settings a processed month was priced on, for the save to echo. */
function toStoredActs(
  stored: NonNullable<SalaryRegisterItemResponse['salary']>,
): SalaryStoredActs {
  return {
    isPfActApplicable: stored.is_pf_act_applicable ?? null,
    pfDeductionType: stored.pf_deduction_type ?? null,
    pfDeductionAmount: stored.pf_deduction_amount ?? null,
    isEsicActApplicable: stored.is_esic_act_applicable ?? null,
    esicDeductionBasis: stored.esic_deduction_basis ?? null,
    employeeEsicPercentage: stored.employee_esic_deduction_percentage ?? null,
    employerEsicPercentage: stored.employer_esic_deduction_percentage ?? null,
    isPtActApplicable: stored.is_pt_act_applicable ?? null,
    ptActType: stored.pt_act_type ?? null,
    isLwfActApplicable: stored.is_lwf_act_applicable ?? null,
    isTdsActApplicable: stored.is_tds_act_applicable ?? null,
    tdsPercentage: stored.tds_percentage ?? null,
    isOvertimeApplicable: stored.is_overtime_applicable ?? null,
    weeklyOff: stored.weekly_off ?? null,
  }
}

/** One API row as the grid reads it. */
export function toSalaryRegisterRow(item: SalaryRegisterItemResponse): SalaryRegisterRow {
  return {
    employeeId: item.employee_id,
    employeeServiceId: item.employee_service_id,
    employeeCode: text(item.employee_code),
    employeeName: text(item.employee_name),
    employeePrefix: text(item.employee_prefix),
    photo: text(item.photo),
    designationId: item.designation_id,
    designationName: text(item.designation_name),
    departmentId: item.department_id,
    departmentName: text(item.department_name),
    joiningDate: text(item.joining_date),
    leavingDate: text(item.leaving_date),
    status: item.status,
    attendance: toAttendance(item.attendance),
    wageStructure: toWageStructure(item.wage_structure),
    salaryComponents: (item.salary_components ?? []).map(toSalaryComponent),
    figures: toFigures(item),
    storedPresentDays: item.salary?.present_days ?? null,
    storedWorkingDays: item.salary?.working_days ?? null,
    storedWorkingHour: item.salary?.working_hour ?? null,
    storedActs: item.salary ? toStoredActs(item.salary) : null,
    isProcessed: item.salary !== null,
    salaryId: item.salary?.id ?? null,
    isPaid: item.salary?.is_paid ?? false,
    paymentDate: text(item.salary?.payment_date),
    isImported: item.salary?.is_import_from_sheet ?? false,
  }
}

/** The whole register read. */
export function toSalaryRegister(response: SalaryRegisterResponse): SalaryRegister {
  return {
    period: toPeriod(response.period),
    totals: toTotals(response.totals),
    rates: toRates(response.rates),
    items: response.items.map(toSalaryRegisterRow),
    total: response.total,
  }
}

/* ── Columns ────────────────────────────────────────────────────────────── */

/** A head as a *column*: which head it is and how to head the column. */
export type SalaryHeadColumn = Pick<SalaryHead, 'payComponentId' | 'code' | 'name'>

/**
 * The grid's allowance and deduction columns are **the company's own heads**,
 * read from the allowance / deduction master rather than gathered off the rows on
 * screen — see `use-salary-form`, which builds them from `useWageHeads` exactly as
 * the bulk wage grid does. The columns are therefore the same, in the same order,
 * whichever designation, month or tab is being looked at, and a head this
 * designation doesn't pay is a zero rather than a missing column.
 */

/** A row's heads by id, so a cell is a lookup rather than a scan per column. */
export function headAmounts(heads: SalaryHead[]): Map<number, number> {
  return new Map(heads.map((head) => [head.payComponentId, head.amount]))
}

/* ── Form ───────────────────────────────────────────────────────────────── */

/** A number as a grid cell holds it; `null`/`0`-less values read as blank. */
function cell(value: number | null | undefined): string {
  return value == null ? '' : String(value)
}

/**
 * The cells a row opens on.
 *
 * A processed row opens on what was *stored* — that's what the month was paid
 * on, and it's what a revision starts from. A pending row opens on the
 * attendance's `payable_days`, which is what the server would use anyway: the
 * cell states the default rather than leaving it to be guessed at, so anyone
 * paying a different number of days can see what they're changing it from.
 *
 * The head cells are seeded in **column order** rather than in the order the row
 * happens to carry its heads, so cell *n* of every row on the page is the same
 * head — which is what lets the grid address a cell by its column index. A row
 * that doesn't carry one of the page's heads opens it at nothing.
 *
 * None of them opens `overridden`: a head starts out following its configuration,
 * and only a double-click and a typed figure pins it.
 */
export function toSalaryRow(
  row: SalaryRegisterRow,
  heads: { allowances: SalaryHeadColumn[]; deductions: SalaryHeadColumn[] },
): SalaryRow {
  /*
   * A cell opens on the figure the head currently stands at, so double-clicking
   * one shows what it is about to replace rather than a zero.
   *
   * A **processed** row has that stored against it. A **pending** row has
   * nothing stored — the register stopped previewing the pay — so the figure
   * comes from the configuration instead: a `Fixed` head's flat amount is the
   * money itself, while a `Percentage` head opens blank because its figure is
   * the earned basic's share and `headCellAmount` works it out per render.
   */
  const configured = new Map(
    row.salaryComponents.map((component) => [component.payComponentId, component]),
  )

  const cells = (columns: SalaryHeadColumn[], carried: SalaryHead[]) =>
    columns.map((column) => {
      const stored = carried.find((head) => head.payComponentId === column.payComponentId)
      const config = configured.get(column.payComponentId)
      const seed = stored
        ? stored.amount
        : config?.valueType === 'Fixed'
          ? config.value
          : 0

      return {
        payComponentId: column.payComponentId,
        amount: cell(seed),
        overridden: false,
      }
    })

  return {
    employeeServiceId: row.employeeServiceId,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    presentDays: cell(
      row.isProcessed ? row.storedPresentDays : row.attendance.payableDays,
    ),
    workingDays: cell(
      row.storedWorkingDays ?? row.wageStructure?.workingDays ?? row.attendance.workingDays,
    ),
    otHours: row.figures.otHours ? cell(row.figures.otHours) : '',
    allowances: cells(heads.allowances, row.figures.allowances),
    deductions: cells(heads.deductions, row.figures.deductions),
    /* Opened on the stored figures, which is what a processed row is owed at and
       what a revision starts from. A pending row opens them at zero and they are
       priced by `salary-statutory` — the cell is the override, not the source. */
    statutory: {
      pf: { amount: cell(row.figures.employeePf), overridden: false },
      esic: { amount: cell(row.figures.employeeEsic), overridden: false },
      pt: { amount: cell(row.figures.employeePt), overridden: false },
      lwf: { amount: cell(row.figures.employeeLwf), overridden: false },
      tds: { amount: cell(row.figures.employeeTds), overridden: false },
    },
  }
}

/** The API's own spelling of the two salary types. */
function salaryType(value: string | undefined): 'DAILY' | 'MONTHLY' | null {
  const upper = (value ?? '').trim().toUpperCase()
  return upper === 'DAILY' || upper === 'MONTHLY' ? upper : null
}

/**
 * PT and LWF act type, in the two spellings that exist for it.
 *
 * The designation master stores and shows `As Per Act` / `Manual`; `bulk-save`
 * takes `AUTO` / `FIXED`. They are the same two answers, so the translation
 * belongs at the boundary — passing the master's spelling straight through sent
 * `null` on every row and lost the setting.
 */
function actType(value: string | null | undefined): 'AUTO' | 'FIXED' | null {
  const normalised = (value ?? '').trim().toUpperCase()
  if (normalised === 'AUTO' || normalised === 'AS PER ACT') return 'AUTO'
  if (normalised === 'FIXED' || normalised === 'MANUAL') return 'FIXED'
  return null
}

/** One of a fixed set of API strings, or `null` when it isn't one of them. */
function oneOf<T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
): T | null {
  return allowed.find((option) => option === value) ?? null
}

/** A head as the save's breakdown carries it. */
function toComponentPayload(head: SalaryHead): SalaryComponentPayload {
  return {
    pay_component_id: head.payComponentId,
    amount: head.amount,
    pf_applicable: head.pfApplicable,
    esic_applicable: head.esicApplicable,
    pt_applicable: head.ptApplicable,
  }
}

/**
 * One row of the save body: the **full snapshot** the screen priced the month at.
 *
 * Everything travels — the wage settings it used, the figures that came out and
 * the per-head breakdown behind them — because the API stores each figure as sent
 * and checks that the totals agree with the parts. That is what makes a
 * double-clicked allowance amount mean anything: it is written as typed, and
 * nothing on the server re-derives it from the designation afterwards.
 *
 * PF / ESIC / PT / LWF go out as deduction lines only where a head doesn't
 * already stand for them, matching how `rowFigures` totalled them — so whichever
 * way the company's catalog names them, `total_deduction` counts each one once.
 *
 * **What is deliberately not sent.** `bulk-save` accepts eight more act settings
 * than `GET /salary/register` reports: `employee_pf_contribution_on_wage_limit`
 * and its employer twin, `eps_applicable`, `deferred_pension_applicable` and its
 * max age, `lwf_deduct_from_wages`, and the three `*_applicable_on_overtime`
 * flags. The register's `wage_structure` carries none of them, so there is
 * nothing truthful to put there and they are left out rather than defaulted —
 * sending `false` would record "this designation does not cap PF at the wage
 * ceiling" as a fact the screen never knew. They are why `salary-statutory`
 * charges the employee's PF on the uncapped wage and leaves overtime out of
 * every act base: those are the readings that don't invent a setting. Once the
 * register reports them, both this function and `salary-statutory` should read
 * them rather than assume.
 */
export function salaryRowToPayload(
  row: SalaryRegisterRow,
  figures: SalaryRowFigures,
): SalarySaveRow {
  const wage = row.wageStructure

  return {
    employee_id: row.employeeId,
    employee_service_id: row.employeeServiceId,
    salary_id: row.salaryId,
    designation_id: row.designationId,
    department_id: row.departmentId,
    designation_wage_structure_id: wage?.id ?? null,

    salary_type: salaryType(wage?.salaryType),
    basic_pay: figures.basicPay,
    wages_per_day: figures.wagesPerDay,
    working_days: figures.workingDays || null,
    working_hour: row.storedWorkingHour,
    weekly_off: wage?.weeklyOff ?? row.storedActs?.weeklyOff ?? null,
    present_days: figures.presentDays,
    basic_pay_for_present_days: figures.earnedBasic,

    pf_act_applicable: wage?.isPfActApplicable ?? null,
    pf_deduction_type: oneOf(wage?.pfDeductionType, ['Percentage', 'Fixed'] as const),
    pf_deduction_amount: wage?.pfDeductionAmount ?? null,
    employer_pf: figures.employerPf,
    esic_act_applicable: wage?.isEsicActApplicable ?? null,
    esic_deduction_basis: oneOf(wage?.esicDeductionBasis, [
      'Wage Ceiling',
      'Gross Salary',
      'As Per Act',
    ] as const),
    /* The percentages the ESIC figures were actually taken at — stored per row,
       so a rate revised later can't be mistaken for the one this month paid. */
    employee_esic_deduction_percentage: figures.employeeEsicRate || null,
    employer_esic_deduction_percentage: figures.employerEsicRate || null,
    employer_esic: figures.employerEsic,
    pt_act_applicable: wage?.isPtActApplicable ?? null,
    pt_act_type: actType(wage?.ptActType),
    lwf_act_applicable: wage?.isLwfActApplicable ?? null,
    tds_act_applicable: wage?.isTdsActApplicable ?? null,
    tds_percentage: wage?.tdsPercentage ?? null,
    employee_tds: figures.employeeTds,

    overtime_applicable: wage?.isOvertimeApplicable ?? null,
    overtime_rate_per_hour: figures.otRate || null,
    ot_hours: figures.otHours,
    ot_amount: figures.otAmount,
    extra_days: figures.extraDays,
    extra_days_amount: figures.extraDaysAmount,

    total_allowance: figures.totalAllowance,
    total_deduction: figures.totalDeduction,
    gross_pay: figures.grossPay,
    net_pay: figures.netPay,

    employee_component: {
      allowance: figures.allowances.map(toComponentPayload),
      deduction: [...figures.deductions, ...figures.statutoryLines].map(
        toComponentPayload,
      ),
    },
  }
}

/* ── The designation's head configuration ───────────────────────────────── */

/**
 * How each head is configured — percentage or fixed, and at what — taken from the
 * **register itself**, off the `salary_components` each row carries.
 *
 * This is the right source twice over. It is version-correct: a month run for
 * March is priced on March's structure, which is not necessarily the one in force
 * today, and reading the configuration from anywhere else would put today's
 * percentages against last quarter's pay. And it costs nothing — the register is
 * already on screen, so no second request is made to find out what a head is.
 *
 * Collapsed across the page by pay component id. The register is read one
 * designation at a time, so the rows are all priced on the same structure and the
 * first row to name a head settles it; a row without a structure in force simply
 * contributes nothing.
 */
export function salaryHeadConfigsFromRegister(
  rows: SalaryRegisterRow[],
): SalaryHeadConfigs {
  const configs: SalaryHeadConfigs = new Map()

  rows.forEach((row) => {
    row.salaryComponents.forEach((component) => {
      if (configs.has(component.payComponentId)) return
      configs.set(component.payComponentId, {
        valueType: component.valueType,
        value: component.value,
        pfApplicable: component.pfApplicable,
        esicApplicable: component.esicApplicable,
        ptApplicable: component.ptApplicable,
      })
    })
  })

  return configs
}

/**
 * The heads the register's own components put on each side, in the master's
 * order — the columns as `salary_components` describes them.
 *
 * Used where the pay-component master hasn't answered yet, and as the check that
 * a head the structure actually configures never goes without a column: the
 * master is the wider list, but it is a second request and this one is free.
 */
export function salaryHeadColumnsFromRegister(rows: SalaryRegisterRow[]): {
  allowances: SalaryHeadColumn[]
  deductions: SalaryHeadColumn[]
} {
  const sides = {
    ALLOWANCE: new Map<number, SalaryComponent>(),
    DEDUCTION: new Map<number, SalaryComponent>(),
  }

  rows.forEach((row) => {
    row.salaryComponents.forEach((component) => {
      const side = sides[component.componentType as 'ALLOWANCE' | 'DEDUCTION']
      if (!side || side.has(component.payComponentId)) return
      side.set(component.payComponentId, component)
    })
  })

  const columns = (side: Map<number, SalaryComponent>) =>
    [...side.values()]
      .sort((a, b) => a.sortOrder - b.sortOrder || a.payComponentId - b.payComponentId)
      .map((component) => ({
        payComponentId: component.payComponentId,
        code: component.code,
        name: component.name,
      }))

  return {
    allowances: columns(sides.ALLOWANCE),
    deductions: columns(sides.DEDUCTION),
  }
}
