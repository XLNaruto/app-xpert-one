import { z } from 'zod'
import type { DropzoneFile } from '@/components/common/file-dropzone'
import {
  MAX_PAYMENT_DOCUMENTS,
  PAYMENT_MODES,
  type PaySalaryStatus,
} from './constants'

/**
 * `GET|POST /user/salary/payments` and the batch history — what the wire
 * carries, and the one form on the screen.
 */

/** What picks one page of the list out. The company comes from the session. */
export interface PaySalaryFilters {
  companyId: number
  month: number
  year: number
  /** `null` is every department, which the API gets as no filter at all. */
  departmentId: number | null
  status: PaySalaryStatus
}

/** The same period and scope, for the history screen — which has no tabs. */
export type PaymentHistoryFilters = Omit<PaySalaryFilters, 'status'>

/* ── Responses ─────────────────────────────────────────────────────────────── */

const periodSchema = z.object({ month: z.number(), year: z.number() })

const paymentRowSchema = z.object({
  salary_id: z.number(),
  employee_id: z.number(),
  name: z.string().nullable(),
  employee_code: z.string().nullable(),
  primary_mobile: z.string().nullable(),
  gross_pay: z.number().nullable(),
  net_pay: z.number().nullable(),
  is_paid: z.boolean(),
  payment_date: z.string().nullable(),
  salary_batch_id: z.number().nullable(),
})

/**
 * One page of the tab. `totals` covers the WHOLE filter while `items`/`total`
 * cover the page, so the tiles hold still as the pager moves.
 */
export const salaryPaymentsResponseSchema = z.object({
  period: periodSchema,
  status: z.enum(['unpaid', 'paid']),
  totals: z.object({
    total_employees: z.number(),
    total_net_pay: z.number(),
  }),
  items: z.array(paymentRowSchema),
  total: z.number(),
})

/** The batch as both the create response and the history card carry it. */
const batchSchema = z.object({
  id: z.number(),
  company_id: z.number(),
  department_id: z.number().nullable(),
  designation_id: z.number().nullable(),
  month: z.number(),
  year: z.number(),
  payment_date: z.string(),
  payment_mode: z.string(),
  total_employees: z.number(),
  total_amount: z.number(),
})

/** The history card adds who recorded it, when, and how much proof it carries. */
const batchCardSchema = batchSchema.extend({
  document_count: z.number(),
  audit_person_name: z.string().nullable(),
  recorded_at: z.string(),
})

/** `document` is the storage KEY, not a url — resolve it against the media base. */
const batchDocumentSchema = z.object({
  id: z.number(),
  document: z.string(),
  file_name: z.string().nullable(),
})

/**
 * What Confirm & Pay answers. `skipped` is the half that matters: a row failing
 * one of the endpoint's checks is refused *individually* and the rest of the
 * batch still lands, so a 201 is not the same as "everything selected was paid".
 */
export const payBatchResponseSchema = z.object({
  batch: batchSchema,
  documents: z.array(batchDocumentSchema),
  paid: z.array(
    z.object({
      salary_id: z.number(),
      employee_id: z.number(),
      name: z.string().nullable(),
      employee_code: z.string().nullable(),
      net_pay: z.number().nullable(),
    }),
  ),
  skipped: z.array(z.object({ salary_id: z.number(), reason: z.string() })),
})

/** The period's batches, newest first, with the counters over the whole filter. */
export const paymentHistoryResponseSchema = z.object({
  period: periodSchema,
  totals: z.object({
    payment_batches: z.number(),
    employees_paid: z.number(),
    total_amount_paid: z.number(),
  }),
  items: z.array(
    z.object({
      /** A POSITION in this newest-first list, continued across pages — not an id. */
      batch_number: z.number(),
      batch: batchCardSchema,
    }),
  ),
  total: z.number(),
})

/** One batch expanded — the employees it settled are paged inside it. */
export const paymentBatchResponseSchema = z.object({
  batch: batchCardSchema,
  documents: z.array(batchDocumentSchema),
  employees: z.object({
    items: z.array(
      z.object({
        salary_id: z.number(),
        employee_id: z.number(),
        name: z.string().nullable(),
        employee_code: z.string().nullable(),
        gross_pay: z.number().nullable(),
        net_pay: z.number().nullable(),
      }),
    ),
    total: z.number(),
  }),
})

export type SalaryPaymentsResponse = z.infer<typeof salaryPaymentsResponseSchema>
export type PayBatchResponse = z.infer<typeof payBatchResponseSchema>
export type PaymentHistoryResponse = z.infer<typeof paymentHistoryResponseSchema>
export type PaymentBatchResponse = z.infer<typeof paymentBatchResponseSchema>

/* ── The Confirm & Pay form ────────────────────────────────────────────────── */

/**
 * What the dialog holds. The selection isn't in here: it belongs to the list,
 * and the form only describes *how* the money left.
 *
 * `documents` are the files as picked — the keys don't exist until the dialog is
 * submitted, because a cancelled dialog must not leave objects it referenced.
 */
export const payBatchFormSchema = z.object({
  paymentDate: z
    .string()
    .min(1, 'Pick the date the money left')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a valid date'),
  paymentMode: z.enum(PAYMENT_MODES),
  documents: z
    .array(z.custom<DropzoneFile>())
    .max(MAX_PAYMENT_DOCUMENTS, `At most ${MAX_PAYMENT_DOCUMENTS} documents`),
})

export type PayBatchFormValues = z.infer<typeof payBatchFormSchema>

/** What the api layer sends, once the files are up and the selection is known. */
export interface PayBatchPayload {
  companyId: number
  departmentId: number | null
  month: number
  year: number
  paymentDate: string
  paymentMode: PayBatchFormValues['paymentMode']
  /** Freshly-picked files — uploaded by the api layer, one presign each. */
  documents: File[]
  /** The rows to settle, each pairing a salary with the employee shown beside it. */
  payments: { salaryId: number; employeeId: number }[]
}

/** What the bank's bulk-transfer sheet needs beyond the period on screen. */
export interface BankTransferSheetParams {
  companyId: number
  month: number
  year: number
  departmentId: number | null
  paymentMode: string
  debitAccountNumber: string
}
