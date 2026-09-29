import { Globe2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAdminUser } from '../api/use-admin-users'
import type { AdminUser } from '../types'

/** How many company chips a row shows before folding the rest into "+N". */
const VISIBLE_COMPANIES = 2

interface AdminUserScopeCellProps {
  user: AdminUser
}

/**
 * The list's Scope column — "All companies", or the named companies of a
 * `COMPANY`-level reach.
 *
 * A list row carries `access_level` alone, so the names come from the detail
 * read. That's the same query the edit form opens on, so a later Edit click
 * renders from cache. Should the list ever start carrying `company_ids`, the
 * row's own names are used and nothing is fetched.
 */
export function AdminUserScopeCell({ user }: AdminUserScopeCellProps) {
  const isGlobal = user.accessLevel === 'GLOBAL'
  const needsDetail = !isGlobal && user.companies.length === 0
  const detail = useAdminUser(user.id, { enabled: needsDetail })

  if (isGlobal)
    return (
      <Badge variant="default" className="gap-1">
        <Globe2 className="size-3" />
        All companies
      </Badge>
    )

  if (needsDetail && detail.isLoading) return <Skeleton className="h-5 w-28 rounded-full" />

  const companies = needsDetail ? (detail.data?.companies ?? []) : user.companies
  if (companies.length === 0)
    return <Badge variant="secondary">Selected companies</Badge>

  const visible = companies.slice(0, VISIBLE_COMPANIES)
  const hidden = companies.slice(VISIBLE_COMPANIES)

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((company) => (
        <Badge key={company.id} variant="secondary">
          {company.name}
        </Badge>
      ))}
      {hidden.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="cursor-default">
              +{hidden.length}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <ul className="space-y-0.5">
              {hidden.map((company) => (
                <li key={company.id}>{company.name}</li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
