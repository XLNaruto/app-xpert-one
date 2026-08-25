import type {
  MonitoringChatResponse,
  MonitoringMessageResponse,
  MonitoringPersonResponse,
} from '../schemas'
import type {
  MessageMedia,
  MonitoringChat,
  MonitoringMessage,
  MonitoringPerson,
} from '../types'

/**
 * Wire → UI record. Pure functions only: no React, no hooks, no store reads —
 * which is why storage keys are passed through untouched here and resolved with
 * `useMediaUrl()` at the component that renders them.
 */

/** What a row shows when the master record behind an identity is gone. */
export const UNKNOWN_PERSON = 'Unknown user'

/** A person's display name, with the placeholder when there isn't one. */
export function personLabel(person: {
  name: string | null
  email?: string
}): string {
  return person.name?.trim() || person.email?.trim() || UNKNOWN_PERSON
}

/**
 * The line under a person's name: where they sit in the organisation.
 *
 * A back-office identity has no posting at all, so this is empty for them and
 * the row falls back to their login instead — which is the more useful subtitle
 * there anyway.
 */
export function personSubtitle(person: MonitoringPerson): string {
  return [person.designationName, person.departmentName, person.companyName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' · ')
}

export function toMonitoringPerson(res: MonitoringPersonResponse): MonitoringPerson {
  return {
    talkUserId: res.talk_user_id,
    name: res.name?.trim() || null,
    photo: res.photo || null,
    email: res.email ?? '',
    status: res.status ?? 'active',
    // `is_employee` is the only thing telling the two arms apart: a workforce
    // credential, or a back-office login (the owner or an admin user).
    kind: res.is_employee ? 'employee' : 'admin',
    employeeId: res.employee_id ?? null,
    userId: res.user_id ?? null,
    companyId: res.company_id ?? null,
    companyName: res.company_name?.trim() || null,
    departmentId: res.department_id ?? null,
    departmentName: res.department_name?.trim() || null,
    designationName: res.designation_name?.trim() || null,
  }
}

export function toMonitoringChat(res: MonitoringChatResponse): MonitoringChat {
  const name = res.name?.trim() || null
  const counterpartName = res.counterpart_name?.trim() || null

  return {
    id: res.id,
    type: res.type,
    // A direct chat has no name of its own and is drawn with the other person's.
    // Resolved once here so no component has to remember which kind it holds.
    title: (res.type === 'group' ? name : counterpartName) || UNKNOWN_PERSON,
    avatar: (res.type === 'group' ? res.avatar_url : res.counterpart_photo) || null,
    name,
    description: res.description?.trim() || null,
    companyId: res.company_id ?? null,
    createdByTalkUserId: res.created_by_talk_user_id ?? null,
    createdByName: res.created_by_name?.trim() || null,
    counterpartTalkUserId: res.counterpart_talk_user_id ?? null,
    counterpartName,
    memberCount: res.member_count ?? 0,
    lastMessageAt: res.last_message_at || null,
    lastMessagePreview: res.last_message_preview?.trim() || null,
    lastMessageType: res.last_message_type ?? null,
    lastMessageDeleted: res.last_message_deleted_for_everyone ?? false,
    lastMessageSenderTalkUserId: res.last_message_sender_talk_user_id ?? null,
    lastMessageSenderName: res.last_message_sender_name?.trim() || null,
    participant: res.participant
      ? {
          memberRole: res.participant.member_role ?? 'member',
          joinedAt: res.participant.joined_at || null,
          hasLeft: res.participant.has_left ?? false,
          hasBeenRemoved: res.participant.has_been_removed ?? false,
          isBlocked: res.participant.is_blocked ?? false,
          hasCleared: res.participant.has_cleared ?? false,
        }
      : null,
    createdAt: res.created_at || null,
  }
}

export function toMonitoringMessage(
  res: MonitoringMessageResponse,
): MonitoringMessage {
  return {
    id: res.id,
    chatId: res.chat_id,
    senderTalkUserId: res.sender_talk_user_id ?? null,
    senderName: res.sender_name?.trim() || null,
    senderPhoto: res.sender_photo || null,
    type: res.type,
    body: res.body ?? null,
    quote: res.reply_to
      ? {
          id: res.reply_to.id,
          senderTalkUserId: res.reply_to.sender_talk_user_id ?? null,
          senderName: res.reply_to.sender_name?.trim() || null,
          type: res.reply_to.type,
          body: res.reply_to.body ?? null,
          isDeleted: res.reply_to.is_deleted ?? false,
        }
      : null,
    forwardedFromMessageId: res.forwarded_from_message_id ?? null,
    isForwarded: res.is_forwarded ?? false,
    isEdited: res.is_edited ?? false,
    editedAt: res.edited_at || null,
    isDeleted: res.is_deleted_for_everyone ?? false,
    systemEvent: res.system_event || null,
    // The sender chose this order; the API doesn't promise to have kept it.
    media: [...(res.media ?? [])]
      .sort((a, b) => a.position - b.position)
      .map(toMessageMedia),
    createdAt: res.created_at || null,
  }
}

function toMessageMedia(res: MonitoringMessageResponse['media'][number]): MessageMedia {
  return {
    id: res.id,
    kind: res.kind,
    fileUrl: res.file_url ?? '',
    fileName: res.file_name?.trim() || null,
    mimeType: res.mime_type || null,
    sizeBytes: res.size_bytes ?? null,
    width: res.width ?? null,
    height: res.height ?? null,
    durationSeconds: res.duration_seconds ?? null,
    thumbnailUrl: res.thumbnail_url || null,
    position: res.position ?? 0,
  }
}

/* ── Derivations the panes read ────────────────────────────────────────────── */

/** `1.4 MB` — an attachment's size, or empty when the API didn't give one. */
export function formatFileSize(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** power
  return `${value >= 10 || power === 0 ? Math.round(value) : value.toFixed(1)} ${units[power]}`
}

/** `4:07` — a clip's runtime. */
export function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return ''
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

/**
 * The preview line under a conversation's title.
 *
 * `last_message_preview` arrives ready to render — a system event already read
 * as its sentence, a withdrawn message already reading "This message was
 * deleted" — so the only work left is the bare attachment, which has no preview
 * at all and is named by its type instead.
 */
export function chatPreview(chat: MonitoringChat): string {
  if (chat.lastMessagePreview) return chat.lastMessagePreview
  if (!chat.lastMessageType) return 'No messages yet'
  return MEDIA_PREVIEW[chat.lastMessageType] ?? 'Message'
}

const MEDIA_PREVIEW: Record<string, string> = {
  image: '📷 Photo',
  video: '🎬 Video',
  audio: '🎧 Audio',
  document: '📄 Document',
  text: 'Message',
  system: 'Update',
}

/**
 * Who sent the previewed message, as the prefix the row draws before it
 * (`Rinkal: …`). A system line has no sender, and a group's own event shouldn't
 * be attributed to one.
 */
export function chatPreviewSender(chat: MonitoringChat): string {
  if (chat.lastMessageType === 'system') return ''
  const name = chat.lastMessageSenderName
  if (!name) return ''
  // Only the first word — the row is narrow and the surname adds nothing here.
  return name.split(/\s+/)[0] ?? ''
}
