import { CalendarDays, CalendarOff, Gift, UserCheck, UserMinus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ImageWithFallback } from '@/components/common/image-with-fallback'
import { useMediaUrl } from '@/hooks/use-media-url'
import { formatDecimal } from '@/lib/currency'
import { cn } from '@/lib/utils'
import type { SalaryRegisterRow } from '../types'

interface SalaryAttendanceDialogProps {
  /** The row being explained — `null` closes the dialog. */
  row: SalaryRegisterRow | null
  /** The present days *currently in the cell*, which may have been typed over. */
  presentDays: string
  onClose: () => void
}

/** One figure of the breakdown. */
function Tile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: number
  tone: string
}) {
  return (
    <div className={cn('rounded-xl border p-3', tone)}>
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 shrink-0" />
        <span className="text-[11px] font-semibold leading-tight">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{formatDecimal(value)}</p>
    </div>
  )
}

/**
 * Where a row's present days come from.
 *
 * The grid shows one number in the Present cell, but that number is a sum — days
 * actually punched, plus the month's holidays, plus approved paid leave — and it
 * can be typed over, at which point it is no longer any of those. The eye beside
 * the cell opens this, so the figure being saved can be read back against the
 * attendance it started from without leaving the register.
 *
 * Unpaid leave is shown alongside even though it adds nothing: it is what
 * explains a short month, and its absence from the total is the point.
 */
export function SalaryAttendanceDialog({
  row,
  presentDays,
  onClose,
}: SalaryAttendanceDialogProps) {
  const photoUrl = useMediaUrl(row?.photo ?? null)

  if (!row) return null

  const { attendance } = row
  const typed = Number((presentDays ?? '').trim())
  const total = Number.isFinite(typed) ? typed : attendance.payableDays
  /* "Manually edited" is the cell disagreeing with the attendance it opened on —
     either typed over here, or stored that way when the month was processed. */
  const isEdited = Math.abs(total - attendance.payableDays) > 0.001

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0" onClose={onClose}>
        {/* Who — the same identity the row's employee cell carries. */}
        <div className="rounded-t-2xl border-b border-border bg-primary/5 px-5 py-4">
          <div className="flex items-center gap-3">
            <ImageWithFallback
              src={photoUrl}
              alt={row.employeeName || 'Employee photo'}
              wrapperClassName="size-11 shrink-0 rounded-full ring-1 ring-border"
              className="object-cover"
            />
            <div className="min-w-0">
              <h2 className="truncate font-heading text-base font-semibold text-foreground">
                {[row.employeePrefix, row.employeeName].filter(Boolean).join(' ') ||
                  'Employee'}
              </h2>
              <p className="truncate text-xs text-muted-foreground">
                {row.employeeCode || 'No code'}
              </p>
            </div>
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <CalendarDays className="size-3.5" />
            Attendance breakdown
          </p>
        </div>

        <div className="space-y-3 p-5">
          <div className="grid grid-cols-2 gap-3">
            <Tile
              icon={UserCheck}
              label="Actual Present Days"
              value={attendance.presentDays}
              tone="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
            />
            <Tile
              icon={Gift}
              label="Holidays"
              value={attendance.holidayDays}
              tone="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300"
            />
            <Tile
              icon={CalendarOff}
              label="Paid Leave Days"
              value={attendance.paidLeaveDays}
              tone="border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300"
            />
            <Tile
              icon={UserMinus}
              label="Unpaid Leave Days"
              value={attendance.unpaidLeaveDays}
              tone="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
            />
          </div>

          {/* The figure the month is actually paid on. */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wide text-primary">
                Total present days
              </span>
              <span className="text-2xl font-bold tabular-nums text-primary">
                {formatDecimal(total)}
              </span>
            </div>
            {isEdited && (
              <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                Manually edited — the attendance adds up to{' '}
                {formatDecimal(attendance.payableDays)}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
