import { Controller } from 'react-hook-form'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { MAX_CYCLE_WEEKS } from '../schemas'
import { useShiftRotationForm } from '../hooks/use-shift-rotation-form'
import { RotationWeeksField } from '../components/rotation-weeks-field'

interface ShiftRotationCreatePageProps {
  /**
   * Encrypted rotation id from the `?data=` search param. When present the page
   * switches to edit mode; otherwise it's a fresh create.
   */
  data?: string
}

/**
 * Create / edit a rotation cycle. One screen for both: a `?data=` token edits the
 * rotation it carries, no token creates a new one.
 *
 * Editing one changes which shift every assigned employee works from now on — the
 * cycle is read live per date, never materialised — so a save here is felt
 * immediately across everyone on it.
 */
export function ShiftRotationCreatePage({ data }: ShiftRotationCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const rotationId = decryptId(data)

  const form = useShiftRotationForm(rotationId)

  return (
    <div>
      <PageHeader
        title={form.isEdit ? 'Edit Shift Rotation' : 'Add Shift Rotation'}
        description="Name the cycle, say how many weeks it runs, then pick the shift for each week."
        actions={
          <Button variant="outline" onClick={form.goToList}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {form.isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : form.isError ? (
            <p className="text-sm text-destructive">
              {form.loadError instanceof Error
                ? form.loadError.message
                : "Couldn't load this shift rotation."}
            </p>
          ) : (
            <form
              onSubmit={form.onSubmit}
              noValidate
              className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <FormSection
                icon={RefreshCw}
                title="Rotation Cycle"
                description="A repeating sequence of shifts, one shift per week"
                className="mt-0"
              />

              <Field label="Rotation Name" required error={form.errors.name?.message}>
                <Input
                  placeholder="e.g. Day / Night Fortnight"
                  {...form.form.register('name')}
                />
              </Field>

              {/*
                Not registered through `register`: moving the length has to rebuild
                the week rows in the same step, or the form would briefly hold a
                cycle the API refuses.
              */}
              <Field
                label="Cycle Length (weeks)"
                required
                error={form.errors.cycleLengthWeeks?.message}
                hint="How many weeks before the sequence repeats. Counted from each employee's own effective date."
              >
                <Input
                  type="number"
                  min={1}
                  max={MAX_CYCLE_WEEKS}
                  value={form.cycleLengthWeeks}
                  onChange={(event) => form.setCycleLength(event.target.value)}
                />
              </Field>

              <Field
                label="Status"
                hint="An inactive rotation stays on record but shouldn't be assigned to new employees."
              >
                <div className="flex h-9 items-center gap-2">
                  <Controller
                    control={form.form.control}
                    name="status"
                    render={({ field }) => (
                      <>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-label="Rotation active"
                        />
                        <span className="text-xs text-muted-foreground">
                          {field.value ? 'Active' : 'Inactive'}
                        </span>
                      </>
                    )}
                  />
                </div>
              </Field>

              <div className="col-span-full">
                <FormSection
                  icon={RefreshCw}
                  title="Weeks"
                  description="Every week of the cycle needs a shift — a gap would drop the employee onto the department default"
                />
              </div>

              <RotationWeeksField form={form} />

              <div className="col-span-full mt-4 flex items-center justify-end gap-3 border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={form.goToList}
                  disabled={form.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={form.isPending || form.hasNoShifts}>
                  {form.isPending
                    ? 'Saving…'
                    : form.isEdit
                      ? 'Save Changes'
                      : 'Create Rotation'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
