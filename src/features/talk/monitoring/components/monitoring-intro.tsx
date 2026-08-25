import { MessageSquareText, ScrollText, UserSearch } from 'lucide-react'

/**
 * What the reading pane shows before a conversation has been picked.
 *
 * The screen is three panes deep, and the two on the left mean nothing until
 * they're used in order — so the empty state teaches the order rather than just
 * saying "nothing selected".
 */
const STEPS = [
  { icon: UserSearch, step: 'Step 1', label: 'Pick a person' },
  { icon: MessageSquareText, step: 'Step 2', label: 'Open a chat' },
  { icon: ScrollText, step: 'Step 3', label: 'Read history' },
] as const

export function MonitoringIntro({ hasPerson }: { hasPerson: boolean }) {
  return (
    <section className="flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-6 bg-muted/30 p-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
        <UserSearch className="size-7 text-primary" />
      </div>

      <div className="max-w-md space-y-2">
        <h2 className="font-heading text-lg font-semibold">
          {hasPerson ? 'Pick a conversation' : 'Pick someone'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {hasPerson
            ? 'Choose one of their chats to read the full history — safely, in read-only mode.'
            : 'Select an employee or admin on the left to see the conversations they take part in.'}
        </p>
      </div>

      <ol className="flex flex-wrap items-stretch justify-center gap-3">
        {STEPS.map(({ icon: Icon, step, label }) => (
          <li
            key={step}
            className="flex w-32 flex-col items-center gap-2 rounded-xl border bg-card px-3 py-4"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="size-4 text-primary" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {step}
            </span>
            <span className="text-xs font-medium">{label}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
