import { formatDateTime } from '@/lib/utils'

export function AuditStack({ at, by }: { at: string | null; by: string | null }) {
  if (!at && !by) return <span className="text-muted-foreground">—</span>
  return (
    <div className="leading-tight">
      <span className="block text-sm text-foreground">{formatDateTime(at)}</span>
      <span className="block text-sm font-semibold text-foreground">{by || '—'}</span>
    </div>
  )
}
