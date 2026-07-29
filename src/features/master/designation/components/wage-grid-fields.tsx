import type { ReactNode } from 'react'
import { IndianRupee, Info, Percent } from 'lucide-react'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * The controls the wage structure grid is built from. Every one of them is a
 * compact, borderless-ish variant sized to sit inside a table cell — the grid
 * has forty columns, so nothing here can afford the padding a normal form field
 * gets. Read-only twins (`Read*`) render the same values for saved rows, which
 * are never editable.
 */

/**
 * Wraps a control in the app's tooltip. Everything interactive in the grid needs
 * one — the cells are too narrow to label themselves — and they go through this
 * rather than the native `title` attribute, which the browser styles itself and
 * shows on its own slow delay.
 */
export function CellTooltip({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="max-w-56 text-pretty text-xs font-normal normal-case tracking-normal">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

/** Small help icon for a column header. */
export function ColumnHint({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          tabIndex={-1}
          aria-label="More information"
          className="ml-1 inline-flex cursor-help align-middle text-muted-foreground/60 transition-colors hover:text-primary"
        >
          <Info className="size-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-56 text-pretty text-xs font-normal normal-case tracking-normal">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

/** Amount input carrying its own unit, shared by allowance / deduction cells. */
export function UnitAmountField({
  valueType,
  onValueTypeChange,
  disabled = false,
  children,
}: {
  valueType: 'Percentage' | 'Fixed'
  onValueTypeChange: (value: 'Percentage' | 'Fixed') => void
  disabled?: boolean
  /** The `<Input>` for the amount — registered by the caller. */
  children: ReactNode
}) {
  const isPercentage = valueType === 'Percentage'
  const Icon = isPercentage ? Percent : IndianRupee
  const action = isPercentage ? 'Switch to a fixed amount' : 'Switch to a percentage'

  return (
    <div
      className={cn(
        'flex h-7 items-stretch overflow-hidden rounded-md border border-input bg-background',
        disabled && 'opacity-50',
      )}
    >
      <CellTooltip label={action}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onValueTypeChange(isPercentage ? 'Fixed' : 'Percentage')}
          aria-label={action}
          className={cn(
            'flex w-6 shrink-0 cursor-pointer items-center justify-center border-r transition-colors disabled:cursor-not-allowed',
            isPercentage
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400'
              : 'border-amber-500/20 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400',
          )}
        >
          <Icon className="size-3" />
        </button>
      </CellTooltip>
      {children}
    </div>
  )
}

/** The grid's amount input — compact, and flush inside `UnitAmountField`. */
export function GridInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Input
      inputMode="decimal"
      className={cn(
        'h-full rounded-none border-0 px-1.5 text-right text-xs shadow-none focus-visible:ring-0',
        className,
      )}
      {...props}
    />
  )
}

/** A standalone (unit-less) amount input sitting in a cell. */
export function GridAmountInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Input
      inputMode="decimal"
      className={cn('h-7 px-2 text-right text-xs', className)}
      {...props}
    />
  )
}

/**
 * How wide a grid dropdown's option panel opens, regardless of the cell it hangs
 * off. Sized to the longest option any of them offers — "As Per Calculation" —
 * plus the row's padding, gap and checkmark, and no wider.
 */
const GRID_PANEL_MIN_WIDTH = 180

/** A dropdown sized for a grid cell. */
export function GridSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className,
}: {
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  if (disabled) {
    return (
      <span className="flex h-7 items-center rounded-md border border-input px-2 text-xs text-muted-foreground/50">
        {placeholder ?? '—'}
      </span>
    )
  }
  return (
    <Combobox
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      searchable={false}
      className={cn('w-full', className)}
      triggerClassName="h-7 gap-1 px-2 text-xs"
      /* The cells are far too narrow to read a label like "As Per Calculation"
         in, so the panel opens wider than the field it belongs to. */
      panelMinWidth={GRID_PANEL_MIN_WIDTH}
    />
  )
}

/**
 * A two-way choice shown as one pill that flips on click. Used for the choices
 * the grid has no room to spell out as a dropdown — the salary type, the
 * overtime basis, the PT and LWF types.
 */
export function TogglePill({
  value,
  options,
  onChange,
  disabled = false,
  tone,
}: {
  value: string
  /** Exactly two options — clicking swaps to the other. */
  options: ComboboxOption[]
  onChange: (value: string) => void
  disabled?: boolean
  /** Tint while enabled, matching the column group. */
  tone: string
}) {
  const current = options.find((option) => option.value === value) ?? options[0]
  const other = options.find((option) => option.value !== current.value) ?? current

  const pill = (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(other.value)}
      className={cn(
        'h-7 w-full rounded-md border px-2 text-xs font-semibold transition-colors',
        disabled
          ? 'cursor-not-allowed border-input text-muted-foreground/40'
          : cn('cursor-pointer', tone),
      )}
    >
      {current.label}
    </button>
  )

  // Nothing to explain while it's disabled — the cell it belongs to is inert.
  if (disabled) return pill
  return <CellTooltip label={`Switch to ${other.label}`}>{pill}</CellTooltip>
}

/**
 * Whether an allowance counts towards one act's wages. Always live — the marker
 * is never gated on the row's act toggles, so any head can be marked for any act
 * and what you set is what gets saved.
 */
export function ActMarkerButton({
  label,
  checked,
  onCheckedChange,
  tone,
}: {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  tone: string
}) {
  return (
    <CellTooltip label={`Counts towards ${label}`}>
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'flex-1 cursor-pointer whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-bold uppercase leading-none transition-colors',
          /*
           * The border takes its colour from the label via `currentColor`, so it
           * tints with the act when the marker is on and reads as a plain grey
           * outline when it's off — one rule, no per-act border classes.
           */
          'border-current/50',
          checked ? tone : 'bg-muted text-muted-foreground hover:bg-muted/70',
        )}
      >
        {label}
      </button>
    </CellTooltip>
  )
}

/** A boolean cell in a draft row. */
export function GridSwitch({
  checked,
  onCheckedChange,
  disabled = false,
  label,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  label: string
}) {
  return (
    <div className="flex h-7 items-center">
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  )
}

/* ── Read-only twins, for saved rows ────────────────────────────────────── */

/** Text, or a dash when there's nothing recorded. */
export function ReadText({ value }: { value: string | number | null }) {
  if (value === null || value === '') {
    return <span className="text-muted-foreground/50">—</span>
  }
  return <span className="text-foreground">{value}</span>
}

/** A stored amount with the unit it was captured in. */
export function ReadAmount({
  amount,
  valueType,
}: {
  amount: number | null
  valueType: 'Percentage' | 'Fixed'
}) {
  if (amount === null) return <ReadText value={null} />
  const Icon = valueType === 'Percentage' ? Percent : IndianRupee

  return (
    <span className="flex items-center justify-end gap-1">
      <span
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded',
          valueType === 'Percentage'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        )}
      >
        <Icon className="size-2.5" />
      </span>
      <span className="text-foreground">{amount}</span>
    </span>
  )
}

/** A stored boolean, as a Yes / No chip. */
export function ReadBoolean({ value, tone }: { value: boolean; tone: string }) {
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 text-[11px] font-semibold',
        value ? tone : 'bg-muted text-muted-foreground',
      )}
    >
      {value ? 'Yes' : 'No'}
    </span>
  )
}

/** A stored choice, as a tinted chip; nothing recorded reads as a dash. */
export function ReadChoice({
  value,
  tone,
}: {
  value: string | null
  tone: string
}) {
  if (!value) return <ReadText value={null} />
  return (
    <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-semibold', tone)}>
      {value}
    </span>
  )
}
