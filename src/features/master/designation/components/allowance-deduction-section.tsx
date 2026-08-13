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
import { CellTooltip } from '@/components/common/wage-grid-fields'
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
 * the master, listed as fixed rows. Nothing is picked, added or removed here: a
 * row takes a value (a share of basic pay or a flat amount) and the acts it
 * counts towards, and leaving the value blank means the head doesn't apply.
 *
 * Both sides take the same row, because the API takes both in one
 * `salary_components` array with one shape — a head's `type` in the master
 * decides which side it lands on, and the request never says which.
 *
 * Only an allowance carries the act markers. They say which statutory wages a
 * head is *added* to, which is a question about pay — a deduction is taken out of
 * that pay, so there is nothing for it to count towards.
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
          <ComponentRow
            key={head.id}
            side="allowances"
            index={index}
            label={head.label}
            tone="border-emerald-500/20 bg-emerald-500/5"
            indexTone="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            error={errors.allowances?.[index]?.amount?.message}
            register={register}
            control={control}
            acts={{
              pf: pfActApplicable,
              esic: esicActApplicable,
              pt: ptActApplicable,
            }}
          />
        ))}
      </HeadColumn>

      {/* ── Deductions ── */}
      <HeadColumn
        icon={CircleMinus}
        title="Deductions"
        description="Set a value for the deduction heads that apply"
        iconTone="text-rose-600 dark:text-rose-400"
        count={deductionHeads.length}
        loading={componentsLoading}
        emptyLabel="No deduction heads in the master yet."
        footnote={statutoryNote({ pfActApplicable, esicActApplicable, ptActApplicable })}
      >
        {deductionHeads.map((head, index) => (
          <ComponentRow
            key={head.id}
            side="deductions"
            index={index}
            label={head.label}
            tone="border-rose-500/20 bg-rose-500/5"
            indexTone="bg-rose-500/15 text-rose-700 dark:text-rose-400"
            error={errors.deductions?.[index]?.amount?.message}
            register={register}
            control={control}
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
/**
 * One head's row — its value, the ₹/% toggle and, on an allowance, the three act
 * markers. The same row serves allowances and deductions; `side` picks which half
 * of the form the fields register under, and the markers are the only thing that
 * differs between the two.
 *
 * `acts` carries the designation's act toggles and is given for an allowance only —
 * omitted, the row shows no markers at all. A marker is disabled while its act is
 * switched off: a head can't count towards an act the designation isn't covered
 * by, and the payload drops it either way.
 */
function ComponentRow({
  side,
  index,
  label,
  tone,
  indexTone,
  error,
  register,
  control,
  acts,
}: {
  side: 'allowances' | 'deductions'
  index: number
  label: string
  tone: string
  indexTone: string
  error?: string
  acts?: { pf: boolean; esic: boolean; pt: boolean }
} & Pick<AllowanceDeductionSectionProps, 'register' | 'control'>) {
  const markers = acts
    ? ([
        { name: 'pfApplicable', label: 'PF', enabled: acts.pf, activeTone: 'text-primary' },
        {
          name: 'esicApplicable',
          label: 'ESI',
          enabled: acts.esic,
          activeTone: 'text-emerald-600 dark:text-emerald-400',
        },
        {
          name: 'ptApplicable',
          label: 'PT',
          enabled: acts.pt,
          activeTone: 'text-violet-600 dark:text-violet-400',
        },
      ] as const)
    : []

  return (
    <HeadRowShell index={index} label={label} tone={tone} indexTone={indexTone} error={error}>
      {/* Value — the unit button flips the row between percentage and flat amount. */}
      <Controller
        control={control}
        name={`${side}.${index}.valueType`}
        render={({ field }) => (
          <div className="flex h-9 shrink-0 items-stretch overflow-hidden rounded-md border border-input bg-background">
            <ValueTypeButton value={field.value} onChange={field.onChange} />
            <Input
              inputMode="decimal"
              placeholder="0"
              className="h-full w-20 rounded-none border-0 focus-visible:ring-0"
              {...register(`${side}.${index}.amount`)}
            />
          </div>
        )}
      />

      {/* Which statutory wages this head counts towards — allowances only. */}
      {markers.length > 0 && (
        <div className="flex shrink-0 items-center gap-2.5">
          {markers.map((marker) => (
            <Controller
              key={marker.name}
              control={control}
              name={`${side}.${index}.${marker.name}`}
              render={({ field }) => (
                <ActMarker
                  label={marker.label}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!marker.enabled}
                  activeTone={marker.activeTone}
                />
              )}
            />
          ))}
        </div>
      )}
    </HeadRowShell>
  )
}

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
        <CellTooltip label={label}>
          <span className="min-w-40 flex-1 truncate text-sm font-medium text-foreground">
            {label}
          </span>
        </CellTooltip>
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
    <CellTooltip label={action}>
      <button
        type="button"
        onClick={() => onChange(isPercentage ? 'Fixed' : 'Percentage')}
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
    </CellTooltip>
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

  const marker = (
    <span className="flex items-center gap-1">
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

  // Only a dead marker needs explaining — a live one says what it is by its label.
  return disabled ? (
    <CellTooltip label={`${label} act is not applicable to this designation`}>
      {marker}
    </CellTooltip>
  ) : (
    marker
  )
}
