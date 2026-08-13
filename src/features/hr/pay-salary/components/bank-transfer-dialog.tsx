import { useEffect, useState } from 'react'
import { FileSpreadsheet, Landmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/common/form-field'
import {
  BANK_TRANSFER_MODE_OPTIONS,
  payMonthName,
  type BankTransferMode,
} from '../constants'

interface BankTransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: number
  year: number
  /** The department the list was read for, spelled out — or `null` for all. */
  departmentLabel: string | null
  onDownload: (values: { paymentMode: string; debitAccountNumber: string }) => void
  isDownloading: boolean
}

/** The account number the bank's sheet is debited from — its own length rules. */
const ACCOUNT_MIN = 5
const ACCOUNT_MAX = 34

/**
 * The bank's bulk-transfer upload sheet.
 *
 * Two things the screen can't know are asked for here. The **mode** narrows to
 * the three electronic transfers the bank's template covers — a batch may be
 * recorded as Cash or Cheque, but neither goes into a bulk-transfer file. The
 * **debit account** is the company account the money leaves from, and this
 * system holds no company bank account of its own, so there is nothing to
 * default it to.
 *
 * The sheet describes every UNPAID salary of the period and scope, deliberately
 * not the tick-box selection: it is the file the bank ingests, so re-downloading
 * it after a partial payment always gives what is still owed.
 */
export function BankTransferDialog({
  open,
  onOpenChange,
  month,
  year,
  departmentLabel,
  onDownload,
  isDownloading,
}: BankTransferDialogProps) {
  const [mode, setMode] = useState<BankTransferMode>('NEFT')
  const [account, setAccount] = useState('')
  const [touched, setTouched] = useState(false)

  // Reopened after a download: the account is remembered (it is the same company
  // account every time), but the "please fill this in" state is not.
  useEffect(() => {
    if (open) setTouched(false)
  }, [open])

  const trimmed = account.trim()
  const accountError =
    trimmed.length < ACCOUNT_MIN || trimmed.length > ACCOUNT_MAX
      ? `Enter the ${ACCOUNT_MIN}–${ACCOUNT_MAX} digit account the money is debited from`
      : undefined

  const close = () => {
    if (isDownloading) return
    onOpenChange(false)
  }

  const submit = () => {
    setTouched(true)
    if (accountError) return
    onDownload({ paymentMode: mode, debitAccountNumber: trimmed })
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md p-0" onClose={close}>
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Landmark className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-semibold leading-tight text-foreground">
              Bank Transfer Sheet
            </h2>
            <p className="text-xs text-muted-foreground">
              Everything still unpaid for {payMonthName(month)} {year}
              {departmentLabel ? ` · ${departmentLabel}` : ''}
            </p>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <Field label="Transfer Mode" required>
            <Combobox
              value={mode}
              onChange={(value) => setMode(value as BankTransferMode)}
              options={BANK_TRANSFER_MODE_OPTIONS}
              placeholder="Select a mode"
            />
          </Field>

          <Field
            label="Debit Account Number"
            required
            hint="The company account the salaries are paid from. The bank matches the beneficiary against the name as per Aadhaar where one is on file."
            error={touched ? accountError : undefined}
          >
            <Input
              value={account}
              onChange={(event) => setAccount(event.target.value)}
              placeholder="Company account number"
              inputMode="numeric"
              maxLength={ACCOUNT_MAX}
              disabled={isDownloading}
            />
          </Field>

          <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            One beneficiary row per unpaid salary with a positive net pay, in the
            column order the bank's template mandates. Downloading it changes
            nothing — the salaries stay outstanding until a batch is recorded here.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <Button type="button" variant="outline" onClick={close} disabled={isDownloading}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={isDownloading}>
            <FileSpreadsheet className="size-4" />
            {isDownloading ? 'Preparing…' : 'Download Sheet'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
