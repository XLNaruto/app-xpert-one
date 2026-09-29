import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { getApiErrorMessage } from '@/lib/api-error'
import { frequencyLabel, RuleIcons } from '@/features/office-task/common'
import { useSopGroup } from '../api/use-sop-groups'
import type { SopGroupRow } from '../types'

/** Read-only look at a group's checklist, opened from the list — read from `GET /sop-groups/:id`. */
export function ChecklistPreviewDialog({
  template,
  onClose,
}: {
  template: SopGroupRow | null
  onClose: () => void
}) {
  const detail = useSopGroup(template?.id)
  const items = detail.data?.items ?? []

  return (
    <Dialog open={template !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl" onClose={onClose}>
        {template && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-10">{template.name}</DialogTitle>
              <DialogDescription>
                {template.appliesTo} ·{' '}
                {template.tasksPerDay} task{template.tasksPerDay === 1 ? '' : 's'} per employee per day
              </DialogDescription>
            </DialogHeader>
            {detail.isLoading ? (
              <div className="mt-4 space-y-2">
                {Array.from({ length: Math.min(template.itemsCount || 3, 5) }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : detail.isError ? (
              <p className="mt-4 text-sm text-destructive">
                {getApiErrorMessage(detail.error, "Couldn't load the checklist.")}
              </p>
            ) : (
              <ol className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto">
                {items.map((item, i) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg border border-border p-3"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.task}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {frequencyLabel(item.frequency)}
                      </p>
                    </div>
                    <RuleIcons photo={item.photoRequired} approval={item.needsApproval} />
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
