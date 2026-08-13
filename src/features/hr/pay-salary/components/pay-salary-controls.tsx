import {
  BanknoteArrowUp,
  CircleCheck,
  CircleX,
  FileSpreadsheet,
  History,
  Search,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatAmount } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { PAY_SALARY_TABS, type PaySalaryStatus } from '../constants'

interface PaySalaryControlsProps {
  status: PaySalaryStatus
  onStatusChange: (value: PaySalaryStatus) => void
  search: string
  onSearchChange: (value: string) => void

  selectedCount: number
  selectedTotal: number
  onClearSelection: () => void

  /** Open Confirm & Pay. Rendered only with the create right on the resource. */
  canPay: boolean
  onPay: () => void
  /** Download the bank's bulk-transfer sheet for what is outstanding. */
  onExport: () => void
  isExporting: boolean

  onHistory: () => void
}

/**
 * Which side of the period is open, who to find on it, and what to do with what
 * is ticked.
 *
 * These sit on the list's own header rather than up in the filter card, and the
 * split is the point: the card decides *what period to settle* — staged behind
 * Load, because it is also what a batch gets filed under — while these are reads
 * of and actions on the list already on screen.
 *
 * Both the tabs and the search are server-side: `?status=` is a different read
 * split in SQL, and the term matches the name, code or mobile across every page,
 * so neither filters the page in the browser.
 *
 * The pay controls appear only on the unpaid tab, because a paid salary has
 * nothing left to settle — the endpoint refuses it — and offering the button
 * over rows that can only be rejected would be a trap.
 */
export function PaySalaryControls({
  status,
  onStatusChange,
  search,
  onSearchChange,
  selectedCount,
  selectedTotal,
  onClearSelection,
  canPay,
  onPay,
  onExport,
  isExporting,
  onHistory,
}: PaySalaryControlsProps) {
  const unpaid = status === 'unpaid'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-border p-0.5">
        {PAY_SALARY_TABS.map((tab) => {
          const active = status === tab.value
          const Icon = tab.value === 'unpaid' ? CircleX : CircleCheck
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onStatusChange(tab.value)}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="relative w-60">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Name, code or mobile…"
          className="h-8 pl-8 text-xs"
        />
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {/* What is ticked, and the way out of it. Spans pages — the endpoint
            serves up to 500 rows at a time — so the count is worth printing. */}
        {unpaid && selectedCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 py-1 pl-3 pr-1.5 text-xs font-medium text-primary">
            {selectedCount} selected · {formatAmount(selectedTotal)}
            <button
              type="button"
              onClick={onClearSelection}
              aria-label="Clear the selection"
              className="flex size-4 cursor-pointer items-center justify-center rounded-full text-primary/70 transition-colors hover:bg-primary/20 hover:text-primary"
            >
              <X className="size-3" />
            </button>
          </span>
        )}

        {unpaid && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={isExporting}
            className="gap-1.5"
          >
            <FileSpreadsheet className="size-4" />
            {isExporting ? 'Preparing…' : 'Export'}
          </Button>
        )}

        {unpaid && canPay && (
          <Button type="button" size="sm" onClick={onPay} className="gap-1.5">
            <BanknoteArrowUp className="size-4" />
            Pay Salary
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onHistory}
          className="gap-1.5"
        >
          <History className="size-4" />
          View Salary History
        </Button>
      </div>
    </div>
  )
}
