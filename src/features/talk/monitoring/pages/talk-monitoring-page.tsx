import { cn } from '@/lib/utils'
import { MonitoringPeoplePane } from '../components/monitoring-people-pane'
import { MonitoringChatsPane } from '../components/monitoring-chats-pane'
import { MonitoringThreadPane } from '../components/monitoring-thread-pane'
import { MonitoringIntro } from '../components/monitoring-intro'
import { useTalkMonitoring } from '../hooks/use-talk-monitoring'

/**
 * Chat Monitoring — the owner's read-only window onto the account's Talk
 * conversations.
 *
 * Three panes, each narrowing the next: who holds a Talk identity, what
 * conversations that person is in, and the thread itself. The endpoint enforces
 * the same order — reading a thread checks the PAIRING of person and chat, so
 * the middle pane is a gate rather than a convenience.
 *
 * ACCOUNT-scoped, not tenant-scoped: every company of the account is in the
 * directory with no picker and no filter, because whoever can open this screen
 * reaches all of them by construction. That's why the sidebar row is marked
 * `companyIndependent` and why nothing here waits on a company being selected.
 *
 * OWNER ONLY, enforced twice — the route guard on `talk-monitoring`, and the
 * thread read on `talk-monitoring:read`, which is the entitlement the
 * subscription actually sells.
 *
 * FULL-SCREEN: it renders under `_workspace`, not `_authenticated`, so there is
 * no sidebar, no topbar and no footer taking height from it — the sidebar row
 * opens it in its own tab instead. Three panes that each scroll independently
 * can't share the panel shell's single scrollbar, and a thread read for any
 * length of time wants the whole viewport rather than what's left of it.
 */
export function TalkMonitoringPage() {
  const monitoring = useTalkMonitoring()
  const { selectedPerson, selectedChat } = monitoring

  /*
    Below `xl` the screen is ONE pane at a time, and this is which one: the
    deepest thing chosen so far. Three panes need roughly 20rem each before the
    thread has room left to read in, so anything narrower than 1280px was
    squeezing all three rather than showing any of them properly.

    Selection alone decides it — no local "which pane is showing" state, which
    would be a second source of truth able to disagree with the selection that
    put it there.
  */
  const activePane = selectedChat ? 'thread' : selectedPerson ? 'chats' : 'people'

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/*
        The panes fill everything the workspace bar leaves and each scrolls
        inside itself — no page-level scrollbar anywhere on this screen. The
        title lives in that bar (`WorkspaceLayout`), so there is no header row
        here taking height from the conversation.
      */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={cn(
            'min-w-0',
            activePane === 'people' ? 'flex w-full' : 'hidden',
            'xl:flex xl:w-auto',
          )}
        >
          <MonitoringPeoplePane monitoring={monitoring} />
        </div>

        {selectedPerson && (
          <div
            className={cn(
              'min-w-0',
              activePane === 'chats' ? 'flex w-full' : 'hidden',
              'xl:flex xl:w-auto',
            )}
          >
            <MonitoringChatsPane monitoring={monitoring} />
          </div>
        )}

        {selectedChat ? (
          <MonitoringThreadPane monitoring={monitoring} />
        ) : (
          // The intro explains a three-pane flow, so it only belongs where all
          // three are on screen. Narrower, the pane it would fill isn't there.
          <div className="hidden min-w-0 flex-1 xl:flex">
            <MonitoringIntro hasPerson={Boolean(selectedPerson)} />
          </div>
        )}
      </div>
    </div>
  )
}
