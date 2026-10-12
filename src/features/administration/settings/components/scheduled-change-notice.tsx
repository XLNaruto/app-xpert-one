import { CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { submissionModeLabel } from '../lib/company-settings-mappers'
import { formatIst } from '../lib/ist'
import type { SettingChange } from '../types'

/** "Changes to Direct on 18/10/2026 3:19 PM" [Withdraw] — under a setting with a booking. */
export function ScheduledChangeNotice({
  change,
  onWithdraw,
  disabled,
}: {
  change: SettingChange
  /** Omitted when the user can't withdraw — the notice still shows. */
  onWithdraw?: () => void
  disabled?: boolean
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-500/25 bg-blue-500/5 px-3 py-2">
      <p className="flex items-center gap-2 text-sm text-foreground">
        <CalendarClock className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <span>
          Changes to{' '}
          <strong className="font-medium">{submissionModeLabel(change.value)}</strong> on{' '}
          <strong className="font-medium">{formatIst(change.effectiveFrom)}</strong>
        </span>
      </p>
      {onWithdraw && (
        <Button variant="outline" size="sm" onClick={onWithdraw} disabled={disabled}>
          Withdraw
        </Button>
      )}
    </div>
  )
}
