import type { Leave } from '../types'

/**
 * Who the leave belongs to — the column a reader scans by.
 *
 * The register answers a name and a code but no photo, so the avatar is the
 * person's initials. The code sits under the name because it's what tells two
 * people with the same name apart, and it's how the API's search matches too.
 */
export function LeaveEmployeeCell({ leave }: { leave: Leave }) {
  const name = leave.employeeName || 'Unknown employee'

  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase">
        {initialsOf(leave.employeeName)}
      </span>
      <div className="leading-tight">
        <span className="block font-medium text-foreground">{name}</span>
        {leave.employeeCode && (
          <span className="mt-0.5 inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            #{leave.employeeCode}
          </span>
        )}
      </div>
    </div>
  )
}

/** The first letter of the first two words — "Alka Rathod" → "AR". */
function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
  return letters || '—'
}
