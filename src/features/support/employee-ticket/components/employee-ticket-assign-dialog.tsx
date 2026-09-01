import { UserRoundCog } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { ALL_FILTER } from '../constants'

interface EmployeeTicketAssignDialogProps {
  code: string | undefined
  /** Who holds it now, so the dialog can say what is actually changing. */
  currentAssignee: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  onConfirm: () => void
  loading: boolean
}

/**
 * Hand the ticket to a colleague — or, by clearing the picker, release it back
 * to the unassigned queue.
 *
 * This is the deliberate move, as against picking a ticket up: it's recorded as
 * `user` even when somebody assigns a ticket to themselves, because that's a
 * decision rather than a pick-up. Three things follow that are worth saying on
 * the dialog itself, since none of them is guessable:
 *
 * - the STATUS doesn't move — an in-progress ticket stays in progress,
 * - any open work stretch closes, so the outgoing handler keeps the minutes
 *   they actually spent, and
 * - the "being worked" light goes dark until the new handler picks it up.
 *
 * The roster is the account's ordinary user list. Inactive people are shown and
 * refused rather than hidden — the server answers 409 for one, and a greyed row
 * explains itself better than a missing name.
 */
export function EmployeeTicketAssignDialog({
  code,
  currentAssignee,
  open,
  onOpenChange,
  options,
  value,
  onChange,
  onConfirm,
  loading,
}: EmployeeTicketAssignDialogProps) {
  const isRelease = !value
  const picked = options.find((option) => option.value === value)

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={UserRoundCog}
      title={isRelease ? 'Release this ticket?' : 'Hand this ticket over?'}
      description={
        code
          ? isRelease
            ? `${code} goes back to the unassigned queue for anyone to take. Its status doesn't move, and the time already spent on it stays recorded against whoever spent it.`
            : `${code} moves to ${picked?.label ?? 'the person below'}. Its status doesn't move — an in-progress ticket stays in progress — and any open work stretch closes, so the outgoing handler keeps the minutes they actually spent.`
          : undefined
      }
      confirmLabel={isRelease ? 'Release' : 'Hand over'}
      cancelLabel="Cancel"
      loading={loading}
      keepOpenOnConfirm
      onConfirm={onConfirm}
    >
      <div className="space-y-1.5 text-left">
        <label className="text-sm font-medium text-foreground/90">Handled by</label>
        <Combobox
          options={options}
          value={value}
          onChange={onChange}
          icon={UserRoundCog}
          placeholder="Nobody — leave it in the queue"
          searchPlaceholder="Search people"
          // Clearing is a real choice here, not an empty field: it sends `null`,
          // which is the release.
          clearable
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          {currentAssignee
            ? `Currently with ${currentAssignee}. Clear the field to release it back to the queue.`
            : 'Nobody holds this yet. Picking somebody hands it to them without waiting for them to take it.'}
          {value === ALL_FILTER ? '' : ' Inactive people are shown but cannot be given work.'}
        </p>
      </div>
    </ConfirmDialog>
  )
}
