import type { ReactElement } from 'react'
import Calendar from 'react-calendar'
import { Briefcase, Clock } from 'lucide-react'
import { format, isSameDay, parseISO } from 'date-fns'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatClockTime } from '../lib/attendance-mappers'
import { DAY_STATUS_LABEL, DAY_STATUS_TONE } from '../constants'
import type { AttendanceDay } from '../types'

/**
 * The month grid — `react-calendar` in month view, with the day's status painted
 * into each tile.
 *
 * The library draws the calendar (weeks, neighbouring days, the weekday header);
 * everything attendance-specific arrives through `tileContent` and
 * `tileClassName`, and the `.sa-attendance-calendar` rules in `globals.css`
 * stretch the compact date-picker panel out into a full-page board.
 *
 * Navigation is hidden and driven from the page instead: the same Previous /
 * Next / month-picker controls that decide which month is *fetched* should be
 * the ones on screen, rather than a second set inside the calendar that could
 * move the view without moving the query.
 *
 * A day outside the month is left blank on purpose — the read covers one month,
 * so a status painted on a neighbouring day would be a status nobody sent.
 *
 * The board keeps a floor width and scrolls sideways under it rather than
 * squeezing: seven columns of a phone's width would leave each cell too narrow
 * for the status word, and a cell that can only say "AB…" has stopped reporting.
 *
 * — see `AttendanceMonthCalendar` below, past the two helpers it leans on.
 */

/**
 * Did the day actually work any time?
 *
 * The server formats the rollup rather than sending a number, and it formats a
 * day with nothing on it as `00h 00m` — a value, not a blank. Any digit other
 * than zero is the whole test, and it holds whichever way the string is punctuated.
 */
function hasWorkedTime(totalDisplay: string): boolean {
  return /[1-9]/.test(totalDisplay)
}

/**
 * Is there anything behind this day to open?
 *
 * A cell leads to the punches that produced it, and three statuses have none by
 * definition: a day still ahead of the company's own today, an off day, and an
 * absence — an absence *is* the absence of a punch. Opening one would be a
 * dialog that can only report that it has nothing to report, so those cells are
 * left inert rather than offered as a button that goes nowhere.
 *
 * A holiday and an approved leave stay openable: either can still carry a punch
 * from somebody who worked it.
 */
function canOpenDay(day: AttendanceDay): boolean {
  return (
    day.status !== 'future' &&
    day.status !== 'absent' &&
    day.status !== 'weekly_off'
  )
}

/**
 * A line of a cell, with the app's tooltip behind it when there is more to say
 * than fits.
 *
 * The cells truncate — a column is a seventh of the board and a punch pair with
 * seconds is longer than that — so the full value has to be reachable. The
 * native `title` did that, but it arrives unstyled, a beat late and in the OS's
 * own chrome; this is the same tooltip the rest of the app uses.
 *
 * With no `tip` the child is returned untouched, so a cell that fits pays for no
 * trigger at all. `asChild` keeps the trigger a `<span>`: react-calendar renders
 * a cell as a `<button>`, and a nested button would be invalid markup.
 */
function CellLine({ tip, children }: { tip?: string; children: ReactElement }) {
  if (!tip) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  )
}

export function AttendanceMonthCalendar({
  /** `yyyy-MM` — the month being shown. */
  month,
  /** Every day of that month by `yyyy-MM-dd`. */
  dayByDate,
  onSelectDay,
}: {
  month: string
  dayByDate: Map<string, AttendanceDay>
  onSelectDay: (day: AttendanceDay) => void
}) {
  const activeMonth = parseISO(`${month}-01`)

  /** The day sitting under a tile — `undefined` for a neighbouring month's. */
  const dayFor = (date: Date): AttendanceDay | undefined =>
    dayByDate.get(format(date, 'yyyy-MM-dd'))

  return (
    <div className="overflow-x-auto">
      <Calendar
        className="sa-attendance-calendar min-w-5xl"
        /* Controlled by the page's own month controls; the library's navigation
           is hidden, so this is the only thing that moves the view. */
        activeStartDate={activeMonth}
        view="month"
        /* Drilling up to the year view would leave the grid showing months while
           the query still holds days — one month is the whole read. */
        minDetail="month"
        maxDetail="month"
        /* No selected day: a tile is a button into that day's punches, not a
           value being picked, and a blue "selected" fill would fight the status
           colour. */
        value={null}
        selectRange={false}
        showNavigation={false}
        locale="en-IN"
        calendarType="gregory"
        /* Two digits, so the date chips line up down a column. */
        formatDay={(_locale, date) => format(date, 'dd')}
        onClickDay={(date) => {
          const day = dayFor(date)
          if (day && canOpenDay(day)) onSelectDay(day)
        }}
        tileDisabled={({ date, view }) => {
          if (view !== 'month') return false
          const day = dayFor(date)
          return !day || !canOpenDay(day)
        }}
        tileClassName={({ date, view }) => {
          if (view !== 'month') return undefined
          const day = dayFor(date)
          if (!day) return 'sa-attendance-tile'
          const tone = DAY_STATUS_TONE[day.status]
          // Today's date keeps its own chip (painted in `globals.css`) and skips
          // the status tint entirely. Withheld here rather than overridden there:
          // for `!important` declarations the cascade inverts layer order, so an
          // unlayered `!important` in the stylesheet LOSES to a layered utility —
          // which is how today ended up wearing the half-day amber.
          const isToday = isSameDay(date, new Date())
          return cn('sa-attendance-tile', tone.tile, !isToday && tone.date)
        }}
        tileContent={({ date, view }) => {
          if (view !== 'month') return null
          const day = dayFor(date)
          // A future day has nothing to report yet, and neither has a day from a
          // neighbouring month — both stay empty rather than carry a blank chip.
          if (!day || day.status === 'future') return null

          const tone = DAY_STATUS_TONE[day.status]
          const note = day.holidayName || day.leaveType || ''
          const worked = hasWorkedTime(day.totalDisplay)

          // An off day is the whole cell already — a bar on top of a solid fill
          // would be a second badge saying what the fill just said.
          if (day.status === 'weekly_off') {
            return (
              <span className="-mt-1 flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-center">
                <Briefcase className="size-4 opacity-80" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wide">
                  {DAY_STATUS_LABEL[day.status]}
                </span>
              </span>
            )
          }

          // Punch times, then the status, then the hours worked: the day's two
          // figures bracket the verdict they add up to, and the bar lands on the
          // cell's centre line, where an eye scanning a week finds it in the same
          // place every time.
          return (
            <div className="-mt-1 flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-1.5">
              {/* The times only when there are any — an absent day has none, and
                  three em dashes would read as data that isn't there. */}
              {day.checkIn ? (
                <CellLine
                  tip={`${formatClockTime(day.checkIn)}${day.checkOut ? ` – ${formatClockTime(day.checkOut)}` : ''}`}
                >
                  <span
                    className={cn(
                      'flex w-full min-w-0 items-center justify-center gap-1 text-[11px] tabular-nums',
                      tone.text,
                    )}
                  >
                    <Clock className="size-3 shrink-0" aria-hidden />
                    {/* No seconds in a tile this narrow — the tooltip and the
                        dialog behind the day carry the full punch times. */}
                    <span className="truncate">
                      {formatClockTime(day.checkIn, false)}
                      {day.checkOut ? ` – ${formatClockTime(day.checkOut, false)}` : ''}
                    </span>
                  </span>
                </CellLine>
              ) : null}

              <CellLine tip={note || undefined}>
                <span
                  className={cn(
                    'block w-full truncate rounded-md px-2 py-1 text-center text-[11px] font-medium',
                    tone.chip,
                  )}
                >
                  {DAY_STATUS_LABEL[day.status]}
                </span>
              </CellLine>

              {/* Worked hours where the day has any, and otherwise the reason the
                  day is what it is — a holiday's name, a leave's type. A day that
                  worked nothing says nothing: `00h 00m` on every absence is a
                  line of type per cell that reports what the chip already did. */}
              {worked ? (
                <span
                  className={cn(
                    'w-full min-w-0 truncate text-center text-[11px] font-medium tabular-nums',
                    tone.text,
                  )}
                >
                  {day.totalDisplay}
                </span>
              ) : note ? (
                <CellLine tip={note}>
                  <span
                    className={cn(
                      'w-full min-w-0 truncate text-center text-[11px]',
                      tone.text,
                    )}
                  >
                    {note}
                  </span>
                </CellLine>
              ) : null}
            </div>
          )
        }}
      />
    </div>
  )
}
