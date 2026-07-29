import type { ReactNode } from 'react'
import { Controller } from 'react-hook-form'
import {
  CircleMinus,
  CirclePlus,
  IndianRupee,
  Percent,
  type LucideIcon,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { useDesignationForm } from '../hooks/use-designation-form'

type DesignationForm = ReturnType<typeof useDesignationForm>

type AllowanceDeductionSectionProps = Pick<
  DesignationForm,
  | 'register'
  | 'control'
  | 'errors'
  | 'allowanceHeads'
  | 'deductionHeads'
  | 'componentsLoading'
  | 'pfActApplicable'
  | 'esicActApplicable'
  | 'ptActApplicable'
>

/**
 * Bottom half of the designation form — every allowance and deduction head in
 * the master, listed as fixed rows. Nothing is picked, added or removed here:
 * an allowance row takes a value (a share of basic pay or a flat amount) and the
 * acts it counts towards, and leaving the value blank means it doesn't apply.
 * Deduction heads are informational — payroll sets their amounts.
 */
export function AllowanceDeductionSection({
  register,
  control,
  errors,
  allowanceHeads,
  deductionHeads,
  componentsLoading,
  pfActApplicable,
  esicActApplicable,
  ptActApplicable,
}: AllowanceDeductionSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {/* ── Allowances ── */}
      <HeadColumn
        icon={CirclePlus}
        title="Allowances"
        description="Set a value for the heads that apply to this designation"
        iconTone="text-emerald-600 dark:text-emerald-400"
        count={allowanceHeads.length}
        loading={componentsLoading}
        emptyLabel="No allowance heads in the master yet."
      >
        {allowanceHeads.map((head, index) => (
          <HeadRowShell
            key={head.id}
            index={index}
            label={head.label}
            tone="border-emerald-500/20 bg-emerald-500/5"
            indexTone="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            error={errors.allowances?.[index]?.amount?.message}
          >
            {/* Value — the unit button flips the row between percentage and flat amount. */}
            <Controller
              control={control}
              name={`allowances.${index}.valueType`}
              render={({ field }) => (
                <div className="flex h-9 shrink-0 items-stretch overflow-hidden rounded-md border border-input bg-background">
                  <ValueTypeButton value={field.value} onChange={field.onChange} />
                  <Input
                    inputMode="decimal"
                    placeholder="0"
                    className="h-full w-20 rounded-none border-0 focus-visible:ring-0"
                    {...register(`allowances.${index}.amount`)}
                  />
                </div>
              )}
            />

            {/* Which statutory wages this allowance counts towards. */}
            <div className="flex shrink-0 items-center gap-2.5">
              <Controller
                control={control}
                name={`allowances.${index}.pfApplicable`}
                render={({ field }) => (
                  <ActMarker
                    label="PF"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!pfActApplicable}
                    activeTone="text-primary"
                  />
                )}
              />
              <Controller
                control={control}
                name={`allowances.${index}.esicApplicable`}
                render={({ field }) => (
                  <ActMarker
                    label="ESI"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!esicActApplicable}
                    activeTone="text-emerald-600 dark:text-emerald-400"
                  />
                )}
              />
              <Controller
                control={control}
                name={`allowances.${index}.ptApplicable`}
                render={({ field }) => (
                  <ActMarker
                    label="PT"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!ptActApplicable}
                    activeTone="text-violet-600 dark:text-violet-400"
                  />
                )}
              />
            </div>
          </HeadRowShell>
        ))}
      </HeadColumn>

      {/* ── Deductions ── */}
      <HeadColumn
        icon={CircleMinus}
        title="Deductions"
        description="The deduction heads applied to this designation"
        iconTone="text-rose-600 dark:text-rose-400"
        count={deductionHeads.length}
        loading={componentsLoading}
        emptyLabel="No deduction heads in the master yet."
        footnote={statutoryNote({ pfActApplicable, esicActApplicable, ptActApplicable })}
      >
        {deductionHeads.map((head, index) => (
          <HeadRowShell
            key={head.id}
            index={index}
            label={head.label}
            tone="border-rose-500/20 bg-rose-500/5"
            indexTone="bg-rose-500/15 text-rose-700 dark:text-rose-400"
          />
        ))}
      </HeadColumn>
    </div>
  )
}

/** Statutory heads payroll adds on its own, based on the act toggles. */
function statutoryNote({
  pfActApplicable,
  esicActApplicable,
  ptActApplicable,
}: {
  pfActApplicable: boolean
  esicActApplicable: boolean
  ptActApplicable: boolean
}): string | undefined {
  const applied = [
    pfActApplicable && 'PF',
    esicActApplicable && 'ESIC',
    ptActApplicable && 'PT',
  ].filter(Boolean) as string[]
  if (applied.length === 0) return undefined
  return `${applied.join(', ')} ${applied.length === 1 ? 'is' : 'are'} deducted automatically from the applicable acts, on top of these heads.`
}

interface HeadRowShellProps {
  index: number
  label: string
  /** Tint for the row surface — light-mode fill, tinted border in both themes. */
  tone: string
  /** Tint for the row's position badge. */
  indexTone: string
  /** Trailing controls, e.g. an allowance's value and act markers. */
  children?: ReactNode
  error?: string
}

/**
 * One head row — a single tinted line: position, head name, then whatever
 * trailing controls the side needs. Wraps rather than squashing when the column
 * gets narrow.
 */
function HeadRowShell({
  index,
  label,
  tone,
  indexTone,
  children,
  error,
}: HeadRowShellProps) {
  return (
    <li className={cn('rounded-lg border px-2.5 py-2', tone, 'dark:bg-transparent')}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold',
            indexTone,
          )}
        >
          {index + 1}
        </span>
        <span
          className="min-w-40 flex-1 truncate text-sm font-medium text-foreground"
          title={label}
        >
          {label}
        </span>
        {children}
      </div>
      {error && <p className="mt-1 pl-8 text-xs text-destructive">{error}</p>}
    </li>
  )
}

interface HeadColumnProps {
  icon: LucideIcon
  title: string
  description: string
  iconTone: string
  count: number
  loading: boolean
  emptyLabel: string
  footnote?: string
  children: ReactNode
}

/** One side of the section — a titled column listing that side's heads. */
function HeadColumn({
  icon: Icon,
  title,
  description,
  iconTone,
  count,
  loading,
  emptyLabel,
  footnote,
  children,
}: HeadColumnProps) {
  return (
    <section className="rounded-xl border border-border p-4">
      <header className="flex items-start gap-2.5">
        <Icon className={cn('mt-0.5 size-5 shrink-0', iconTone)} />
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </header>

      {loading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : count === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">{children}</ul>
      )}

      {footnote && <p className="mt-3 text-xs text-muted-foreground">{footnote}</p>}
    </section>
  )
}

/**
 * The amount input's unit prefix: shows the unit in force and flips to the other
 * on click, so one control carries both the choice and its meaning.
 */
function ValueTypeButton({
  value,
  onChange,
}: {
  value: 'Percentage' | 'Fixed'
  onChange: (value: 'Percentage' | 'Fixed') => void
}) {
  const isPercentage = value === 'Percentage'
  const Icon = isPercentage ? Percent : IndianRupee
  const action = isPercentage ? 'Switch to Fixed Amount' : 'Switch to Percentage'

  return (
    <button
      type="button"
      onClick={() => onChange(isPercentage ? 'Fixed' : 'Percentage')}
      title={action}
      aria-label={action}
      className={cn(
        'flex w-9 shrink-0 cursor-pointer items-center justify-center border-r transition-colors',
        isPercentage
          ? 'border-primary/20 bg-primary/10 text-primary hover:bg-primary/20'
          : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400',
      )}
    >
      <Icon className="size-3.5" />
    </button>
  )
}

/** Marks whether an allowance counts towards one act's wages. */
function ActMarker({
  label,
  checked,
  onCheckedChange,
  disabled,
  activeTone,
}: {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled: boolean
  /** Label colour while the marker is on, matching that act's tint. */
  activeTone: string
}) {
  const on = checked && !disabled

  return (
    <span
      className="flex items-center gap-1"
      title={disabled ? `${label} act is not applicable to this designation` : undefined}
    >
      <Switch
        checked={on}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={`${label} applicable`}
      />
      <span
        className={cn(
          'text-[11px] font-semibold',
          disabled ? 'text-muted-foreground/50' : on ? activeTone : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
    </span>
  )
}
