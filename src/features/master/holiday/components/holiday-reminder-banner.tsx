import { AlertTriangle, CalendarPlus, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatDate } from '@/lib/utils'
import { useHolidayReminderBanner } from '../hooks/use-holiday-reminder-banner'

/**
 * "Add next year's holidays" — shown on the dashboard from 1 March (one month
 * before the accounting year starts) for every company with no holidays yet,
 * and as a warning once the year has started without them. There's no dismiss:
 * it goes away by itself once each company has a holiday in the year.
 */
export function HolidayReminderBanner({ companyIds }: { companyIds?: string[] }) {
  const { reminder, visible, canAdd, openYearForm } =
    useHolidayReminderBanner(companyIds)

  if (!visible || !reminder) return null

  const overdue = reminder.status === 'overdue'
  const Icon = overdue ? AlertTriangle : Info
  const days = reminder.daysUntilStart

  return (
    <div
      role={overdue ? 'alert' : 'status'}
      className={cn(
        'mb-6 flex items-start gap-3 rounded-lg border p-4',
        overdue ? 'border-warning/40 bg-warning/10' : 'border-primary/30 bg-primary/5',
      )}
    >
      <Icon
        className={cn('mt-0.5 size-4 shrink-0', overdue ? 'text-warning' : 'text-primary')}
      />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">
          {overdue
            ? `No holidays added for ${reminder.accountingYear} yet`
            : `Accounting year ${reminder.accountingYear} starts in ${days} ${days === 1 ? 'day' : 'days'}`}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {overdue
            ? 'The year has already started and these companies have no holidays in it.'
            : `Add holidays for ${reminder.accountingYear}${
                reminder.startsOn ? ` (from ${formatDate(reminder.startsOn)})` : ''
              } for:`}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {reminder.companies.map((company) =>
            canAdd ? (
              <Button
                key={company.companyId}
                size="sm"
                variant="outline"
                className="bg-background"
                onClick={() => openYearForm(company)}
              >
                <CalendarPlus className="size-3.5" />
                {company.companyName}
              </Button>
            ) : (
              <span
                key={company.companyId}
                className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium"
              >
                {company.companyName}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  )
}
