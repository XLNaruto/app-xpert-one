import { z } from 'zod'

/**
 * The API's own limits, so the form refuses what the endpoint would anyway —
 * with a message on the field rather than a 400 after a round trip.
 */
export const MAX_EMPLOYEE_TICKET_MESSAGE = 10_000
export const MAX_EMPLOYEE_TICKET_RESOLUTION = 10_000

/** What the employee filed the query under. */
export const employeeTicketCategorySchema = z.enum([
  'salary',
  'attendance',
  'leave',
  'document',
  'it',
  'other',
])

/**
 * How badly it hurts, in the EMPLOYEE's judgement. Ranks this queue and nothing
 * else — unlike the platform desk, no deadline hangs off it, which is why the
 * office cannot re-grade it from here.
 */
export const employeeTicketPrioritySchema = z.enum([
  'normal',
  'medium',
  'high',
  'critical',
])

export const employeeTicketStatusSchema = z.enum([
  'open',
  'in_progress',
  'resolved',
  'closed',
  'reopened',
])

/** Which side of the thread wrote a message. */
export const messageAuthorTypeSchema = z.enum(['employee', 'user'])

export type EmployeeTicketCategoryValue = z.infer<typeof employeeTicketCategorySchema>
export type EmployeeTicketPriorityValue = z.infer<typeof employeeTicketPrioritySchema>
export type EmployeeTicketStatusValue = z.infer<typeof employeeTicketStatusSchema>
export type MessageAuthorTypeValue = z.infer<typeof messageAuthorTypeSchema>

/** The content types the support-attachment presign will sign for. */
export const SUPPORT_ATTACHMENT_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const

/* ── Forms ─────────────────────────────────────────────────────────────────── */

/** The office's reply. The attachment is picked as a File and uploaded on send. */
export const employeeTicketReplySchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Write a reply')
    .max(
      MAX_EMPLOYEE_TICKET_MESSAGE,
      `Cannot exceed ${MAX_EMPLOYEE_TICKET_MESSAGE} characters`,
    ),
})
export type EmployeeTicketReplyFormValues = z.infer<typeof employeeTicketReplySchema>

/**
 * The resolution note. Required by the API for the `resolved` transition alone —
 * a resolution nobody can attribute is one nobody can be asked about, and the
 * employee is PUSHED this text on their device.
 */
export const employeeTicketResolveSchema = z.object({
  resolutionNote: z
    .string()
    .trim()
    .min(1, 'Say what was done')
    .max(
      MAX_EMPLOYEE_TICKET_RESOLUTION,
      `Cannot exceed ${MAX_EMPLOYEE_TICKET_RESOLUTION} characters`,
    ),
})
export type EmployeeTicketResolveFormValues = z.infer<typeof employeeTicketResolveSchema>

/* ── Responses ─────────────────────────────────────────────────────────────── */

/** One message in the shared thread. */
export const employeeTicketMessageResponseSchema = z.object({
  id: z.number(),
  /** `employee` — the raiser; `user` — somebody from the back office. */
  author_type: messageAuthorTypeSchema,
  author_name: z.string().nullish(),
  body: z.string(),
  /** A storage KEY, not a URL — prefix with `media_path` from `GET /config`. */
  attachment_url: z.string().nullish(),
  created_at: z.string(),
})
export type EmployeeTicketMessageResponse = z.infer<
  typeof employeeTicketMessageResponseSchema
>

/**
 * One ticket. The list rows and the detail read share this shape; only the
 * detail carries `messages`, because the API answers the ticket and its whole
 * thread in a single call.
 */
export const employeeTicketResponseSchema = z.object({
  id: z.number(),
  /** Sequential within the company, e.g. `HLP-000001`. */
  code: z.string(),
  subject: z.string(),
  description: z.string(),
  category: employeeTicketCategorySchema,
  priority: employeeTicketPrioritySchema,
  status: employeeTicketStatusSchema,
  /** The file the employee raised it with, as a storage key. */
  attachment_url: z.string().nullish(),
  employee_id: z.number(),
  employee_name: z.string().nullish(),
  employee_code: z.string().nullish(),
  company_id: z.number(),
  company_name: z.string().nullish(),
  /** When the back office first replied — what makes response time reportable. */
  first_response_at: z.string().nullish(),
  resolved_at: z.string().nullish(),
  resolved_by_user_id: z.number().nullish(),
  resolved_by_name: z.string().nullish(),
  resolution_note: z.string().nullish(),
  closed_at: z.string().nullish(),
  message_count: z.number().default(0),
  /** Whole days since it was raised — the queue's "how long has this waited". */
  age_days: z.number().default(0),
  created_at: z.string(),
  updated_at: z.string(),
  /** Detail read only — the whole conversation, oldest first. */
  messages: z.array(employeeTicketMessageResponseSchema).nullish(),
})
export type EmployeeTicketResponse = z.infer<typeof employeeTicketResponseSchema>

export const employeeTicketsResponseSchema = z.object({
  items: z.array(employeeTicketResponseSchema),
  total: z.number(),
})

/** `GET /user/employee-support-tickets/summary` — the tab strip's counts. */
export const employeeTicketSummaryResponseSchema = z.object({
  open: z.number(),
  in_progress: z.number(),
  resolved: z.number(),
  closed: z.number(),
  reopened: z.number(),
})
export type EmployeeTicketSummaryResponse = z.infer<
  typeof employeeTicketSummaryResponseSchema
>

/* ── Request bodies ────────────────────────────────────────────────────────── */

/** POST a reply. `attachment_url` is the KEY from the presign, never the file. */
export interface EmployeeTicketMessagePayload {
  body: string
  attachment_url?: string
}

/**
 * The status route's body is a UNION, not a bag of optional fields: each
 * transition demands exactly what it records, and `resolution_note` belongs to
 * `resolved` alone.
 */
export type EmployeeTicketStatusPayload =
  | { status: 'in_progress' }
  | { status: 'resolved'; resolution_note: string }
  | { status: 'closed' }
