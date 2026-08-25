import type { ChatType, MediaKind, MessageType } from '../schemas'

/**
 * The records the three panes render — the wire shapes in `schemas.ts` after
 * `lib/talk-monitoring-mappers` has camel-cased them.
 *
 * Storage KEYS keep the word `photo` / `url` but are still keys: resolve every
 * one through `useMediaUrl()` before it reaches an `src`.
 */

/* ── 1. The people pane ────────────────────────────────────────────────────── */

/** Which arm of the product a Talk identity belongs to. */
export type PersonKind = 'employee' | 'admin'

/**
 * One person of the account who can be monitored.
 *
 * `kind` is `is_employee` read as the badge the row draws — a workforce
 * credential, or a back-office login (the owner or an admin user).
 */
export interface MonitoringPerson {
  /** The id the conversations call takes. Not an employee or user id. */
  talkUserId: number
  /** Null when the master record behind the identity is gone. */
  name: string | null
  /** Storage key. */
  photo: string | null
  /** Their Talk login — what tells two people of the same name apart. */
  email: string
  /** `inactive` is a SUSPENDED credential: no sign-in, but the history stands. */
  status: string
  kind: PersonKind
  employeeId: number | null
  userId: number | null
  companyId: number | null
  companyName: string | null
  departmentId: number | null
  departmentName: string | null
  designationName: string | null
}

/* ── 2. The conversations pane ─────────────────────────────────────────────── */

/** The monitored person's own standing in one conversation. */
export interface ChatParticipant {
  /** `owner`, `admin` or `member` — their role in this chat. */
  memberRole: string
  joinedAt: string | null
  hasLeft: boolean
  hasBeenRemoved: boolean
  /** Blocked by the creator: they read the conversation but may not post. */
  isBlocked: boolean
  /** They deleted it from THEIR app. The thread is still returned in full. */
  hasCleared: boolean
}

/**
 * One conversation the selected person is in.
 *
 * {@link title} and {@link avatar} are the two the row actually draws: a group
 * gives its own name and picture, a direct chat has neither and is drawn with
 * the counterpart's. Both are resolved once by the mapper so no component has to
 * remember which kind it's holding.
 */
export interface MonitoringChat {
  /** The `chatId` the thread call takes. */
  id: number
  type: ChatType
  /** What the row shows — a group's name, or the other person's on a direct chat. */
  title: string
  /** Storage key: the group's picture, or the counterpart's photo. */
  avatar: string | null
  /** The group title as stored. Null on a direct chat. */
  name: string | null
  description: string | null
  /** The company a GROUP is anchored to. */
  companyId: number | null
  createdByTalkUserId: number | null
  createdByName: string | null
  /** Who the monitored person is talking TO. Null on a group. */
  counterpartTalkUserId: number | null
  counterpartName: string | null
  /** Live members — those who have not left or been removed. */
  memberCount: number
  lastMessageAt: string | null
  /** Already rendered by the API: a system sentence, or the deleted placeholder. */
  lastMessagePreview: string | null
  /** Still the ORIGINAL type on a withdrawn message — check the flag below first. */
  lastMessageType: MessageType | null
  lastMessageDeleted: boolean
  lastMessageSenderTalkUserId: number | null
  lastMessageSenderName: string | null
  /** Their state of this chat, never the monitor's. */
  participant: ChatParticipant | null
  createdAt: string | null
}

/* ── 3. The thread ─────────────────────────────────────────────────────────── */

export interface MessageMedia {
  id: number
  kind: MediaKind
  /** Storage key. */
  fileUrl: string
  fileName: string | null
  mimeType: string | null
  sizeBytes: number | null
  width: number | null
  height: number | null
  durationSeconds: number | null
  /** Storage key. */
  thumbnailUrl: string | null
  /** The sender's own ordering within one message. */
  position: number
}

/** The message a bubble quotes. `body` is null once the quote was withdrawn. */
export interface MessageQuote {
  id: number
  senderTalkUserId: number | null
  senderName: string | null
  type: MessageType
  body: string | null
  isDeleted: boolean
}

/**
 * One message, ready to draw.
 *
 * Three shapes travel in this one type and the renderer branches on them in this
 * order: a {@link isDeleted} tombstone first (its `type` is still the original,
 * so an image that was withdrawn would otherwise draw as an image), then a
 * `system` line, then an ordinary bubble.
 */
export interface MonitoringMessage {
  id: number
  chatId: number
  /** Null on a `system` message, which nobody sent. */
  senderTalkUserId: number | null
  senderName: string | null
  /** Storage key. */
  senderPhoto: string | null
  type: MessageType
  /** The text, or a media caption. Null on a bare attachment and on a tombstone. */
  body: string | null
  quote: MessageQuote | null
  forwardedFromMessageId: number | null
  isForwarded: boolean
  isEdited: boolean
  editedAt: string | null
  /** Withdrawn for everyone — draw the tombstone; the row survives so replies resolve. */
  isDeleted: boolean
  /** The event CODE on a `system` message, for styling the line per event. */
  systemEvent: string | null
  media: MessageMedia[]
  createdAt: string | null
}
