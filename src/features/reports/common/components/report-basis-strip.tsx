import { AlertTriangle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

/** One labelled figure on the strip. `null` values are dropped, not dashed. */
export interface ReportBasisItem {
  label: string
  value: string | null
}

interface ReportBasisStripProps {
  items: ReportBasisItem[]
  /**
   * `is_rate_on_file` — false means no rate was configured for the period and
   * the API priced the month on the statutory defaults. Worth saying out loud on
   * a statement that will be filed.
   */
  isRateOnFile?: boolean
  /** When a rate IS on file, the date it took effect. */
  rateEffectiveDate?: string | null
  /** What is missing, in the screen's own words. */
  missingRateMessage?: string
}

/**
 * The rates and establishment a statutory report was built on.
 *
 * PF, ESIC and PT all carry this alongside their rows, and it is not decoration:
 * the same employee's contribution differs with the ceiling and the rate in
 * force, so a challan printed without saying which ones applied can't be
 * reconciled against the portal's own computation.
 *
 * A rate that ISN'T on file is called out rather than passed over. The figures
 * are still real — the API fell back to the statutory defaults — but a return
 * filed on a default rate when the establishment has its own is the kind of
 * thing that surfaces months later as a demand notice.
 */
export function ReportBasisStrip({
  items,
  isRateOnFile,
  rateEffectiveDate,
  missingRateMessage = 'No rate is configured for this period — the figures use the statutory defaults.',
}: ReportBasisStripProps) {
  const shown = items.filter((item) => item.value !== null && item.value !== '')
  if (!shown.length && isRateOnFile !== false) return null

  return (
    <div className="mb-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {shown.map((item) => (
          <span key={item.label} className="text-xs text-muted-foreground">
            {item.label}{' '}
            <span className="font-semibold text-foreground tabular-nums">{item.value}</span>
          </span>
        ))}
        {isRateOnFile && rateEffectiveDate && (
          <span className="text-xs text-muted-foreground">
            Rate effective{' '}
            <span className="font-semibold text-foreground">
              {formatDate(rateEffectiveDate)}
            </span>
          </span>
        )}
      </div>

      {isRateOnFile === false && (
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-warning">
          <AlertTriangle className="size-3.5 shrink-0" />
          {missingRateMessage}
        </p>
      )}
    </div>
  )
}
