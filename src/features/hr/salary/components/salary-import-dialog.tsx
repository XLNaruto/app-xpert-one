import { useRef, useState, type DragEvent } from 'react'
import { Download, FileSpreadsheet, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { salaryImportContentType } from '../api/salary-api'

interface SalaryImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Sends the picked sheet. The dialog stays open until the import answers. */
  onImport: (file: File) => void
  isImporting: boolean
  /** Downloads the pre-filled sheet for the register on screen. */
  onDownloadTemplate: () => void
  isDownloadingTemplate: boolean
  /** The month the sheet will be imported for, e.g. "August 2026". */
  monthLabel: string
}

/** `1.2 MB` — enough to tell one workbook from another in the picked-file row. */
function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Import a month from a spreadsheet — and get the spreadsheet to import.
 *
 * The two halves are one screen because they are one round trip: the sheet has
 * to be the one the export produces — the import reads rows by column position
 * and matches people by employee code and service id — so the download isn't a
 * convenience, it is the only supported way in. Left is where the sheet comes
 * from, right is where it goes back.
 *
 * The template is cut for the register on screen: pending postings of the month
 * and designation being run, Present Days pre-filled from attendance. Everything
 * about *which* month is written inside the sheet, and that is the one that wins
 * server-side.
 *
 * The upload goes to storage on a presigned PUT and only its key is sent on, so
 * a large workbook never travels through the API.
 */
export function SalaryImportDialog({
  open,
  onOpenChange,
  onImport,
  isImporting,
  onDownloadTemplate,
  isDownloadingTemplate,
  monthLabel,
}: SalaryImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [isOver, setIsOver] = useState(false)

  const close = () => {
    if (isImporting) return
    setFile(null)
    setProblem(null)
    onOpenChange(false)
  }

  /* Checked here rather than at the call: the presign only signs `.xlsx` and
     `.csv`, and a rejected file should say so where it was picked. */
  const take = (picked: File | undefined) => {
    if (!picked) return
    if (!salaryImportContentType(picked)) {
      setFile(null)
      setProblem('Only .xlsx and .csv sheets can be imported.')
      return
    }
    setProblem(null)
    setFile(picked)
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsOver(false)
    if (isImporting) return
    take(event.dataTransfer.files?.[0])
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-3xl p-0" onClose={close}>
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <FileSpreadsheet className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-semibold leading-tight text-foreground">
              Import Salary
            </h2>
            <p className="text-xs text-muted-foreground">
              Download the sheet, or upload the filled one for {monthLabel}
            </p>
          </div>
        </div>

        {/* Two steps side by side, in the order they're done — the sheet is got
            on the left and comes back on the right. They stack on a narrow
            screen, which keeps that same reading order. */}
        <div className="grid gap-4 p-5 md:grid-cols-2">
          {/* ── Get the sheet ── */}
          <div className="flex flex-col rounded-xl border border-border p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Download className="size-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Download Sheet</h3>
                <p className="text-[11px] text-muted-foreground">
                  The import format, pre-filled
                </p>
              </div>
            </div>

            <p className="mt-3 flex-1 text-xs leading-relaxed text-muted-foreground">
              One row per employee still to be processed for {monthLabel}, with
              present days already filled in from attendance. Type the pay over
              what needs it and send the same file back — the other cells are
              locked, because rows are matched on the codes in them.
            </p>

            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full"
              disabled={isDownloadingTemplate || isImporting}
              onClick={onDownloadTemplate}
            >
              <Download className="size-4" />
              {isDownloadingTemplate ? 'Preparing…' : 'Download Sheet'}
            </Button>
          </div>

          {/* ── Send it back ── */}
          <div className="flex flex-col rounded-xl border border-border p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Upload className="size-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Upload Sheet</h3>
                <p className="text-[11px] text-muted-foreground">
                  Import salary from Excel / CSV
                </p>
              </div>
            </div>

            {/* Drop zone — a click opens the picker, so the whole panel is the
                control and the hidden input is only the mechanism. */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => !isImporting && inputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click()
              }}
              onDragOver={(event) => {
                event.preventDefault()
                setIsOver(true)
              }}
              onDragLeave={() => setIsOver(false)}
              onDrop={onDrop}
              className={cn(
                'mt-3 flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
                isOver
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/5',
                isImporting && 'pointer-events-none opacity-60',
              )}
            >
              <Upload className="size-7 text-primary" />
              <p className="text-sm font-medium text-foreground">
                Drag &amp; drop your file here
              </p>
              <p className="text-xs text-muted-foreground">or click to browse</p>
              <span className="rounded-full border border-border bg-card px-3 py-1 text-[11px] text-muted-foreground">
                .xlsx · .csv
              </span>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(event) => {
                take(event.target.files?.[0])
                /* Cleared so picking the same file twice still fires a change. */
                event.target.value = ''
              }}
            />

            {file && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2">
                <FileSpreadsheet className="size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {fileSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  disabled={isImporting}
                  aria-label="Remove file"
                  className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}

            {problem && (
              <p className="mt-3 text-xs font-medium text-destructive">{problem}</p>
            )}

            <Button
              type="button"
              className="mt-4 w-full"
              disabled={!file || isImporting}
              onClick={() => file && onImport(file)}
            >
              <Upload className="size-4" />
              {isImporting ? 'Importing…' : 'Import Salaries'}
            </Button>
          </div>
        </div>

        <p className="px-5 pb-5 text-center text-[11px] text-muted-foreground">
          Download the sheet first, fill in the data, then upload it back — the
          period written in the file is the one processed.
        </p>
      </DialogContent>
    </Dialog>
  )
}
