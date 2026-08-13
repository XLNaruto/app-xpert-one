import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronRight, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { SalaryImportResult, SalaryImportRow } from '../types'

interface SalaryImportResultDialogProps {
  /** The import's report — `null` closes the dialog. */
  result: SalaryImportResult | null
  onClose: () => void
}

type Tab = 'saved' | 'skipped' | 'errors'

const TABS: { key: Tab; label: string; tone: string }[] = [
  { key: 'saved', label: 'Saved', tone: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'skipped', label: 'Skipped', tone: 'text-amber-600 dark:text-amber-400' },
  { key: 'errors', label: 'Errors', tone: 'text-rose-600 dark:text-rose-400' },
]

/**
 * What the import did, row by row.
 *
 * The import is one transaction but not one outcome: a sheet of a hundred rows
 * can create eighty, skip fifteen a month was already processed for and fail
 * five the sheet got wrong. A toast can only report one of those, so the three
 * lists are shown as they came back and the screen opens on the one that most
 * needs reading — the failures, if there are any.
 */
export function SalaryImportResultDialog({
  result,
  onClose,
}: SalaryImportResultDialogProps) {
  /* Opens on whatever wants attention: errors, else skips, else what landed. */
  const [tab, setTab] = useState<Tab | null>(null)

  if (!result) return null

  const counts: Record<Tab, SalaryImportRow[]> = {
    saved: result.saved,
    skipped: result.skipped,
    errors: result.errors,
  }
  const active =
    tab ??
    (result.errors.length ? 'errors' : result.skipped.length ? 'skipped' : 'saved')
  const rows = counts[active]

  const clean = result.errors.length === 0 && result.skipped.length === 0
  const close = () => {
    setTab(null)
    onClose()
  }

  return (
    <Dialog open onOpenChange={close}>
      <DialogContent className="max-w-md p-0" onClose={close}>
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <span
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-xl',
              clean
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            )}
          >
            {clean ? (
              <CheckCircle2 className="size-5" />
            ) : (
              <AlertTriangle className="size-5" />
            )}
          </span>
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-semibold leading-tight text-foreground">
              Salary Result
            </h2>
            <p className="text-xs text-muted-foreground">Salary import completed</p>
          </div>
        </div>

        {/* The three counts, and the tab strip in one. */}
        <div className="grid grid-cols-3 border-b border-border">
          {TABS.map(({ key, label, tone }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'cursor-pointer border-b-2 px-2 py-3 text-center transition-colors',
                active === key
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent hover:bg-accent/50',
              )}
            >
              <span
                className={cn(
                  'block text-xl font-bold tabular-nums',
                  counts[key].length ? tone : 'text-muted-foreground',
                )}
              >
                {counts[key].length}
              </span>
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </span>
            </button>
          ))}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              {active === 'saved'
                ? 'Nothing was created from this sheet.'
                : `No ${active === 'errors' ? 'errors' : 'skipped rows'} — nothing to read here.`}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((row, index) => (
                <li
                  key={`${row.employeeCode}-${index}`}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span
                    className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-full',
                      active === 'saved' &&
                        'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                      active === 'skipped' &&
                        'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                      active === 'errors' &&
                        'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                    )}
                  >
                    {active === 'saved' ? (
                      <CheckCircle2 className="size-3.5" />
                    ) : active === 'errors' ? (
                      <XCircle className="size-3.5" />
                    ) : (
                      <ChevronRight className="size-3.5" />
                    )}
                  </span>

                  <span className="min-w-0 flex-1 truncate text-sm font-medium tabular-nums text-foreground">
                    {row.employeeCode || 'No code'}
                  </span>

                  {/* The reason in full on hover — the row keeps one line so a
                      long list stays scannable. */}
                  {row.reason ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={cn(
                            'max-w-[55%] truncate rounded-full border px-2.5 py-1 text-[11px] font-medium',
                            active === 'errors'
                              ? 'border-rose-300 text-rose-600 dark:border-rose-900 dark:text-rose-400'
                              : 'border-amber-300 text-amber-600 dark:border-amber-900 dark:text-amber-400',
                          )}
                        >
                          {row.reason}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64 text-pretty font-normal">
                        {row.reason}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      Salary #{row.salaryId}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{rows.length}</span>
          </p>
          <Button type="button" size="sm" onClick={close}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
