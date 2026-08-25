import { AlertCircle, Ban, ChevronLeft, Loader2, LogOut, MessageSquareOff, UserMinus, Users } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/empty-state'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import { useMediaResolver } from '@/hooks/use-media-url'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { CHAT_TABS } from '../constants'
import {
  chatPreview,
  chatPreviewSender,
  personLabel,
} from '../lib/talk-monitoring-mappers'
import { formatChatTimestamp } from '../lib/talk-monitoring-dates'
import { MonitoringSearchInput } from './monitoring-search-input'
import { MonitoringSegmentedTabs } from './monitoring-segmented-tabs'
import type { useTalkMonitoring } from '../hooks/use-talk-monitoring'
import type { MonitoringChat } from '../types'

/**
 * The SECOND sidebar — the conversations the selected person is in.
 *
 * Each tab is its own request, because `total` is per-`type` and that number is
 * what the badge counts. A row is shown whatever the person's own standing in
 * the chat: having left it, been removed from it, been blocked in it or deleted
 * it from their app all still return the conversation — what a participant chose
 * to stop seeing is not what oversight is looking at.
 *
 * There is no unread count anywhere, deliberately: the monitor is in none of
 * these threads, so the product has no honest number to give.
 */
export function MonitoringChatsPane({
  monitoring,
}: {
  monitoring: ReturnType<typeof useTalkMonitoring>
}) {
  const {
    chatsQuery,
    chats,
    chatTab,
    setChatTab,
    chatCounts,
    chatSearch,
    setChatSearch,
    selectedChat,
    selectChat,
    selectedPerson,
    clearPerson,
  } = monitoring

  const resolveMedia = useMediaResolver()

  const sentinelRef = useInfiniteScroll<HTMLDivElement>({
    enabled: chatsQuery.hasNextPage && !chatsQuery.isFetchingNextPage,
    onLoadMore: () => void chatsQuery.fetchNextPage(),
  })

  if (!selectedPerson) return null

  return (
    <section className="flex h-full w-full min-w-0 flex-col border-r bg-card xl:w-80">
      <header className="flex items-center gap-3 border-b p-3">
        {/*
          Below `xl` this pane is the whole screen and the directory is not on
          it, so this is the only way back to it. Above `xl` the people pane is
          right there, and a button to reach what's already visible is noise.
        */}
        <Button
          variant="ghost"
          size="icon"
          onClick={clearPerson}
          aria-label="Back to people"
          // The same circular, bordered arrow the workspace bar uses to go back
          // to the panel — going back should look the same wherever it appears.
          className="shrink-0 rounded-full border xl:hidden"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <Avatar
          name={personLabel(selectedPerson)}
          src={resolveMedia(selectedPerson.photo) || undefined}
          className="size-10"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{personLabel(selectedPerson)}</p>
          <p className="truncate text-xs text-muted-foreground">
            {selectedPerson.kind === 'admin' ? 'Admin' : 'Employee'} · Conversations
          </p>
        </div>
      </header>

      <div className="space-y-3 border-b p-3">
        <MonitoringSearchInput
          value={chatSearch}
          onChange={setChatSearch}
          placeholder="Search messages..."
        />
        <MonitoringSegmentedTabs
          options={CHAT_TABS.map(({ value, label }) => ({
            value,
            label,
            count: chatCounts[value],
          }))}
          value={chatTab}
          onChange={setChatTab}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {chatsQuery.isPending ? (
          <ChatRowSkeletons />
        ) : chatsQuery.isError ? (
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load conversations"
            description={getApiErrorMessage(
              chatsQuery.error,
              "Something went wrong while reading this person's chats.",
            )}
          />
        ) : chats.length === 0 ? (
          <EmptyState
            icon={MessageSquareOff}
            title="No conversations"
            description={
              chatSearch.trim()
                ? 'No chat title matches that search.'
                : 'This person has not been part of any conversation yet.'
            }
          />
        ) : (
          <>
            <ul>
              {chats.map((chat) => (
                <ChatRow
                  key={chat.id}
                  chat={chat}
                  avatarUrl={resolveMedia(chat.avatar)}
                  selected={chat.id === selectedChat?.id}
                  onSelect={() => selectChat(chat)}
                />
              ))}
            </ul>
            <div ref={sentinelRef} />
            {chatsQuery.isFetchingNextPage && (
              <p className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Loading more…
              </p>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function ChatRow({
  chat,
  avatarUrl,
  selected,
  onSelect,
}: {
  chat: MonitoringChat
  avatarUrl: string
  selected: boolean
  onSelect: () => void
}) {
  const sender = chatPreviewSender(chat)

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected}
        className={cn(
          'flex w-full items-start gap-3 border-b px-3 py-2.5 text-left transition-colors',
          selected ? 'bg-primary/10' : 'hover:bg-muted/60',
        )}
      >
        <Avatar
          name={chat.title}
          src={avatarUrl || undefined}
          className="size-10"
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {chat.title}
            </span>
            {chat.lastMessageAt && (
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {formatChatTimestamp(chat.lastMessageAt)}
              </span>
            )}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5">
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-xs',
                chat.lastMessageDeleted
                  ? 'italic text-muted-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {sender && <span className="font-medium">{sender}: </span>}
              {chatPreview(chat)}
            </span>
            <ParticipantFlags chat={chat} />
          </span>
        </span>
      </button>
    </li>
  )
}

/**
 * The monitored person's own standing in this chat, as small icons.
 *
 * None of these hides the conversation — they're shown precisely because the
 * history somebody was present for is what oversight is about, and because a
 * thread read without knowing they had left it reads differently.
 */
function ParticipantFlags({ chat }: { chat: MonitoringChat }) {
  const flags = [
    chat.participant?.hasLeft && { icon: LogOut, label: 'They left this group' },
    chat.participant?.hasBeenRemoved && {
      icon: UserMinus,
      label: 'They were removed from this group',
    },
    chat.participant?.isBlocked && {
      icon: Ban,
      label: 'Blocked here — they can read but not post',
    },
    chat.participant?.hasCleared && {
      icon: MessageSquareOff,
      label: 'They deleted this chat from their app — the history still stands',
    },
    chat.type === 'group' && {
      icon: Users,
      label: `${chat.memberCount} participants`,
    },
  ].filter(Boolean) as { icon: typeof Users; label: string }[]

  if (!flags.length) return null

  return (
    <span className="flex shrink-0 items-center gap-1">
      {flags.map(({ icon: Icon, label }) => (
        <Tooltip key={label}>
          <TooltipTrigger asChild>
            <span className="text-muted-foreground">
              <Icon className="size-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </span>
  )
}

function ChatRowSkeletons() {
  return (
    <ul className="p-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <li key={index} className="flex items-center gap-3 py-2.5">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </li>
      ))}
    </ul>
  )
}
