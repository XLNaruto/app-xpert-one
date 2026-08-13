import { z } from 'zod'

/**
 * The API's own limits, so the form refuses what the endpoint would anyway —
 * with a message on the field rather than a 400 after a round trip.
 */
export const MIN_SUPPORT_SUBJECT = 3
export const MAX_SUPPORT_SUBJECT = 255
export const MAX_SUPPORT_DESCRIPTION = 10_000
export const MAX_SUPPORT_REOPEN_REASON = 5_000

/** Which help desk answers — half of what selects the promised resolution time. */
export const supportTicketTypeSchema = z.enum(['technical', 'billing'])

/**
 * How badly it hurts. The OTHER half of the SLA lookup: a higher severity buys a
 * shorter deadline and is kept forever as `raised_priority` for the desk to rule
 * on afterwards.
 */
export const supportPrioritySchema = z.enum(['normal', 'medium', 'high', 'critical'])

export const supportStatusSchema = z.enum([
  'open',
  'in_progress',
  'resolved',
  'closed',
  'reopened',
])

/** The unit the subscription's promise was made in. */
export const supportSlaUnitSchema = z.enum(['hours', 'days'])

/**
 * The Raise / Edit Ticket form.
 *
 * All four fields are declared here, but only two of them ever travel on an
 * edit: `ticket_type` and `priority` selected the SLA cell that became this
 * ticket's deadline, so the API refuses to change either at any point. The edit
 * screen shows them read-only rather than dropping them — what desk was asked,
 * and at what severity, is the context the wording is being corrected under.
 */
export const supportTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(MIN_SUPPORT_SUBJECT, `Subject must be at least ${MIN_SUPPORT_SUBJECT} characters`)
    .max(MAX_SUPPORT_SUBJECT, `Cannot exceed ${MAX_SUPPORT_SUBJECT} characters`),
  description: z
    .string()
    .trim()
    .min(1, 'Please describe the problem')
    .max(MAX_SUPPORT_DESCRIPTION, `Cannot exceed ${MAX_SUPPORT_DESCRIPTION} characters`),
  ticketType: supportTicketTypeSchema,
  priority: supportPrioritySchema,
})

export type SupportTicketFormValues = z.infer<typeof supportTicketSchema>
export type SupportTicketTypeValue = z.infer<typeof supportTicketTypeSchema>
export type SupportPriorityValue = z.infer<typeof supportPrioritySchema>
export type SupportStatusValue = z.infer<typeof supportStatusSchema>
export type SupportSlaUnitValue = z.infer<typeof supportSlaUnitSchema>

/**
 * The reopen reason. Required, because the resolution is CLEARED when a ticket
 * comes back — leaving the old note in place would tell the next admin it had
 * already been handled.
 */
export const supportReopenSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Say what is still wrong')
    .max(MAX_SUPPORT_REOPEN_REASON, `Cannot exceed ${MAX_SUPPORT_REOPEN_REASON} characters`),
})

export type SupportReopenFormValues = z.infer<typeof supportReopenSchema>

/* ── Responses ─────────────────────────────────────────────────────────────── */

/**
 * One ticket, as every endpoint on this resource answers it — the list rows and
 * the detail read carry the very same shape, deadline already derived.
 */
export const supportTicketResponseSchema = z.object({
  id: z.number(),
  /** Sequential within the organization, e.g. `TKT-000001`. */
  code: z.string(),
  subject: z.string(),
  description: z.string(),
  ticket_type: supportTicketTypeSchema,
  status: supportStatusSchema,
  /** The severity in force — the desk may re-grade it, which never moves the deadline. */
  priority: supportPrioritySchema,
  /** The severity it was RAISED with. Never overwritten: it bought the deadline. */
  raised_priority: supportPrioritySchema,
  /** The plan whose promise priced this deadline. */
  plan_name: z.string().nullish(),
  /** Null when the subscription promises nothing for this desk + severity. */
  sla_value: z.number().nullish(),
  /** Null exactly when `sla_value` is. */
  sla_unit: supportSlaUnitSchema.nullish(),
  due_at: z.string().nullish(),
  /** Past `due_at` and still unfinished. Always false without a promise. */
  is_overdue: z.boolean().default(false),
  /** Negative once breached; null without a promise. */
  days_remaining: z.number().nullish(),
  raised_by_user_id: z.number(),
  raised_by_name: z.string().nullish(),
  /** When the desk first picked it up — also what closes the edit window. */
  first_response_at: z.string().nullish(),
  resolved_at: z.string().nullish(),
  resolution_note: z.string().nullish(),
  closed_at: z.string().nullish(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type SupportTicketResponse = z.infer<typeof supportTicketResponseSchema>

export const supportTicketsResponseSchema = z.object({
  items: z.array(supportTicketResponseSchema),
  total: z.number(),
})

/* ── Request bodies ────────────────────────────────────────────────────────── */

/**
 * Hand-written rather than zod: the endpoint rejects unknown keys, so this type
 * is exactly what may be sent.
 */
export interface SupportTicketPayload {
  subject: string
  description: string
  ticket_type: SupportTicketTypeValue
  priority: SupportPriorityValue
}

/**
 * The PATCH body — the WORDING only. `ticket_type` and `priority` are absent by
 * design: they priced a promise already made, and the API refuses both.
 */
export interface SupportTicketUpdatePayload {
  subject?: string
  description?: string
}

/** The reopen body — the reason is appended to the description. */
export interface SupportReopenPayload {
  reason: string
}
