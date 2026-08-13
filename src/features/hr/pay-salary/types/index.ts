/**
 * UI-facing shapes for Pay Salary. Every figure here is one the salary row
 * already stored — nothing on this screen computes pay.
 */

/** The period a read answered for. */
export interface PayPeriod {
  month: number
  year: number
}

/** One employee on either tab. */
export interface PaySalaryRow {
  /** What the batch settles. The employee id rides along and is checked against it. */
  salaryId: number
  employeeId: number
  employeeName: string
  employeeCode: string
  mobile: string
  grossPay: number
  netPay: number
  isPaid: boolean
  /** The day the money left, on the paid tab. `null` while outstanding. */
  paymentDate: string | null
  /** Which batch settled it — `null` until one did. */
  batchId: number | null
}

/** The tab's counters, over the whole filter rather than the page. */
export interface PaySalaryTotals {
  totalEmployees: number
  totalNetPay: number
}

export interface PaySalaryList {
  period: PayPeriod
  status: 'unpaid' | 'paid'
  totals: PaySalaryTotals
  items: PaySalaryRow[]
  /** Rows matching the filter across all pages — drives the pager. */
  total: number
}

/** One recorded payment batch. */
export interface PaymentBatch {
  id: number
  companyId: number
  departmentId: number | null
  designationId: number | null
  month: number
  year: number
  paymentDate: string
  paymentMode: string
  totalEmployees: number
  totalAmount: number
}

/** The same batch as the history screen shows it. */
export interface PaymentBatchCard extends PaymentBatch {
  documentCount: number
  /** Who recorded it — `null` when the actor is no longer resolvable. */
  recordedBy: string | null
  recordedAt: string
  /**
   * "Batch #1" — a POSITION in the newest-first list, continued across pages.
   * Never an identifier: address a batch by `id`.
   */
  batchNumber: number
}

/** A proof document. `key` is the storage object, not a url. */
export interface PaymentDocument {
  id: number
  key: string
  fileName: string
}

/** One employee inside an expanded batch. */
export interface PaymentBatchEmployee {
  salaryId: number
  employeeId: number
  employeeName: string
  employeeCode: string
  grossPay: number
  netPay: number
}

export interface PaymentBatchDetail {
  batch: Omit<PaymentBatchCard, 'batchNumber'>
  documents: PaymentDocument[]
  employees: { items: PaymentBatchEmployee[]; total: number }
}

/**
 * What Confirm & Pay came back with. `skipped` is why this is worth mapping at
 * all: a partly-refused batch is still a 201, so the screen has to say which
 * rows didn't settle and why.
 */
export interface PayBatchResult {
  batch: PaymentBatch
  documents: PaymentDocument[]
  paid: {
    salaryId: number
    employeeId: number
    employeeName: string
    employeeCode: string
    netPay: number
  }[]
  skipped: { salaryId: number; reason: string }[]
}

/** The history screen's three counters, over the whole filter. */
export interface PaymentHistoryTotals {
  paymentBatches: number
  employeesPaid: number
  totalAmountPaid: number
}

export interface PaymentHistory {
  period: PayPeriod
  totals: PaymentHistoryTotals
  items: PaymentBatchCard[]
  total: number
}
