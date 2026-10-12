import { CheckCircle2, Circle } from 'lucide-react'
import {
  TASK_SUBMISSION_MODE_META,
  type TaskSubmissionMode,
} from '@/features/office-task/common'
import { cn } from '@/lib/utils'

const MODES = Object.keys(TASK_SUBMISSION_MODE_META) as TaskSubmissionMode[]

/** The two submission modes as a pair of selectable cards (a radio group). */
export function SubmissionModePicker({
  value,
  onChange,
  disabled,
  name,
}: {
  value: TaskSubmissionMode
  onChange: (next: TaskSubmissionMode) => void
  disabled?: boolean
  /** Labels the group for assistive tech. */
  name: string
}) {
  return (
    <div role="radiogroup" aria-label={name} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {MODES.map((mode) => {
        const selected = value === mode
        const Icon = selected ? CheckCircle2 : Circle
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(mode)}
            className={cn(
              'flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
              selected
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted/50',
              disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
            )}
          >
            <Icon
              className={cn(
                'mt-0.5 size-4 shrink-0',
                selected ? 'text-primary' : 'text-muted-foreground',
              )}
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                {TASK_SUBMISSION_MODE_META[mode].label}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {TASK_SUBMISSION_MODE_META[mode].hint}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
