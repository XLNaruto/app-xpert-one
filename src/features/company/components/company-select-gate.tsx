import { Building2, Check, CheckCircle2, Loader2, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useMediaResolver } from '@/hooks/use-media-url'
import { useCompanyGate } from '../hooks/use-company-gate'

/**
 * Post-login company gate. The active company is session state the server keeps
 * on the token; until the session submits a selection, this blocks the app with
 * a non-dismissable modal. Every account picks one (highlight, then Confirm) —
 * a single-company account included, with its one company pre-highlighted. A
 * sign out escape hatch is offered for anyone who reached the wrong account.
 *
 * Mounted inside the authenticated shell; shares the `/user/my/companies` cache
 * with the topbar switcher, so it costs no extra request.
 */
export function CompanySelectGate() {
  const gate = useCompanyGate()
  const resolveMedia = useMediaResolver()

  if (!gate.open) return null

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent showClose={false} className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
            <div>
              <DialogTitle>Select Company</DialogTitle>
              <DialogDescription>Choose your company</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-3">
          {gate.companies.map((company) => {
            const isSelected = gate.selectedId === company.id
            const logo = resolveMedia(company.logo)
            return (
              <button
                key={company.id}
                type="button"
                disabled={gate.busy}
                onClick={() => gate.select(company.id)}
                aria-pressed={isSelected}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'bg-background hover:border-primary/50 hover:bg-accent',
                )}
              >
                {logo ? (
                  <img
                    src={logo}
                    alt=""
                    className="size-8 shrink-0 rounded-md object-contain"
                  />
                ) : (
                  <span
                    className={cn(
                      'grid size-8 shrink-0 place-items-center rounded-md text-xs font-semibold uppercase',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {company.name.charAt(0)}
                  </span>
                )}
                <span className="flex-1 overflow-hidden">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {company.name}
                  </span>
                  {company.code && (
                    <span className="block truncate text-xs text-muted-foreground">
                      Code: {company.code}
                    </span>
                  )}
                </span>
                {isSelected && (
                  <CheckCircle2 className="size-4 shrink-0 text-primary" />
                )}
              </button>
            )
          })}
        </div>

        {gate.error && (
          <p className="mt-3 text-sm text-destructive">{gate.error.message}</p>
        )}

        <DialogFooter className="mt-4">
          <Button
            variant="ghost"
            disabled={gate.busy}
            onClick={gate.logout}
            className="gap-2 text-destructive hover:bg-accent hover:text-accent-foreground"
          >
            {gate.isLoggingOut ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            Sign out
          </Button>
          <Button
            disabled={gate.busy || gate.selectedId == null}
            onClick={gate.confirm}
            className="gap-2"
          >
            {gate.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
