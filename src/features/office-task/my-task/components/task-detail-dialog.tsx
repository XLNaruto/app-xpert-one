import type { ReactNode } from 'react'
import { DetailItem } from '@/components/common/detail-item'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDate, formatDateTime } from '@/lib/utils'
import {
  dayLabel,
  deadlineInfo,
  formatDuration,
  frequencyLabel,
  PriorityBadge,
  ProgressTimeline,
  ProofStrip,
  RuleIcons,
  TaskStatusBadge,
  VerdictBadge,
} from '@/features/office-task/common'
import type { CompleteTarget } from '../types'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  )
}

/** Read-only look at one task — what it is, what was handed in, the verdict. */
export function TaskDetailDialog({
  target,
  workedSeconds,
  onClose,
}: {
  target: CompleteTarget | null
  workedSeconds?: number
  onClose: () => void
}) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl" onClose={onClose}>
        {target && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-10">{target.row.task}</DialogTitle>
              <DialogDescription>
                {target.kind === 'sop'
                  ? `SOP · ${target.row.templateName} · ${dayLabel(target.row.date)}`
                  : `Project Task · ${formatDate(target.row.startDate)} → ${formatDate(target.row.deadline)}`}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 max-h-[65vh] space-y-5 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Section title="Status">
                  <TaskStatusBadge
                    status={target.row.status}
                    paused={target.kind === 'sop' && !target.row.runningSince}
                  />
                </Section>
                {target.kind === 'sop' ? (
                  <>
                    <DetailItem label="Time Worked" value={formatDuration(workedSeconds ?? target.row.workedSeconds)} />
                    <DetailItem
                      label="Run"
                      value={target.row.slots > 1 ? `${target.row.slot} of ${target.row.slots}` : 'Once a day'}
                    />
                  </>
                ) : (
                  <>
                    <Section title="Priority">
                      <PriorityBadge priority={target.row.priority} />
                    </Section>
                    <DetailItem
                      label="Remaining"
                      value={target.row.status === 'completed' ? 'Done' : deadlineInfo(target.row.deadline).label}
                      hint={`Progress updates: ${frequencyLabel(target.row.updatesPerDay)}`}
                    />
                  </>
                )}
                <Section title="Needs">
                  <RuleIcons
                    photo={target.row.photoRequired}
                    approval={target.kind === 'sop' ? target.row.needsApproval : target.row.needsVerification}
                  />
                </Section>
              </div>

              {target.row.description && (
                <Section title="Description">
                  <p className="text-sm">{target.row.description}</p>
                </Section>
              )}

              {target.row.submittedAt && (
                <>
                  <Section title={`What You Submitted · ${formatDateTime(target.row.submittedAt)}`}>
                    <p className="text-sm">{target.row.note || '—'}</p>
                  </Section>
                  <Section title="Proof">
                    <ProofStrip files={target.row.proof} required={target.row.photoRequired} />
                  </Section>
                </>
              )}

              {(target.row.verdict || target.row.status === 'pending_approval') && (
                <Section title="Approval">
                  <div className="flex flex-wrap items-center gap-2">
                    <VerdictBadge verdict={target.row.verdict} />
                    {target.row.verdictBy && (
                      <span className="text-xs text-muted-foreground">
                        by {target.row.verdictBy} · {formatDateTime(target.row.verdictAt)}
                      </span>
                    )}
                  </div>
                  {target.row.verdictRemarks && (
                    <p className="mt-1 text-sm italic text-muted-foreground">“{target.row.verdictRemarks}”</p>
                  )}
                </Section>
              )}

              {target.kind === 'project' && (
                <Section title="Progress">
                  <div className="pl-2">
                    <ProgressTimeline notes={target.row.progress} />
                  </div>
                </Section>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
