import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  useWatch,
  type Control,
  type FieldPath,
  type FieldValues,
  type UseFormSetValue,
} from 'react-hook-form'
import { Ban, CalendarClock, Check, RotateCcw, X } from 'lucide-react'
import { Combobox } from '@/components/ui/combobox'
import { CellTooltip, ColumnHint } from '@/components/common/wage-grid-fields'
import { cn } from '@/lib/utils'
import {
  ACCRUED_ON_MONTHLY_HINT,
  AMOUNT_MODE_OPTIONS,
  CALCULATION_BASE_OPTIONS,
  NET_PAY_BASE_HINT,
  PAYOUT_FREQUENCY_OPTIONS,
  PAYROLL_CALCULATION_HINT,
  PAYROLL_CALCULATION_OPTIONS,
  START_MONTH_OPTIONS,
} from '../constants'
import {
  DEFAULT_CALCULATION_BASE,
  DEFAULT_COMPONENT_SCHEDULE,
  isDefaultSchedule,
  needsStartMonth,
  monthName,
  resolveSchedule,
  shortMonthName,
  supportsAccrual,
  toStartMonthNumber,
} from '../lib/component-schedule'
import type {
  AmountMode,
  CalculationBase,
  ComponentSchedule,
  PayoutFrequency,
  PayrollCalculation,
} from '../lib/component-schedule'

/**
 * One head's **payout schedule**, as a chip that opens the four settings behind
 * it: payout frequency (with its start-month anchor), amount mode, payroll
 * calculation and — on a deduction only — the calculation base.
 *
 * One control for all four screens that configure a head: the designation's
 * create form, its wage structure history, HR's bulk wage grid and an employee's
 * own wage. They differ only in how much room the cell has, which is what `size`
 * answers — nothing about the settings themselves is per-screen, and the API
 * takes the same five fields from every one of them.
 *
 * **A chip rather than four controls in the cell.** The grid columns are ~110px
 * wide and already carry an amount, a unit toggle and three act markers; the
 * settings are also the exception rather than the rule — every head defaults to
 * plain monthly — so the closed chip states the frequency, marks itself when
 * anything is off-default, and the rest opens on demand.
 *
 * The coupling the API enforces is applied on every write, not merely rendered:
 * picking a frequency runs the whole schedule back through `resolveSchedule`, so
 * Monthly loses its anchor and its amount mode while any other frequency gains
 * the default anchor. A form can therefore never hold a state the save would be
 * refused for.
 */
export function ComponentScheduleField({
  value,
  onChange,
  side,
  label,
  error,
  disabled = false,
  readOnly = false,
  size = 'grid',
}: {
  value: ComponentSchedule
  onChange: (value: ComponentSchedule) => void
  /** Which side the head sits on — a deduction alone gets a calculation base. */
  side: 'allowance' | 'deduction'
  /** The head's name, for the panel's title and the chip's tooltip. */
  label: string
  /** The row's own schedule error — a missing start month, typically. */
  error?: string
  /** The head has no value, so its schedule doesn't apply yet. */
  disabled?: boolean
  /** Show what was configured without offering to change it — a saved row. */
  readOnly?: boolean
  /** `grid` is the dense table chip; `form` the roomier one on the create form. */
  size?: 'grid' | 'form'
}) {
  const anchor = useAnchoredPanel()
  const schedule = resolveSchedule(value)
  const frequency = PAYOUT_FREQUENCY_OPTIONS.find(
    (option) => option.value === schedule.payoutFrequency,
  )
  const customised = !isDefaultSchedule(schedule, side)
  const startMonth = toStartMonthNumber(schedule.startMonth)

  /**
   * Every write goes through the coupling rules, so changing the frequency
   * repairs the anchor and the amount mode in the same update rather than
   * leaving a state the API would refuse.
   */
  const patch = (next: Partial<ComponentSchedule>) => {
    if (readOnly) return
    onChange(resolveSchedule({ ...schedule, ...next }))
  }

  /** The closed chip's tint while the schedule is anything but the default. */
  const tone =
    side === 'allowance'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
      : 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400'

  /** The picked pill inside the panel — solid, so "chosen" needs no second look. */
  const accent =
    side === 'allowance'
      ? 'border-emerald-500/40 bg-emerald-500 text-white dark:bg-emerald-600'
      : 'border-rose-500/40 bg-rose-500 text-white dark:bg-rose-600'

  const chip = (
    <button
      ref={anchor.triggerRef}
      type="button"
      disabled={disabled}
      onClick={() => anchor.setOpen((open) => !open)}
      aria-expanded={anchor.open}
      className={cn(
        /*
         * Sized to sit under the PF / ESI / PT markers as a peer of theirs — same
         * height, same weight, same rounding. It used to be a 9px sliver, which
         * read as a caption on the cell rather than as the control it is.
         */
        'flex w-full cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-md border font-bold uppercase leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        size === 'grid' ? 'px-2 py-1 text-[11px]' : 'h-9 shrink-0 px-2.5 text-xs',
        error
          ? 'border-destructive bg-destructive/10 text-destructive'
          : customised || anchor.open
            ? tone
            : 'border-current/50 bg-muted text-muted-foreground hover:text-primary',
      )}
    >
      <CalendarClock className={size === 'grid' ? 'size-3 shrink-0' : 'size-3.5 shrink-0'} />
      {frequency?.short ?? 'Monthly'}
      {startMonth !== null && <span>· {shortMonthName(startMonth)}</span>}
      {/* One dot for "there is more here than the label says" — an accrued
          release, or a head held out of every base. */}
      {(schedule.amountMode === 'ACCRUED' ||
        schedule.payrollCalculation === 'EXCLUDE') && <span aria-hidden>•</span>}
    </button>
  )

  return (
    <>
      {/*
        The tooltip is held closed while the panel is open: it would otherwise
        hang over the row saying what the panel's own header already says, and on
        a chip near the top of the grid it covers the panel itself.
      */}
      <CellTooltip
        label={error ?? `Payout settings — ${label}`}
        suppressed={anchor.open}
      >
        {chip}
      </CellTooltip>

      {anchor.open &&
        !disabled &&
        anchor.coords &&
        createPortal(
          <div
            ref={anchor.panelRef}
            style={{
              position: 'fixed',
              left: anchor.coords.left,
              top: anchor.coords.dropUp ? undefined : anchor.coords.top,
              bottom: anchor.coords.dropUp
                ? window.innerHeight - anchor.coords.top
                : undefined,
              width: PANEL_WIDTH,
            }}
            className="z-60 flex max-h-[min(26rem,80vh)] flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
          >
            {/*
              The header states what is being configured AND what it currently
              comes to, because the panel is opened from a chip that only had
              room for the frequency — the summary line is where "quarterly,
              anchored on March, accrued" is actually readable.
            */}
            <header className="shrink-0 border-b border-border bg-muted/50 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={cn(
                      'size-1.5 shrink-0 rounded-full',
                      side === 'allowance' ? 'bg-emerald-500' : 'bg-rose-500',
                    )}
                  />
                  <span className="truncate text-xs font-semibold">{label}</span>
                </span>
                <span className="flex shrink-0 items-center gap-0.5">
                  {/* Only offered once there is something to undo, and only where
                      the panel can write at all. */}
                  {!readOnly && customised && (
                    <CellTooltip label="Back to a plain monthly payout, in the calculation">
                      <button
                        type="button"
                        onClick={() => onChange({ ...DEFAULT_COMPONENT_SCHEDULE })}
                        className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Reset the payout schedule"
                      >
                        <RotateCcw className="size-3.5" />
                      </button>
                    </CellTooltip>
                  )}
                  <button
                    type="button"
                    onClick={() => anchor.setOpen(false)}
                    aria-label="Close"
                    className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              </div>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                {readOnly && (
                  <span className="mr-1 font-semibold uppercase tracking-wider">
                    View only ·
                  </span>
                )}
                {scheduleSentence(schedule, side)}
              </p>
            </header>

            {/*
              The controls, one setting to a block, separated rather than merely
              spaced — at five settings deep an evenly-spaced column reads as one
              long list and the labels stop registering as headings.
            */}
            <div className="divide-y divide-border overflow-y-auto overscroll-contain">
              {/*
                Deduction rows only, and first: a deduction's figure means nothing
                until you know what it is priced on. An allowance sending a
                `calculation_base` is a 400 naming the head, so the control simply
                isn't rendered on that side.
              */}
              {side === 'deduction' && (
                <Setting
                  label="Calculation Base"
                  /* The one hint worth the space: "Net Pay" as a BASE is not the
                     net on the payslip, and nothing else on screen says so. */
                  hint={
                    schedule.calculationBase === 'NET_PAY' ? NET_PAY_BASE_HINT : undefined
                  }
                >
                  <Combobox
                    value={schedule.calculationBase}
                    onChange={(base) =>
                      patch({
                        calculationBase: (base ||
                          DEFAULT_CALCULATION_BASE) as CalculationBase,
                      })
                    }
                    options={CALCULATION_BASE_OPTIONS}
                    searchable={false}
                    disabled={readOnly}
                    triggerClassName="h-8 text-xs"
                    panelMinWidth={PANEL_WIDTH - 24}
                  />
                </Setting>
              )}

              <Setting label="Payout Frequency">
                <PillGroup>
                  {PAYOUT_FREQUENCY_OPTIONS.map((option) => (
                    <Pill
                      key={option.value}
                      label={option.short}
                      hint={option.hint}
                      active={schedule.payoutFrequency === option.value}
                      accent={accent}
                      readOnly={readOnly}
                      onClick={() =>
                        patch({ payoutFrequency: option.value as PayoutFrequency })
                      }
                    />
                  ))}
                </PillGroup>
              </Setting>

              {/*
                The anchor. Hidden on Monthly and mandatory otherwise — the API
                refuses either mistake, so the picker's presence *is* the rule.
              */}
              {needsStartMonth(schedule.payoutFrequency) && (
                <Setting
                  label="Start Month"
                  hint="The month the cycle is anchored on. Every payout month follows from it."
                  error={error}
                >
                  <Combobox
                    value={schedule.startMonth}
                    onChange={(month) => patch({ startMonth: month })}
                    options={START_MONTH_OPTIONS}
                    searchable={false}
                    disabled={readOnly}
                    triggerClassName="h-8 text-xs"
                  />
                </Setting>
              )}

              {/* No block hint: the locked "Accrued" carries the reason in its own
                  tooltip, and spelling it out here cost two lines of the panel. */}
              <Setting label="Amount Mode">
                <PillGroup>
                  {AMOUNT_MODE_OPTIONS.map((option) => {
                    const locked =
                      option.value === 'ACCRUED' &&
                      !supportsAccrual(schedule.payoutFrequency)
                    return (
                      <Pill
                        key={option.value}
                        label={option.label}
                        hint={locked ? ACCRUED_ON_MONTHLY_HINT : option.hint}
                        active={schedule.amountMode === option.value}
                        accent={accent}
                        readOnly={readOnly}
                        disabled={locked}
                        onClick={() => patch({ amountMode: option.value as AmountMode })}
                      />
                    )
                  })}
                </PillGroup>
              </Setting>

              <Setting label="Payroll Calculation">
                <PillGroup>
                  {PAYROLL_CALCULATION_OPTIONS.map((option) => (
                    <Pill
                      key={option.value}
                      label={option.label}
                      hint={option.hint}
                      icon={option.value === 'INCLUDE' ? Check : Ban}
                      active={schedule.payrollCalculation === option.value}
                      accent={
                        option.value === 'EXCLUDE'
                          ? 'border-amber-500/40 bg-amber-500 text-white dark:bg-amber-600'
                          : 'border-primary/40 bg-primary text-primary-foreground'
                      }
                      readOnly={readOnly}
                      onClick={() =>
                        patch({
                          payrollCalculation: option.value as PayrollCalculation,
                        })
                      }
                    />
                  ))}
                </PillGroup>
              </Setting>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}


/**
 * The schedule chip bound to a form row, wherever that row sits.
 *
 * The five settings are five leaves of the row (`allowances.2.payoutFrequency`
 * and its siblings), so this subscribes to exactly those five and writes them
 * back one by one. Deliberately *not* a `Controller` over the row object: that
 * would re-render the chip on every keystroke in the row's amount, and there are
 * up to twenty of these per grid row.
 *
 * `path` is the row's own path — `allowances.2` on the designation form,
 * `rows.0.deductions.4` on a wage grid.
 */
export function ComponentScheduleCell<TFieldValues extends FieldValues>({
  control,
  setValue,
  path,
  side,
  label,
  error,
  disabled = false,
  readOnly = false,
  size = 'grid',
  variant = 'chip',
}: {
  control: Control<TFieldValues>
  setValue: UseFormSetValue<TFieldValues>
  path: string
  side: 'allowance' | 'deduction'
  label: string
  error?: string
  disabled?: boolean
  readOnly?: boolean
  size?: 'grid' | 'form'
  /**
   * `chip` puts the settings behind a popover — the only thing a ~130px grid cell
   * has room for. `inline` lays them out under the head as labelled rows of
   * pills, for the designation form, where the row is the full width of the
   * column and hiding four settings behind a chip only costs a click.
   */
  variant?: 'chip' | 'inline'
}) {
  const field = (key: keyof ComponentSchedule) =>
    `${path}.${key}` as FieldPath<TFieldValues>

  /*
   * Five names in, five values out, in the order `SCHEDULE_KEYS` lists them.
   * `useWatch` types an array subscription as `unknown[]` in effect — the five
   * leaves have five different types — so the tuple is asserted here and read
   * defensively below, which also covers the first render of a row whose fields
   * haven't registered yet.
   */
  const watched = useWatch({ control, name: SCHEDULE_KEYS.map(field) }) as unknown[]

  const schedule: ComponentSchedule = {
    payoutFrequency: (watched[0] as PayoutFrequency) ?? 'MONTHLY',
    startMonth: (watched[1] as string) ?? '',
    amountMode: (watched[2] as AmountMode) ?? 'PER_PAYOUT',
    payrollCalculation: (watched[3] as PayrollCalculation) ?? 'INCLUDE',
    calculationBase: (watched[4] as CalculationBase) ?? DEFAULT_CALCULATION_BASE,
  }

  const onChange = (next: ComponentSchedule) =>
    SCHEDULE_KEYS.forEach((key) => {
      if (next[key] === schedule[key]) return
      setValue(field(key), next[key] as never, {
        shouldDirty: true,
        shouldValidate: false,
      })
    })

  if (variant === 'inline') {
    return (
      <ComponentScheduleInline
        value={schedule}
        onChange={onChange}
        side={side}
        error={error}
        readOnly={readOnly}
      />
    )
  }

  return (
    <ComponentScheduleField
      value={schedule}
      onChange={onChange}
      side={side}
      label={label}
      error={error}
      disabled={disabled}
      readOnly={readOnly}
      size={size}
    />
  )
}

/** The schedule's own field names, in one place so the two writers agree. */
const SCHEDULE_KEYS = [
  'payoutFrequency',
  'startMonth',
  'amountMode',
  'payrollCalculation',
  'calculationBase',
] as const satisfies readonly (keyof ComponentSchedule)[]

/** How wide the panel opens — sized to the longest calculation-base label. */
const PANEL_WIDTH = 288
const PANEL_MAX_HEIGHT = 380
const GAP = 4
const VIEWPORT_PADDING = 8

/**
 * The same four settings laid out **inline**, under the head they belong to —
 * what the designation form uses.
 *
 * The chip-and-popover form exists because a grid cell is ~130px wide. This one
 * doesn't have that problem: the row is a full column of the form, so every
 * answer is on screen and picking one is a single click rather than open,
 * choose, close. The two share `resolveSchedule`, so the coupling the API
 * enforces is applied identically either way.
 *
 * The order differs by side, deliberately. A deduction leads with **Calculation
 * Base** because that is the question its figure means nothing without; an
 * allowance has no base to name — the API refuses one — so it leads with the
 * frequency.
 */
export function ComponentScheduleInline({
  value,
  onChange,
  side,
  error,
  readOnly = false,
}: {
  value: ComponentSchedule
  onChange: (value: ComponentSchedule) => void
  side: 'allowance' | 'deduction'
  /** The schedule's own complaint — a missing start month, typically. */
  error?: string
  readOnly?: boolean
}) {
  const schedule = resolveSchedule(value)
  const isAllowance = side === 'allowance'

  const patch = (next: Partial<ComponentSchedule>) => {
    if (readOnly) return
    onChange(resolveSchedule({ ...schedule, ...next }))
  }

  const accent = isAllowance
    ? 'border-emerald-500/40 bg-emerald-500 text-white dark:bg-emerald-600'
    : 'border-rose-500/40 bg-rose-500 text-white dark:bg-rose-600'

  return (
    <div
      className={cn(
        'mt-2 flex flex-wrap items-start gap-x-6 gap-y-3 border-t pt-2',
        isAllowance ? 'border-emerald-500/15' : 'border-rose-500/15',
      )}
    >
      {/* Deduction only — the API refuses a calculation base on an allowance. */}
      {!isAllowance && (
        <InlineSetting
          label="Calculation Base"
          hint={`What this head is priced on. ${NET_PAY_BASE_HINT}`}
        >
          <Combobox
            value={schedule.calculationBase}
            onChange={(base) =>
              patch({
                calculationBase: (base || DEFAULT_CALCULATION_BASE) as CalculationBase,
              })
            }
            options={CALCULATION_BASE_OPTIONS}
            searchable={false}
            disabled={readOnly}
            className="w-56"
            triggerClassName="h-7 text-xs"
            panelMinWidth={240}
          />
        </InlineSetting>
      )}

      <InlineSetting
        label="Payout Frequency"
        hint="How often the head is actually paid out. Anything but monthly needs a start month to anchor the cycle on."
      >
        <PillGroup>
          {PAYOUT_FREQUENCY_OPTIONS.map((option) => (
            <Pill
              key={option.value}
              label={option.short}
              /* The abbreviations don't explain themselves, and what is being
                 chosen is which months the head actually pays in. */
              hint={option.hint}
              active={schedule.payoutFrequency === option.value}
              accent={accent}
              readOnly={readOnly}
              onClick={() => patch({ payoutFrequency: option.value as PayoutFrequency })}
            />
          ))}
        </PillGroup>
      </InlineSetting>

      {/*
        Shown off monthly and hidden on it — which IS the rule, not a hint at it:
        the API refuses a monthly head that carries an anchor and a non-monthly
        one that doesn't.
      */}
      {needsStartMonth(schedule.payoutFrequency) && (
        <InlineSetting
          label="Start Month"
          hint="The month the cycle is anchored on — every payout month follows from it."
          error={error}
        >
          <Combobox
            value={schedule.startMonth}
            onChange={(month) => patch({ startMonth: month })}
            options={START_MONTH_OPTIONS}
            searchable={false}
            disabled={readOnly}
            className="w-32"
            triggerClassName="h-7 text-xs"
          />
        </InlineSetting>
      )}

      <InlineSetting
        label="Amount Mode"
        hint={
          supportsAccrual(schedule.payoutFrequency)
            ? 'Per Payout uses the figure as entered in each payout month. Accrued treats it as a monthly accrual and releases the whole period in one payout.'
            : ACCRUED_ON_MONTHLY_HINT
        }
      >
        <PillGroup>
          {AMOUNT_MODE_OPTIONS.map((option) => {
            const locked =
              option.value === 'ACCRUED' && !supportsAccrual(schedule.payoutFrequency)
            return (
              <Pill
                key={option.value}
                label={option.label}
                /* A locked "Accrued" explains why it's dead; a live one explains
                   what picking it would do. */
                hint={locked ? ACCRUED_ON_MONTHLY_HINT : option.hint}
                active={schedule.amountMode === option.value}
                accent={accent}
                readOnly={readOnly}
                disabled={locked}
                onClick={() => patch({ amountMode: option.value as AmountMode })}
              />
            )
          })}
        </PillGroup>
      </InlineSetting>

      <InlineSetting label="Payroll Calculation" hint={PAYROLL_CALCULATION_HINT}>
        <PillGroup>
          {PAYROLL_CALCULATION_OPTIONS.map((option) => (
            <Pill
              key={option.value}
              label={option.label}
              hint={option.hint}
              icon={option.value === 'INCLUDE' ? Check : Ban}
              active={schedule.payrollCalculation === option.value}
              accent={
                option.value === 'EXCLUDE'
                  ? 'border-amber-500/40 bg-amber-500 text-white dark:bg-amber-600'
                  : 'border-primary/40 bg-primary text-primary-foreground'
              }
              readOnly={readOnly}
              onClick={() =>
                patch({ payrollCalculation: option.value as PayrollCalculation })
              }
            />
          ))}
        </PillGroup>
      </InlineSetting>
    </div>
  )
}

/**
 * The frame a set of pills sits in — one bordered, filled track, so the group
 * reads as a segmented control rather than as loose buttons on the row's own
 * tinted background.
 *
 * It is what makes the *unpicked* answers legible: on a tinted row a transparent
 * pill has no ground of its own, and the whole set fades into the surface it sits
 * on. Against this track the picked one is solid and the rest are plain text on
 * white, which is the contrast the row is read by.
 */
function PillGroup({ children }: { children: React.ReactNode }) {
  return (
    /* `w-fit` + `self-start`: the track is a frame around the answers, so it ends
       where they do. Left to stretch it filled the block's whole width and the
       empty remainder read as a missing option. */
    <div className="flex w-fit max-w-full flex-wrap items-center gap-0.5 self-start rounded-lg border border-input bg-background p-1">
      {children}
    </div>
  )
}

/** One labelled setting on the inline row — its caption, then its control. */
function InlineSetting({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        <ColumnHint text={hint} />
      </span>
      {children}
      {error && <span className="text-[10px] leading-snug text-destructive">{error}</span>}
    </div>
  )
}

/**
 * One answer on the inline row. Solid while picked, plain while not — at this
 * size a tinted-outline "on" state reads the same as "off" at a glance, and the
 * whole point of the row is that the current answer is obvious without a click.
 */
function Pill({
  label,
  hint,
  icon: Icon,
  active,
  accent,
  readOnly,
  disabled = false,
  onClick,
}: {
  label: string
  /** What picking this answer does — every pill carries one. */
  hint?: string
  icon?: typeof Check
  active: boolean
  accent: string
  readOnly: boolean
  disabled?: boolean
  onClick: () => void
}) {
  const pill = (
    <button
      type="button"
      disabled={readOnly || disabled}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold leading-none transition-colors',
        readOnly || disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        active
          ? accent
          : cn(
              'border-transparent bg-transparent text-muted-foreground',
              disabled
                ? 'opacity-40'
                : readOnly
                  ? 'opacity-60'
                  : 'hover:bg-muted hover:text-foreground',
            ),
        'shrink-0 whitespace-nowrap',
      )}
    >
      {Icon && <Icon className="size-3 shrink-0" />}
      {label}
    </button>
  )

  return hint ? <CellTooltip label={hint}>{pill}</CellTooltip> : pill
}

/**
 * A read-only summary of one saved head's schedule, as a line of chips under its
 * amount — the history's counterpart to the editable chip.
 *
 * A plain monthly head shows nothing: that is what almost every head is, and a
 * "Monthly" chip on every row of the history would cost the row's whole second
 * line to say what the absence already says.
 */
export function ComponentScheduleSummary({
  schedule,
  side,
}: {
  schedule: ComponentSchedule
  side: 'allowance' | 'deduction'
}) {
  if (isDefaultSchedule(schedule, side)) return null

  const frequency = PAYOUT_FREQUENCY_OPTIONS.find(
    (option) => option.value === schedule.payoutFrequency,
  )
  const anchor = toStartMonthNumber(schedule.startMonth)
  const base = CALCULATION_BASE_OPTIONS.find(
    (option) => option.value === schedule.calculationBase,
  )

  const marks = [
    schedule.payoutFrequency !== 'MONTHLY' && {
      label: anchor
        ? `${frequency?.short ?? ''} · ${shortMonthName(anchor)}`
        : (frequency?.short ?? ''),
      hint: `Paid ${frequency?.label.toLowerCase()}${
        anchor ? `, anchored on ${shortMonthName(anchor)}` : ''
      }`,
      tone: 'bg-primary/15 text-primary',
    },
    schedule.amountMode === 'ACCRUED' && {
      label: 'ACCR',
      hint: 'Accrued — the whole period is released in one payout',
      tone: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
    },
    schedule.payrollCalculation === 'EXCLUDE' && {
      label: 'EXCL',
      hint: 'Excluded from every base the other heads calculate on',
      tone: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    },
    side === 'deduction' &&
      schedule.calculationBase !== DEFAULT_CALCULATION_BASE && {
        label: base?.label ?? schedule.calculationBase,
        hint: `Calculated on ${base?.label ?? schedule.calculationBase}`,
        tone: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
      },
  ].filter(Boolean) as { label: string; hint: string; tone: string }[]

  return (
    <span className="flex flex-wrap items-center justify-center gap-1">
      {marks.map((mark) => (
        <CellTooltip key={mark.label} label={mark.hint}>
          <span
            className={cn(
              'max-w-full truncate rounded px-1 py-px text-[9px] font-bold uppercase leading-tight',
              mark.tone,
            )}
          >
            {mark.label}
          </span>
        </CellTooltip>
      ))}
    </span>
  )
}

/* ── The panel's own furniture ──────────────────────────────────────────── */

/**
 * The whole schedule in one line, for the panel's header.
 *
 * The closed chip only has room for the frequency, so this is where the rest of
 * it becomes legible — and where a reader can check what they just picked
 * without re-reading four separate controls.
 */
function scheduleSentence(
  schedule: ComponentSchedule,
  side: 'allowance' | 'deduction',
): string {
  const frequency =
    PAYOUT_FREQUENCY_OPTIONS.find((option) => option.value === schedule.payoutFrequency)
      ?.label ?? 'Monthly'
  const anchor = toStartMonthNumber(schedule.startMonth)
  const base = CALCULATION_BASE_OPTIONS.find(
    (option) => option.value === schedule.calculationBase,
  )

  return [
    anchor ? `${frequency} from ${monthName(anchor)}` : frequency,
    schedule.amountMode === 'ACCRUED' ? 'accrued' : null,
    schedule.payrollCalculation === 'EXCLUDE' ? 'out of every base' : null,
    side === 'deduction' && base ? `on ${base.label}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** One labelled setting inside the panel, with its explanation underneath. */
function Setting({
  label,
  hint,
  error,
  children,
}: {
  label: string
  /**
   * Shown only where the answer isn't self-evident — a locked-out option, an
   * `EXCLUDE` that surprises, a base that isn't what its name suggests. Every
   * option carries its own tooltip, so a hint under *every* block would be a
   * wall of text repeating them.
   */
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 px-3 py-2.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
      {error ? (
        <span className="text-[11px] leading-snug text-destructive">{error}</span>
      ) : hint ? (
        <span className="text-[11px] leading-snug text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  )
}

interface PanelCoords {
  left: number
  top: number
  dropUp: boolean
}

/**
 * The panel's position, in viewport coordinates against its trigger — the same
 * approach the combobox takes, and for the same reason: the chip lives inside a
 * grid that scrolls both ways, so a panel positioned relative to it would be
 * clipped by the scrollport. Portalled to the body and repositioned on scroll
 * instead.
 */
function useAnchoredPanel() {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<PanelCoords | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open) return

    const reposition = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropUp = spaceBelow < PANEL_MAX_HEIGHT && rect.top > spaceBelow
      const maxLeft = window.innerWidth - PANEL_WIDTH - VIEWPORT_PADDING
      const left = Math.min(
        Math.max(VIEWPORT_PADDING, rect.left),
        Math.max(VIEWPORT_PADDING, maxLeft),
      )
      setCoords({ left, top: dropUp ? rect.top - GAP : rect.bottom + GAP, dropUp })
    }

    reposition()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return
      }
      /* The start-month and calculation-base dropdowns portal out of the panel,
         so a click on one of their options is outside both refs. */
      if (target instanceof Element && target.closest('[data-combobox-portal]')) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return { open, setOpen, coords, triggerRef, panelRef }
}
