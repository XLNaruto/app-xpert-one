import { ArrowLeft, ArrowRight, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * The footer every editable step wears: step back, or save and go on.
 *
 * Two buttons and no more. A step is one stop in a nine-stop wizard, so the only
 * two things to do at the bottom of one are "go back a step" and "save this one
 * and move on" — extra save-and-leave variants only made the important button
 * harder to find.
 *
 * The save is a real `type="submit"`, so Enter works and the form's validation runs
 * first: a step that doesn't validate never advances — it marks every field that
 * held it back and scrolls to the first one, which is the whole message. No toast
 * repeats what the fields already say.
 */
export function StepFormFooter({
  onBack,
  isSaving,
  saveLabel = 'Save & Next',
  hint,
}: {
  /** Go back a step — the previous tab, or out of the wizard from the first. */
  onBack: () => void
  isSaving: boolean
  /** Label for the submit; defaults to "Save & Next". */
  saveLabel?: string
  /** A line of explanation on the left of the footer. */
  hint?: string
}) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
      <p className="text-xs text-muted-foreground">{hint}</p>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSaving}>
          <ArrowLeft className="size-4" />
          Back
        </Button>

        <Button type="submit" disabled={isSaving}>
          <Save className="size-4" />
          {isSaving ? 'Saving…' : saveLabel}
          {!isSaving && <ArrowRight className="size-4" />}
        </Button>
      </div>
    </div>
  )
}
