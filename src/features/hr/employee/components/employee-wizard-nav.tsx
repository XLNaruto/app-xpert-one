import { useEffect, useRef } from 'react'
import { Check, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EmployeeWizardStep } from '../hooks/use-employee-wizard'

/**
 * How much of the record is filled in — a read-out of the whole wizard, so it
 * sits outside the step's card with the tabs rather than inside one step.
 */
export function EmployeeWizardProgress({
  progress,
}: {
  progress: { completed: number; total: number; percent: number }
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      {/* Service history is an ongoing register, not a step to finish. */}
      <p className="text-xs text-muted-foreground">
        Service History is an ongoing register and isn't counted.
      </p>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {progress.completed}/{progress.total} steps complete · {progress.percent}%
        </span>
        <div
          // The track sits on the page background, which is itself near-muted —
          // so it's tinted with the foreground rather than `bg-muted`, which
          // would all but disappear against it.
          className="h-1.5 w-40 overflow-hidden rounded-full bg-muted-foreground/25"
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
      </div>
    </div>
  )
}

/**
 * The eight-step nav — a strip that sits above the step's card rather than
 * inside it, so the card holds only the step being filled in.
 *
 * Not built on `<Tabs>` on purpose: a step can be locked, and the shared
 * `TabsTrigger` has no disabled state — a locked step needs to look and behave
 * differently rather than silently ignore a click.
 *
 * The same row of eight serves every width. It scrolls sideways when it doesn't
 * fit rather than collapsing into a dropdown: the eight steps and which of them
 * are done is the wizard's whole map, and a closed select hides it. The active
 * step is scrolled into view so a narrow screen never opens on an invisible tab.
 */
export function EmployeeWizardNav({
  steps,
  value,
  onChange,
  onLockedStep,
}: {
  steps: EmployeeWizardStep[]
  value: string
  onChange: (tab: string) => void
  /** Called instead of `onChange` when a locked step is clicked. */
  onLockedStep: () => void
}) {
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [value])

  const select = (step: EmployeeWizardStep) => {
    if (step.locked) onLockedStep()
    else onChange(step.tab)
  }

  return (
    <div className="mb-5">
      <div className="overflow-x-auto pb-1">
        <div
          role="tablist"
          aria-label="Employee record steps"
          className="inline-flex min-w-full items-stretch gap-2"
        >
          {steps.map((step) => {
            const active = step.tab === value

            return (
              <button
                key={step.tab}
                ref={active ? activeRef : undefined}
                type="button"
                role="tab"
                aria-selected={active}
                aria-disabled={step.locked}
                onClick={() => select(step)}
                title={step.locked ? 'Save Basic Detail first' : step.label}
                className={cn(
                  'group inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-medium transition-all',
                  active
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : // Dark mode sits the chips on a near-black page, where the
                      // muted grey reads as disabled — the labels take the full
                      // foreground there and lean on the fill for the active state.
                      'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground dark:text-foreground',
                  step.locked &&
                    'cursor-not-allowed opacity-50 hover:border-border hover:text-muted-foreground dark:text-muted-foreground',
                )}
              >
                {/*
                  One badge carries the step number and its state: a tick once the
                  step is saved, a padlock while it can't be opened, the number
                  otherwise. That keeps the strip to a single glyph per step, which
                  is what lets eight of them fit a phone.
                */}
                <span
                  className={cn(
                    'grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold tabular-nums transition-colors',
                    active
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : step.locked
                        ? 'bg-muted text-muted-foreground'
                        : step.completed
                          ? 'bg-success/15 text-success'
                          : 'bg-muted text-muted-foreground dark:text-foreground',
                  )}
                >
                  {step.locked ? (
                    <Lock className="size-3" />
                  ) : step.completed ? (
                    <Check className="size-3" />
                  ) : (
                    step.index
                  )}
                </span>
                {step.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
