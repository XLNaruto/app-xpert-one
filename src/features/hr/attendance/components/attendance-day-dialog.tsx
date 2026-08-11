import { useMemo, useState } from 'react'
import {
  ChevronDown,
  Clock,
  LogIn,
  LogOut,
  MapPin,
  Maximize2,
  Smartphone,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useMediaResolver } from '@/hooks/use-media-url'
import { ImageLightbox, type LightboxSlide } from '@/components/common/image-lightbox'
import { cn, formatDate } from '@/lib/utils'
import {
  formatClockTime,
  pairPunchSessions,
  type AttendanceSession,
} from '../lib/attendance-mappers'
import { DAY_STATUS_LABEL, DAY_STATUS_TONE } from '../constants'
import type { AttendanceDay, AttendancePunch } from '../types'

/**
 * One day of the month, opened.
 *
 * The grid can only show the day's verdict; this is where the punches behind it
 * are — each with the time it was taken, the device it came from, and the
 * coordinates and face image it carried. A day with no punches says so rather
 * than opening on an empty list: on a weekly off or an approved leave that is
 * the correct and complete answer.
 */
export function AttendanceDayDialog({
  day,
  onClose,
}: {
  day: AttendanceDay | null
  onClose: () => void
}) {
  if (!day) return null
  const tone = DAY_STATUS_TONE[day.status]

  return (
    <Dialog open={Boolean(day)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg" onClose={onClose}>
        <DialogHeader className="pr-10">
          <DialogTitle className="flex items-center gap-2">
            {formatDate(day.date)}
            {day.status !== 'future' && (
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                  tone.chip,
                )}
              >
                {DAY_STATUS_LABEL[day.status]}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {day.holidayName ||
              (day.leaveType ? `Leave · ${day.leaveType}` : null) ||
              'Punches recorded for this day, in the company’s attendance timezone.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* The rollup — the same three figures the row on the group screen
              carries, so the two screens can't disagree. */}
          <div className="grid grid-cols-3 gap-2">
            <Figure icon={LogIn} label="Check In" value={formatClockTime(day.checkIn)} />
            <Figure
              icon={LogOut}
              label="Check Out"
              value={formatClockTime(day.checkOut)}
            />
            <Figure
              icon={Clock}
              label="Hours"
              value={day.totalHour || day.totalDisplay}
            />
          </div>

          {day.punches.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              No punches were recorded on this day.
            </p>
          ) : (
            /* Keyed by the day so opening another one starts collapsed rather
               than inheriting the last day's open rows. */
            <SessionList key={day.date} punches={day.punches} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * The day's punches as the sessions they make up — in / out paired, one
 * collapsible row each.
 *
 * A day of six punches is three stretches of work, not six unrelated events, so
 * the list opens on the pairs and the detail behind each (device, coordinates,
 * face image) waits behind the chevron. A day with a single session opens
 * expanded — there is nothing to scan past and one click to reach it is one too
 * many.
 */
function SessionList({ punches }: { punches: AttendancePunch[] }) {
  const sessions = pairPunchSessions(punches)
  const [open, setOpen] = useState<number[]>(
    sessions.length === 1 ? [sessions[0].index] : [],
  )

  // `captured_image` is an object key; the API sends a ready-made URL alongside
  // it, so prefer that and fall back to resolving the key ourselves.
  const resolveMedia = useMediaResolver()
  // One slide per punch, keyed by punch id. A punch's face is only ever looked
  // at as the answer to "who punched at 10:47" — so the viewer opens on that
  // one image alone rather than turning the day into a gallery to page through.
  const slideOf = useMemo(() => {
    const map = new Map<number, LightboxSlide>()
    for (const punch of punches) {
      const src = punch.capturedImageUrl || resolveMedia(punch.capturedImage) || ''
      if (!src) continue
      const checkIn = punch.eventType === 'check_in'
      const time = formatClockTime(punch.time) || punch.eventTime
      map.set(punch.id, {
        src,
        alt: `Punch at ${time}`,
        badge: checkIn ? 'Check In' : 'Check Out',
        tone: checkIn ? 'success' : 'destructive',
        caption: time,
        meta: punch.device,
      })
    }
    return map
  }, [punches, resolveMedia])

  const [preview, setPreview] = useState<LightboxSlide | null>(null)

  return (
    <>
      <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {sessions.map((session) => (
          <SessionCard
            key={session.index}
            session={session}
            open={open.includes(session.index)}
            onToggle={() =>
              setOpen((prev) =>
                prev.includes(session.index)
                  ? prev.filter((i) => i !== session.index)
                  : [...prev, session.index],
              )
            }
            imageOf={(punch) => slideOf.get(punch.id) || null}
            onPreview={setPreview}
          />
        ))}
      </ul>

      <ImageLightbox
        slides={preview ? [preview] : []}
        index={preview ? 0 : -1}
        onClose={() => setPreview(null)}
      />
    </>
  )
}

/** The punch's face image as the viewer would show it, if it has one. */
type PunchImage = (punch: AttendancePunch) => LightboxSlide | null

/** One in/out pair — its times on the header, its punches behind the chevron. */
function SessionCard({
  session,
  open,
  onToggle,
  imageOf,
  onPreview,
}: {
  session: AttendanceSession
  open: boolean
  onToggle: () => void
  imageOf: PunchImage
  onPreview: (slide: LightboxSlide) => void
}) {
  const inTime = session.checkIn ? formatClockTime(session.checkIn.time) : ''
  const outTime = session.checkOut ? formatClockTime(session.checkOut.time) : ''

  return (
    <li className="overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 p-2.5 text-left transition-colors hover:bg-accent/50"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-xs font-semibold tabular-nums text-primary">
          {session.index}
        </span>

        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
          <span className="inline-flex items-center gap-1 font-medium tabular-nums">
            <LogIn className="size-3.5 text-success" />
            {inTime || '—'}
          </span>
          <span className="inline-flex items-center gap-1 font-medium tabular-nums">
            <LogOut className="size-3.5 text-destructive" />
            {outTime || '—'}
          </span>
          {/* An open session is a fact about the day, not a gap in the data. */}
          {session.checkIn && !session.checkOut && (
            <Badge variant="secondary">Still checked in</Badge>
          )}
        </span>

        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="space-y-2 border-t bg-muted/30 p-2.5">
          {session.checkIn && (
            <PunchRow
              punch={session.checkIn}
              image={imageOf(session.checkIn)}
              onPreview={onPreview}
            />
          )}
          {session.checkOut && (
            <PunchRow
              punch={session.checkOut}
              image={imageOf(session.checkOut)}
              onPreview={onPreview}
            />
          )}
        </div>
      )}
    </li>
  )
}

/** One punch: what it was taken with, where, and the face it captured. */
function PunchRow({
  punch,
  image,
  onPreview,
}: {
  punch: AttendancePunch
  image: LightboxSlide | null
  onPreview: (slide: LightboxSlide) => void
}) {
  const checkIn = punch.eventType === 'check_in'

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-2.5">
      {image ? (
        /* 40px of face settles nothing — the point of the capture is to be
           looked at, so the thumbnail is the way into the full image. */
        <button
          type="button"
          onClick={() => onPreview(image)}
          aria-label={`View the photo captured at ${formatClockTime(punch.time) || punch.eventTime}`}
          className="group relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-md ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <img
            src={image.src as string}
            alt=""
            className="size-full object-cover transition-transform duration-200 group-hover:scale-110"
          />
          <span className="absolute inset-0 grid place-items-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
            <Maximize2 className="size-3.5" />
          </span>
        </button>
      ) : (
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-md',
            checkIn ? 'bg-success/12 text-success' : 'bg-destructive/12 text-destructive',
          )}
        >
          {checkIn ? <LogIn className="size-4" /> : <LogOut className="size-4" />}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium tabular-nums">
          {formatClockTime(punch.time) || punch.eventTime || '—'}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {punch.device && (
            <span className="inline-flex items-center gap-1">
              <Smartphone className="size-3" />
              {punch.device}
            </span>
          )}
          {/* Raw coordinates say nothing to the person reading this — the map
              behind the link is the answer, so the hover says where it goes
              rather than reciting the numbers. */}
          {punch.latitude && punch.longitude && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`https://www.google.com/maps?q=${punch.latitude},${punch.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  <MapPin className="size-3" />
                  View on Map
                </a>
              </TooltipTrigger>
              <TooltipContent>
                Open where this punch was taken in Google Maps
              </TooltipContent>
            </Tooltip>
          )}
        </p>
      </div>

      <Badge variant={checkIn ? 'success' : 'destructive'}>
        {checkIn ? 'In' : 'Out'}
      </Badge>
    </div>
  )
}

/** One of the three rollup figures. `''` means nothing on record. */
function Figure({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border p-2.5 text-center">
      <p className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value || '—'}</p>
    </div>
  )
}
