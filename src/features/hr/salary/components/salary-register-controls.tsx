import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { SALARY_STATUS_TABS } from '../constants'
import type { SalaryStatus } from '../schemas'

interface SalaryRegisterControlsProps {
  status: SalaryStatus
  onStatusChange: (value: SalaryStatus) => void
  search: string
  onSearchChange: (value: string) => void
}

/**
 * Which side of the register is open, and who to find on it.
 *
 * These live on the **grid's own header** rather than up in the toolbar, and the
 * split is the point. The toolbar decides *what register to run* — a designation
 * and a month, staged behind Calculate Salary, because choosing one re-seeds
 * every row of the form. These two are reads of the register already on screen:
 * a different side of it, or the same side narrowed to a name. Nothing typed is
 * lost by answering them, so they answer as they are typed and belong next to
 * the rows they act on.
 *
 * Both are server-side. The status tabs are a different `?status=` read, split in
 * SQL rather than filtered here, and the search is the endpoint's own `term` —
 * neither one filters the page in the browser, so both reset the pager.
 */
export function SalaryRegisterControls({
  status,
  onStatusChange,
  search,
  onSearchChange,
}: SalaryRegisterControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-border p-0.5">
        {SALARY_STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onStatusChange(tab.value)}
            className={cn(
              'cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors',
              status === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative w-56">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Name or employee code…"
          className="h-8 pl-8 text-xs"
        />
      </div>
    </div>
  )
}
