import { Building2, CheckCircle2, Loader2, Plus } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useMediaResolver } from '@/hooks/use-media-url'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { useMyCompanies } from '../api/use-my-companies'
import { useSelectCompany } from '../api/use-select-company'

interface CompanyRequiredProps {
  /**
   * What the screen is for, in plural lowercase — `"branches"`, `"employees"`.
   * Reads as "Select a company to continue with branches."
   */
  what: string
}

/**
 * The state a company-scoped screen renders when no company is active: the
 * screen can't be loaded, but that's a selection the user can make right here,
 * not a failure. Lists the companies the account belongs to (picking one
 * switches the session and every query on the screen refetches), and falls back
 * to a create-a-company prompt when the account has none yet.
 *
 * Shown in place of the table by `<ScopedDataError>` whenever a query fails with
 * `NO_ACTIVE_COMPANY` — see `lib/active-company.ts`.
 */
export function CompanyRequired({ what }: CompanyRequiredProps) {
  const { companies, isLoading } = useMyCompanies()
  const selectCompany = useSelectCompany()
  const resolveMedia = useMediaResolver()
  const { canCreate } = useResourceAccess(PERMISSIONS.companies)

  const hasCompanies = companies.length > 0

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 px-6 py-14 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Building2 className="size-7" />
      </div>

      <h3 className="font-heading text-lg font-semibold">Select a company</h3>
      <p className="mt-1.5 max-w-sm text-balance text-sm leading-relaxed text-muted-foreground">
        {hasCompanies
          ? `${what.charAt(0).toUpperCase()}${what.slice(1)} are scoped to a single company. Choose the one you want to work in — you can switch any time from the top bar.`
          : 'Your account isn’t linked to a company yet. Create one to start setting up your masters.'}
      </p>

      {isLoading && (
        <Loader2 className="mt-6 size-5 animate-spin text-muted-foreground" />
      )}

      {/* The same pick-a-company list the post-login gate shows, inline. */}
      {hasCompanies && (
        <div className="mt-6 flex w-full max-w-sm flex-col gap-2">
          {companies.map((company) => {
            const logo = resolveMedia(company.logo)
            const isPending =
              selectCompany.isPending && selectCompany.variables === company.id
            return (
              <button
                key={company.id}
                type="button"
                disabled={selectCompany.isPending}
                onClick={() => selectCompany.mutate(company.id)}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2.5 rounded-lg border bg-background px-3 py-2 text-left transition-colors',
                  'hover:border-primary/50 hover:bg-accent',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                  isPending && 'border-primary ring-1 ring-primary',
                )}
              >
                {logo ? (
                  <img
                    src={logo}
                    alt=""
                    className="size-8 shrink-0 rounded-md object-contain"
                  />
                ) : (
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold uppercase text-muted-foreground">
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
                {isPending ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                ) : (
                  <CheckCircle2 className="size-4 shrink-0 text-muted-foreground/40" />
                )}
              </button>
            )
          })}
        </div>
      )}

      {selectCompany.isError && (
        <p className="mt-3 text-sm text-destructive">
          {selectCompany.error.message}
        </p>
      )}

      {!isLoading && !hasCompanies && canCreate && (
        <Link
          to="/master/company/create"
          className={cn(buttonVariants({ variant: 'default' }), 'mt-6')}
        >
          <Plus className="size-4" />
          Add New Company
        </Link>
      )}
    </div>
  )
}
