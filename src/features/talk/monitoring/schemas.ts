import { z } from 'zod'

/**
 * The `talk-monitoring` responses, exactly as the endpoint answers them.
 *
 * The screen is READ-ONLY — there is no form here and so no form schema. These
 * three are wire schemas alone: they parse what comes back, and the mappers turn
 * each into the camel-cased record the panes render.
 *
 * Every `*_photo`, `avatar_url` and `file_url` below is a storage KEY, not a
 * URL. Resolve with `mediaUrl()` / `useMediaUrl()`, which prefix it with
 * `media_path` from `GET /config`.
 */

/* ── Shared vocabulary ─────────────────────────────────────────────────────── */

/**
 * A message's type — also the `last_message_type` a conversation row previews.
 *
 * Kept as a plain string with a `catch`, not a bare `z.enum`: the six the API
 * documents are the six we draw, but a seventh landing on the wire must not
 * blank a whole thread. Anything unknown reads as `text`, which renders the
 * body it came with.
 */
export const messageTypeSchema = z
  .enum(['text', 'image', 'video', 'audio', 'document', 'system'])
  .catch('text')
export type MessageType = z.infer<typeof messageTypeSchema>

/** A conversation is between two people or among many. */
export const chatTypeSchema = z.enum(['direct', 'group']).catch('direct')
export type ChatType = z.infer<typeof chatTypeSchema>

/** An attachment's kind. `document` is the catch-all the UI draws as a file card. */
export const mediaKindSchema = z
  .enum(['image', 'video', 'audio', 'document'])
  .catch('document')
export type MediaKind = z.infer<typeof mediaKindSchema>

/* ── 1. The people pane ────────────────────────────────────────────────────── */

/**
 * One person of the account who holds a Talk identity.
 *
 * Both arms of the product are in this one list, told apart by `is_employee`: a
 * workforce credential issued on the Credential screen, and a back-office login
 * — the owner or an admin user — whose identity comes from the Talk switch on
 * Administration → Users. A back-office person has no `department_id`, having no
 * posting.
 *
 * `status: 'inactive'` is a SUSPENDED credential. It still lists: they cannot
 * sign in, but what they already said remains the account's record.
 */
export const monitoringPersonResponseSchema = z.object({
  /** A `talk_users.id` — the id the other two calls take, not an employee id. */
  talk_user_id: z.number(),
  /** Null when the master record behind the identity is gone. */
  name: z.string().nullish(),
  photo: z.string().nullish(),
  /** Their Talk login — what tells two people of the same name apart. */
  email: z.string().default(''),
  status: z.string().default('active'),
  is_employee: z.boolean().default(true),
  employee_id: z.number().nullish(),
  user_id: z.number().nullish(),
  company_id: z.number().nullish(),
  company_name: z.string().nullish(),
  department_id: z.number().nullish(),
  department_name: z.string().nullish(),
  designation_name: z.string().nullish(),
})
export type MonitoringPersonResponse = z.infer<typeof monitoringPersonResponseSchema>

export const monitoringPeopleResponseSchema = z.object({
  items: z.array(monitoringPersonResponseSchema),
  total: z.number(),
})

/* ── 2. The conversations pane ─────────────────────────────────────────────── */

/**
 * The monitored person's own standing in a conversation — never the monitor's.
 *
 * All five states still return the conversation. What a participant chose to
 * stop seeing is not what oversight is looking at, and a thread somebody was
 * present for is exactly the thread that matters.
 */
export const chatParticipantResponseSchema = z.object({
  /** `owner`, `admin` or `member` — their role in THIS chat. */
  member_role: z.string().default('member'),
  joined_at: z.string().nullish(),
  /** They left the group themselves. */
  has_left: z.boolean().default(false),
  /** The group creator removed them. */
  has_been_removed: z.boolean().default(false),
  /** Blocked by the creator: they may read the conversation but not post to it. */
  is_blocked: z.boolean().default(false),
  /** They deleted the chat from THEIR app. The thread is still returned in full. */
  has_cleared: z.boolean().default(false),
})

/**
 * One conversation the selected person is in.
 *
 * A DIRECT chat has no name of its own and is drawn with the other person's —
 * that is what the `counterpart_*` fields are for. A GROUP carries `name`,
 * `avatar_url` and a live `member_count` (those who have not left or been
 * removed) instead, and `counterpart_*` is null.
 *
 * There is no unread count anywhere, and shouldn't be: the monitor is in none of
 * these threads, so the product has no honest number to give.
 */
export const monitoringChatResponseSchema = z.object({
  /** The `chat_id` the thread call takes. */
  id: z.number(),
  type: chatTypeSchema,
  /** The group title. Null on a direct chat. */
  name: z.string().nullish(),
  description: z.string().nullish(),
  /** The GROUP's picture — a storage key. */
  avatar_url: z.string().nullish(),
  /** The company a GROUP is anchored to. */
  company_id: z.number().nullish(),
  created_by_talk_user_id: z.number().nullish(),
  created_by_name: z.string().nullish(),
  created_by_photo: z.string().nullish(),
  /** Who the monitored person is talking TO on a direct chat. Null on a group. */
  counterpart_talk_user_id: z.number().nullish(),
  counterpart_name: z.string().nullish(),
  counterpart_photo: z.string().nullish(),
  member_count: z.number().default(0),
  last_message_at: z.string().nullish(),
  /**
   * The READY-TO-RENDER preview line — a system event already rendered to its
   * sentence, a withdrawn message already reading "This message was deleted".
   * Null only on a bare attachment, or a chat nobody has written in.
   */
  last_message_preview: z.string().nullish(),
  last_message_type: messageTypeSchema.nullish(),
  /**
   * The previewed message was withdrawn. Check this BEFORE `last_message_type`,
   * which is still the ORIGINAL type (`image` on a deleted photo).
   */
  last_message_deleted_for_everyone: z.boolean().default(false),
  last_message_system_event: z.string().nullish(),
  last_message_system_data: z.unknown().nullish(),
  last_message_sender_talk_user_id: z.number().nullish(),
  last_message_sender_name: z.string().nullish(),
  last_message_sender_photo: z.string().nullish(),
  participant: chatParticipantResponseSchema.nullish(),
  created_at: z.string().nullish(),
})
export type MonitoringChatResponse = z.infer<typeof monitoringChatResponseSchema>

export const monitoringChatsResponseSchema = z.object({
  items: z.array(monitoringChatResponseSchema),
  total: z.number(),
})

/* ── 3. The thread ─────────────────────────────────────────────────────────── */

/** One attachment. `position` is the sender's own ordering within a message. */
export const messageMediaResponseSchema = z.object({
  id: z.number(),
  kind: mediaKindSchema,
  /** Storage key — not a URL. */
  file_url: z.string().default(''),
  file_name: z.string().nullish(),
  mime_type: z.string().nullish(),
  size_bytes: z.number().nullish(),
  width: z.number().nullish(),
  height: z.number().nullish(),
  duration_seconds: z.number().nullish(),
  thumbnail_url: z.string().nullish(),
  position: z.number().default(0),
})

/**
 * The message a bubble is quoting.
 *
 * `body` is null once the quoted message was deleted for everyone — the row
 * survives so the reply still resolves, but its text was cleared and monitoring
 * has none to show either.
 */
export const replyToResponseSchema = z.object({
  id: z.number(),
  sender_talk_user_id: z.number().nullish(),
  sender_name: z.string().nullish(),
  sender_photo: z.string().nullish(),
  type: messageTypeSchema,
  body: z.string().nullish(),
  is_deleted: z.boolean().default(false),
})

/**
 * One message of a monitored conversation.
 *
 * Two rows are drawn rather than read: a `system` message has no sender and its
 * `body` is the sentence the API already rendered (`system_data` holds the
 * operands, with the names and photos the participants had AT THE TIME), and a
 * message deleted for everyone comes back as a TOMBSTONE — `body` null,
 * `is_deleted_for_everyone` true, its original `type` intact.
 */
export const monitoringMessageResponseSchema = z.object({
  id: z.number(),
  chat_id: z.number(),
  /** Null on a `system` message, which nobody sent. */
  sender_talk_user_id: z.number().nullish(),
  sender_name: z.string().nullish(),
  sender_photo: z.string().nullish(),
  type: messageTypeSchema,
  /** The text, or a media message's caption. Null on a bare attachment. */
  body: z.string().nullish(),
  reply_to_message_id: z.number().nullish(),
  reply_to: replyToResponseSchema.nullish(),
  /**
   * The ORIGINAL this was forwarded from — usually in a chat these participants
   * cannot see, which a monitor can only reach through its own participant.
   */
  forwarded_from_message_id: z.number().nullish(),
  /** True on a forward even when the original is gone. */
  is_forwarded: z.boolean().default(false),
  is_edited: z.boolean().default(false),
  /** The product records THAT it was edited, not a diff. */
  edited_at: z.string().nullish(),
  is_deleted_for_everyone: z.boolean().default(false),
  /** The event CODE (`member_added`, `group_renamed`, …) on a `system` message. */
  system_event: z.string().nullish(),
  system_data: z.unknown().nullish(),
  media: z.array(messageMediaResponseSchema).default([]),
  created_at: z.string().nullish(),
})
export type MonitoringMessageResponse = z.infer<typeof monitoringMessageResponseSchema>

export const monitoringMessagesResponseSchema = z.object({
  items: z.array(monitoringMessageResponseSchema),
  total: z.number(),
})
