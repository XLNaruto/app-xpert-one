import { AlertCircle, ChevronLeft, Loader2, Lock, MessageSquareOff, Users } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/empty-state'
import { useMediaResolver } from '@/hooks/use-media-url'
import { getApiErrorMessage } from '@/lib/api-error'
import { MonitoringThreadList } from './monitoring-thread-list'
import type { useTalkMonitoring } from '../hooks/use-talk-monitoring'

/**
 * THE THREAD — the conversation picked on both sidebars, read-only.
 *
 * It grows UPWARD. The endpoint takes its window from the newest end, so the
 * first page is the latest exchange and each further page is older history
 * prepended above what is already on screen — which is why the list itself is
 * `<Virtuoso>` (see `MonitoringThreadList`): opening at the bottom, holding the
 * reading position across a prepend and measuring bubbles of wildly different
 * heights are all things it does natively.
 *
 * This component keeps the chrome — the header, and every state the thread can
 * be in before there is anything to scroll.
 *
 * Nothing here can be replied to, reacted to or forwarded, and that isn't an
 * unfinished edge — the monitor is not a participant. There are no read receipts
 * and no pins either: a tick is the sender's information and a pin is a
 * participant's arrangement, neither of which is the monitor's to see.
 */
export function MonitoringThreadPane({
  monitoring,
}: {
  monitoring: ReturnType<typeof useTalkMonitoring>
}) {
  const {
    canReadThreads,
    selectedPerson,
    selectedChat,
    clearChat,
    messagesQuery,
    messages,
  } = monitoring

  const resolveMedia = useMediaResolver()

  if (!selectedChat || !selectedPerson) return null

  const isGroup = selectedChat.type === 'group'

  /*
    Virtuoso numbers its items from a fixed anchor and counts back as history is
    prepended, so that index space only means anything for ONE thread. Switching
    conversation has to start a fresh list rather than reinterpret the old
    indices, so the key remounts it.
  */
  const threadKey = `${selectedPerson.talkUserId}-${selectedChat.id}`

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-muted/30">
      <header className="flex items-center gap-3 border-b bg-card px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={clearChat}
          aria-label="Back to conversations"
          // The same circular, bordered arrow the workspace bar uses to go back
          // to the panel — going back should look the same wherever it appears.
          className="shrink-0 rounded-full border xl:hidden"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <Avatar
          name={selectedChat.title}
          src={resolveMedia(selectedChat.avatar) || undefined}
          className="size-10"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{selectedChat.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {isGroup
              ? `${selectedChat.memberCount} participants`
              : `Private chat with ${selectedPerson.name ?? 'this person'}`}
          </p>
        </div>

        <ParticipantStanding chat={selectedChat} />

      </header>

      {/*
        Every pre-scroll state renders in a plain box; only the thread itself is
        virtualized. Keeping them apart means Virtuoso is mounted with real data
        or not at all, so it never has to measure an empty list and then be told
        to jump to the bottom of one.
      */}
      {!canReadThreads ? (
        <ThreadState>
          <EmptyState
            icon={Lock}
            title="Reading conversations isn't enabled"
            description="Your plan covers seeing who is talking, but not opening what they said. Contact the account owner to enable conversation monitoring."
          />
        </ThreadState>
      ) : messagesQuery.isPending ? (
        <ThreadState>
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading conversation…
          </p>
        </ThreadState>
      ) : messagesQuery.isError ? (
        <ThreadState>
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load this conversation"
            description={getApiErrorMessage(
              messagesQuery.error,
              'Something went wrong while reading the thread.',
            )}
          />
        </ThreadState>
      ) : messages.length === 0 ? (
        <ThreadState>
          <EmptyState
            icon={MessageSquareOff}
            title="Nothing to read"
            description="This conversation has no messages yet."
          />
        </ThreadState>
      ) : (
        <MonitoringThreadList
          key={threadKey}
          messages={messages}
          ownTalkUserId={selectedPerson.talkUserId}
          hasOlder={messagesQuery.hasNextPage}
          isLoadingOlder={messagesQuery.isFetchingNextPage}
          onLoadOlder={() => void messagesQuery.fetchNextPage()}
        />
      )}
    </section>
  )
}

/** The padded box every non-thread state sits in. */
function ThreadState({ children }: { children: React.ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>
}

/**
 * The monitored person's standing in the conversation being read, when it is
 * anything other than "an ordinary member who is still here".
 *
 * Worth saying in the header rather than only on the row: a thread read without
 * knowing they had left it halfway through reads differently.
 */
function ParticipantStanding({
  chat,
}: {
  chat: NonNullable<ReturnType<typeof useTalkMonitoring>['selectedChat']>
}) {
  const { participant } = chat
  if (!participant) return null

  const label = participant.hasBeenRemoved
    ? 'Removed'
    : participant.hasLeft
      ? 'Left'
      : participant.isBlocked
        ? 'Blocked'
        : participant.memberRole === 'owner'
          ? 'Group owner'
          : participant.memberRole === 'admin'
            ? 'Group admin'
            : null

  if (!label) return null

  return (
    <Badge
      variant={
        participant.hasBeenRemoved || participant.hasLeft || participant.isBlocked
          ? 'secondary'
          : 'default'
      }
      className="hidden shrink-0 sm:inline-flex"
    >
      <Users className="mr-1 size-3" />
      {label}
    </Badge>
  )
}
