import { Controller, type Control } from 'react-hook-form'
import { CalendarRange } from 'lucide-react'
import { MonthPicker } from '@/components/ui/month-picker'
import type { BulkWageFormValues } from '../schemas'

interface BulkWageToolbarProps {
  control: Control<BulkWageFormValues>
  monthBounds: { minDate: Date; maxDate: Date }
}

/**
 * The month every row the grid saves takes effect from.
 *
 * It sits above the grid rather than in it because it's the screen's, not a
 * row's — the endpoint takes one `effective_from` for the entire body, and the
 * rows carry none. Putting it anywhere else would suggest a row could disagree.
 *
 * The company isn't asked for: the grid is the active company's, the one the
 * session is already working in.
 */
export function BulkWageToolbar({ control, monthBounds }: BulkWageToolbarProps) {
  return (
    <div className="mb-4 rounded-xl border border-border bg-card p-4 sm:max-w-md">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Effective From
      </label>
      <div className="mt-1.5">
        <Controller
          control={control}
          name="effectiveFrom"
          render={({ field, fieldState }) => (
            <MonthPicker
              value={field.value}
              onChange={field.onChange}
              invalid={!!fieldState.error}
              minDate={monthBounds.minDate}
              maxDate={monthBounds.maxDate}
            />
          )}
        />
      </div>
      {/*
        The versioning rule, said once and up front — it's the difference between
        correcting this month's figures and revising them from next month, and it
        applies to every row the screen saves.
      */}
      <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-tight text-muted-foreground">
        <CalendarRange className="mt-px size-3 shrink-0" />
        A row already effective from this month is updated; any other month adds a
        version and keeps the earlier ones as history.
      </p>
    </div>
  )
}
