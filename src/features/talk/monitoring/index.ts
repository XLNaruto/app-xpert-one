/**
 * Talk monitoring — the module's public surface.
 *
 * One screen: the owner's read-only window onto the account's conversations.
 * There is no create page and no form, because the resource has no writes —
 * monitoring reads, and that's the whole of it.
 *
 * Cross-feature imports come through here, never through a deep path.
 */
export { TalkMonitoringPage } from './pages/talk-monitoring-page'

export { useMonitoringPeople } from './api/use-monitoring-people'
export { useMonitoringChats, useMonitoringChatCounts } from './api/use-monitoring-chats'
export { useMonitoringMessages } from './api/use-monitoring-messages'

export { personLabel, personSubtitle } from './lib/talk-monitoring-mappers'
export { CHAT_TABS, PEOPLE_SEGMENTS, type ChatTab, type PeopleSegment } from './constants'

export type {
  MonitoringPerson,
  MonitoringChat,
  MonitoringMessage,
  MessageMedia,
  MessageQuote,
  ChatParticipant,
  PersonKind,
} from './types'
export type { ChatType, MediaKind, MessageType } from './schemas'
