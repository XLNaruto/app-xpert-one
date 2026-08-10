import { Controller } from 'react-hook-form'
import { ArrowLeft, CalendarOff } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useWeekoffPolicyForm } from '../hooks/use-weekoff-policy-form'
import { WeekoffDaysField } from '../components/weekoff-days-field'

interface WeekoffPolicyCreatePageProps {
  /**
   * Encrypted policy id from the `?data=` search param. When present the page
   * switches to edit mode; otherwise it's a fresh create.
   */
  data?: string
}

/**
 * Create / edit a week-off policy. One screen for both: a `?data=` token edits the
 * policy it carries, no token creates a new one.
 *
 * Saving always sends the complete rule set, because that's the only thing the
 * endpoint accepts — `days` replaces every rule. The editor therefore holds the
 * whole pattern rather than a diff of it.
 */
export function WeekoffPolicyCreatePage({ data }: WeekoffPolicyCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const policyId = decryptId(data)

  const form = useWeekoffPolicyForm(policyId)

  return (
    <div>
      <PageHeader
        title={form.isEdit ? 'Edit Week-Off Policy' : 'Add Week-Off Policy'}
        description="Name the pattern, then mark which days are off."
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
                : "Couldn't load this week-off policy."}
            </p>
          ) : (
            <form
              onSubmit={form.onSubmit}
              noValidate
              className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <FormSection
                icon={CalendarOff}
                title="Week-Off Policy"
                description="A named pattern of non-working days that shifts, departments and companies can point at"
                className="mt-0"
              />

              <Field
                label="Policy Name"
                required
                error={form.errors.name?.message}
              >
                <Input
                  placeholder="e.g. Sunday + Alternate Saturday"
                  {...form.form.register('name')}
                />
              </Field>

              <Field
                label="Status"
                hint="An inactive policy stays on record but shouldn't be pointed at by new shifts."
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
                          aria-label="Policy active"
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
                  icon={CalendarOff}
                  title="The Pattern"
                  description="Off every week, plus any rule that only applies to certain occurrences in the month"
                />
              </div>

              <WeekoffDaysField form={form} />

              <div className="col-span-full mt-4 flex items-center justify-end gap-3 border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={form.goToList}
                  disabled={form.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={form.isPending}>
                  {form.isPending
                    ? 'Saving…'
                    : form.isEdit
                      ? 'Save Changes'
                      : 'Create Policy'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
