import { ArrowLeft, ArrowRight, CheckCheck, Plus, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * The footer every editable step wears: back out, save and go on, or save and
 * leave.
 *
 * Both save buttons run the same submit — only what happens afterwards differs, so
 * the primary one is a real `type="submit"` (Enter works) and the secondary sets a
 * flag before submitting.
 *
 * `onSaveAndAddNew` is only for the steps where entering the *next* record straight
 * away is the normal rhythm — leave, in practice. Omit it elsewhere; a third save
 * button that does nothing useful just makes the important one harder to find.
 */
export function StepFormFooter({
  onCancel,
  onSaveAndClose,
  onSaveAndAddNew,
  isSaving,
  saveLabel,
  hint,
}: {
  onCancel: () => void
  onSaveAndClose: () => void
  onSaveAndAddNew?: () => void
  isSaving: boolean
  /** Label for the primary submit — "Save Family Detail", "Save Leave", … */
  saveLabel: string
  /** A line of explanation on the left of the footer. */
  hint?: string
}) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
      <p className="text-xs text-muted-foreground">{hint}</p>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          <ArrowLeft className="size-4" />
          Cancel
        </Button>

        <Button type="submit" disabled={isSaving}>
          <Save className="size-4" />
          {isSaving ? 'Saving…' : saveLabel}
          {!isSaving && <ArrowRight className="size-4" />}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={onSaveAndClose}
          disabled={isSaving}
        >
          <CheckCheck className="size-4" />
          Save &amp; Close
        </Button>

        {onSaveAndAddNew && (
          <Button
            type="button"
            variant="secondary"
            onClick={onSaveAndAddNew}
            disabled={isSaving}
          >
            <Plus className="size-4" />
            Save &amp; Add New
          </Button>
        )}
      </div>
    </div>
  )
}
