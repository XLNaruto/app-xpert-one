import type { LucideIcon } from 'lucide-react'
import { Users, UserCheck, UserX } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AttendanceTotals } from '../types'

/**
 * The three tiles that head both screens — the company's day on the card
 * screen, one group's day behind a card.
 *
 * Deliberately not `<StatCard>`: these are a colour-coded triple read at a
 * glance (blue / green / red), not the neutral KPI card with a delta the
 * dashboard uses.
 */

type Tone = 'total' | 'present' | 'absent'

const TONES: Record<
  Tone,
  { label: string; icon: LucideIcon; card: string; icons: string; value: string }
> = {
  total: {
    label: 'Total',
    icon: Users,
    card: 'border-primary/20 bg-primary/5',
    icons: 'bg-primary/12 text-primary',
    value: 'text-primary',
  },
  present: {
    label: 'Present',
    icon: UserCheck,
    card: 'border-success/25 bg-success/5',
    icons: 'bg-success/12 text-success',
    value: 'text-success',
  },
  absent: {
    label: 'Absent',
    icon: UserX,
    card: 'border-destructive/25 bg-destructive/5',
    icons: 'bg-destructive/12 text-destructive',
    value: 'text-destructive',
  },
}

function Tile({ tone, value }: { tone: Tone; value: number }) {
  const { label, icon: Icon, card, icons, value: valueClass } = TONES[tone]
  return (
    <div className={cn('flex items-center gap-4 rounded-xl border p-4 sm:p-5', card)}>
      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-full', icons)}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className={cn('font-heading text-2xl font-semibold tabular-nums', valueClass)}>
          {value.toLocaleString('en-IN')}
        </p>
      </div>
    </div>
  )
}

export function AttendanceStatTiles({
  totals,
  className,
}: {
  /** Undefined before the first answer — the tiles read zero rather than jump. */
  totals?: AttendanceTotals
  className?: string
}) {
  const value = totals ?? { total: 0, present: 0, absent: 0, attendanceRate: 0 }
  return (
    <div className={cn('grid gap-4 sm:grid-cols-3', className)}>
      <Tile tone="total" value={value.total} />
      <Tile tone="present" value={value.present} />
      <Tile tone="absent" value={value.absent} />
    </div>
  )
}
