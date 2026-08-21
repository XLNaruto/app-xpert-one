import { History } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { EmptyState } from '@/components/common/empty-state'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useShiftHistory } from '../api/use-shift-history'
import { formatTime } from '../lib/shift-mappers'
import type { Shift } from '../types'

/**
 * One shift's update history — the dated versions of its rules, newest first.
 *
 * This is what answers "why was this employee marked late on 12 August?". Editing
 * a shift no longer overwrites it: a change writes a NEW version from a date, and
 * the attendance engine reads the shift AS OF the day it stamps, so a closed day
 * goes on resolving against the rules it was actually judged by.
 *
 * Two badges, and they are not the same statement. **Current** marks the version
 * in force TODAY — exactly one row carries it, and it is not always the top row.
 * **Scheduled** marks a version dated in the future, which is why the top row can
 * be one nobody has worked yet.
 *
 * Only the versioned rules appear. The name and the status aren't versioned, and
 * repeating today's name on every historical row would suggest the shift had
 * always been called that.
 */
export function ShiftHistoryDialog({
  shift,
  onClose,
}: {
  /** The row whose history is open, or `null` while the dialog is shut. */
  shift: Shift | null
  onClose: () => void
}) {
  const history = useShiftHistory(shift?.id)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <Dialog open={shift !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl" onClose={onClose}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4" />
            {shift ? `${shift.shiftName} — Update History` : 'Update History'}
          </DialogTitle>
          <DialogDescription>
            Each row is the rule set in force from its date. Days before a row go on
            being judged by the version above it in time, not by today's timings.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 max-h-[60vh] overflow-auto">
          {history.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : history.isError ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {getApiErrorMessage(history.error, "Couldn't load the shift's history.")}
            </p>
          ) : (history.data ?? []).length === 0 ? (
            <EmptyState
              icon={History}
              title="No versions yet"
              description="This shift has no dated rule set on record."
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Effective From</th>
                  <th className="py-2 pr-3 font-medium">Timings</th>
                  <th className="py-2 pr-3 font-medium">Break</th>
                  <th className="py-2 pr-3 font-medium">Concession</th>
                  <th className="py-2 pr-3 font-medium">Full / Half Day</th>
                  <th className="py-2 pr-3 font-medium">Changed By</th>
                  <th className="py-2 font-medium">Changed On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(history.data ?? []).map((version) => (
                  <tr key={version.id}>
                    <td className="whitespace-nowrap py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {formatDate(version.effectiveDate)}
                        </span>
                        {version.isCurrent && <Badge variant="success">Current</Badge>}
                        {version.effectiveDate > today && (
                          <Badge variant="warning">Scheduled</Badge>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3 font-mono text-xs">
                      {formatTime(version.startTime)} – {formatTime(version.endTime)}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3">
                      {version.breakMinutes} min
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3">
                      {version.concessionMinutes} min
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3">
                      {version.minFullDayHours} / {version.minHalfDayHours} hrs
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-muted-foreground">
                      {version.updatedBy || version.createdBy || '—'}
                    </td>
                    <td className="whitespace-nowrap py-2.5 text-muted-foreground">
                      {version.updatedAt || version.createdAt
                        ? formatDate((version.updatedAt || version.createdAt) as string)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
