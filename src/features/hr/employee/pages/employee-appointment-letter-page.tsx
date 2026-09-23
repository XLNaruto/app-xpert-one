import {
  ArrowLeft,
  Download,
  FileSignature,
  Languages,
  Loader2,
  Minus,
  Plus,
  Printer,
  RotateCcw,
} from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Forbidden, NotFound } from '@/features/error'
import { APPOINTMENT_VARIANTS, LETTER_LANGUAGES } from '../constants'
import { useEmployeeAppointmentLetter } from '../hooks/use-employee-appointment-letter'
import { AppointmentOrder } from '../components/appointment-order'
import { LetterToggle } from '../components/letter-toggle'

const LANGUAGE_OPTIONS = LETTER_LANGUAGES.map((l) => ({ value: l.value, label: l.native }))

/**
 * Appointment Letter — the order HR issues at joining, previewed as A4 sheets
 * and exported as a PDF or printed, in English, Hindi or Gujarati.
 *
 * Reached from the employee list's row menu; `?data=` carries the employee id.
 * The preview can be zoomed freely because download and print render their own
 * full-size copy of the letter off-screen.
 */
export function EmployeeAppointmentLetterPage({ data }: { data?: string }) {
  const employeeId = decryptId(data)
  const {
    employee,
    isLoading,
    isError,
    isForbidden,
    forbiddenMessage,
    fields,
    lang,
    setLang,
    variant,
    setVariant,
    variantHint,
    docLabel,
    zoom,
    zoomOut,
    zoomIn,
    zoomReset,
    busy,
    download,
    print,
    goBack,
  } = useEmployeeAppointmentLetter(employeeId)

  // No usable token — nothing to issue a letter for.
  if (employeeId === undefined) return <NotFound />
  if (isForbidden) return <Forbidden description={forbiddenMessage} />
  if (!isLoading && (isError || !employee)) return <NotFound />

  return (
    <div className="space-y-6 pb-10">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <Button
              variant="outline"
              size="icon"
              className="mt-1 shrink-0"
              aria-label="Back to employees"
              onClick={goBack}
            >
              <ArrowLeft className="size-4" />
            </Button>

            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-4 w-72" />
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                  {docLabel}
                </p>
                <h1 className="font-heading text-2xl font-semibold tracking-tight">
                  {fields.fullName || 'Employee'}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {fields.code && <Badge variant="outline">{fields.code}</Badge>}
                  {fields.designation && <span>{fields.designation}</span>}
                  {fields.joiningDate && <span>• Joined {fields.joiningDate}</span>}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Which order is being issued: the joining-day appointment, or the
                renewal whose dates are written in by hand. */}
            <LetterToggle
              icon={FileSignature}
              label="Letter type"
              value={variant}
              options={APPOINTMENT_VARIANTS}
              onChange={setVariant}
            />
            <LetterToggle
              icon={Languages}
              label="Letter language"
              value={lang}
              options={LANGUAGE_OPTIONS}
              onChange={setLang}
            />

            <div className="flex items-center gap-1 rounded-lg border border-border p-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Zoom out"
                onClick={zoomOut}
              >
                <Minus className="size-3.5" />
              </Button>
              <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Zoom in"
                onClick={zoomIn}
              >
                <Plus className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Reset zoom to 100%"
                title="Reset to 100%"
                disabled={zoom === 1}
                onClick={zoomReset}
              >
                <RotateCcw className="size-3.5" />
              </Button>
            </div>

            <Button variant="outline" disabled={isLoading || busy !== null} onClick={print}>
              {busy === 'print' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Printer className="size-4" />
              )}
              Print
            </Button>
            <Button
              className="dark:text-white"
              disabled={isLoading || busy !== null}
              onClick={download}
            >
              {busy === 'download' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* The sheets are paper whatever the theme, so the desk behind them is a
          neutral grey in light and dark alike. */}
      <div className="overflow-auto rounded-xl border border-border bg-zinc-100 p-6 dark:bg-zinc-900">
        <p className="mb-4 text-center text-xs text-muted-foreground">{variantHint}</p>
        {isLoading ? (
          <Skeleton className="mx-auto aspect-[794/1123] w-full max-w-[600px] rounded-none" />
        ) : (
          <div
            key={`${variant}-${lang}`}
            className="mx-auto w-fit animate-in fade-in-0 slide-in-from-bottom-2 duration-200 [&_.pdf-section]:mb-6 [&_.pdf-section]:shadow-lg [&_.pdf-section]:ring-1 [&_.pdf-section]:ring-black/10"
            // `zoom` reflows where `transform: scale()` wouldn't, keeping the
            // scroll area the right height.
            style={{ zoom }}
          >
            <AppointmentOrder fields={fields} lang={lang} variant={variant} />
          </div>
        )}
      </div>
    </div>
  )
}
