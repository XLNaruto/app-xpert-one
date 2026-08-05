/**
 * A bank from the shared master. Read-only — the list is maintained by the super
 * admin, so there is no create/edit screen behind it and no audit trail on the
 * row: this exists purely to label and pick `bank_id` on an employee's KYC.
 */
export interface BankRecord {
  id: number
  bankName: string
}
