import { CheckCircle2, Circle, Lock } from 'lucide-react'
import { Combobox } from '@/components/ui/combobox'
import { cn } from '@/lib/utils'
import type { EmployeeWizardStep } from '../hooks/use-employee-wizard'

/**
 * The nine-step nav.
 *
 * Not built on `<Tabs>` on purpose: a step can be locked, and the shared
 * `TabsTrigger` has no disabled state — a locked step needs to look and behave
 * differently rather than silently ignore a click.
 *
 * Below `lg` the row of nine would either wrap into a wall or scroll off, so it
 * collapses into a dropdown; the progress bar carries the same information in
 * both layouts.
 */
export function EmployeeWizardNav({
  steps,
  value,
  onChange,
  onLockedStep,
  progress,
}: {
  steps: EmployeeWizardStep[]
  value: string
  onChange: (tab: string) => void
  /** Called instead of `onChange` when a locked step is clicked. */
  onLockedStep: () => void
  progress: { completed: number; total: number; percent: number }
}) {
  const select = (step: EmployeeWizardStep) => {
    if (step.locked) onLockedStep()
    else onChange(step.tab)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-3">
          <div
            className="h-1.5 w-40 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Record completion"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {progress.completed}/{progress.total} steps complete · {progress.percent}%
          </span>
        </div>

        {/* Service history and leave management are registers, not steps to finish. */}
        <p className="text-xs text-muted-foreground">
          Service History and Leave Management are ongoing registers and aren't counted.
        </p>
      </div>

      {/* Under lg: one dropdown. Locked steps are marked and can't be chosen. */}
      <div className="lg:hidden">
        <Combobox
          className="w-full"
          searchable={false}
          value={value}
          onChange={(next) => {
            const step = steps.find((entry) => entry.tab === next)
            if (step) select(step)
          }}
          options={steps.map((step) => ({
            value: step.tab,
            label: `${step.index}. ${step.label}${step.locked ? ' (locked)' : step.completed ? ' ✓' : ''}`,
          }))}
        />
      </div>

      {/* lg and up: the full row, scrolling sideways rather than wrapping. */}
      <div className="hidden overflow-x-auto lg:block">
        <div
          role="tablist"
          aria-label="Employee record steps"
          className="inline-flex min-w-full items-stretch gap-1 rounded-lg bg-muted p-1"
        >
          {steps.map((step) => {
            const active = step.tab === value
            const Icon = step.locked ? Lock : step.completed ? CheckCircle2 : Circle

            return (
              <button
                key={step.tab}
                type="button"
                role="tab"
                aria-selected={active}
                aria-disabled={step.locked}
                onClick={() => select(step)}
                title={step.locked ? 'Save Basic Detail first' : step.label}
                className={cn(
                  'inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
                  active
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                  step.locked && 'cursor-not-allowed opacity-45 hover:text-muted-foreground',
                )}
              >
                <Icon
                  className={cn(
                    'size-3.5 shrink-0',
                    step.completed && !step.locked && 'text-success',
                  )}
                />
                <span className="tabular-nums opacity-60">{step.index}</span>
                {step.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
