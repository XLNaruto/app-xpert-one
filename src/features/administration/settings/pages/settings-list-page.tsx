import { Controller } from 'react-hook-form'
import { ClipboardCheck, FolderKanban, Info } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Forbidden } from '@/features/error'
import { CompanyRequired, ScopedDataError } from '@/features/company'
import { useCompanySettingsForm } from '../hooks/use-company-settings-form'
import { SubmissionModePicker } from '../components/submission-mode-picker'

/**
 * Administration → Settings — the active company's behaviour switches. Today
 * that's how SOP and project tasks are handed in: timed (Start / Stop, then
 * submit) or direct. A change applies from the next action on; no task already
 * on a board is touched.
 */
export function SettingsListPage() {
  const settings = useCompanySettingsForm()
  const { control } = settings.form

  if (settings.isForbidden) return <Forbidden description={settings.forbiddenMessage} />

  return (
    <div>
      <PageHeader
        title="Settings"
        description="How this company's employees work — applied from their next action."
        actions={
          settings.canUpdate &&
          settings.companyId !== null && (
            <div className="flex items-center gap-2">
              {settings.isDirty && (
                <Button
                  variant="outline"
                  onClick={settings.discard}
                  disabled={settings.isSaving}
                >
                  Discard Changes
                </Button>
              )}
              <Button
                onClick={settings.onSubmit}
                disabled={!settings.isDirty || settings.isSaving}
              >
                {settings.isSaving ? 'Saving…' : 'Save Settings'}
              </Button>
            </div>
          )
        }
      />

      {settings.companyId === null ? (
        <CompanyRequired what="the company's settings" />
      ) : settings.isError ? (
        <ScopedDataError
          error={settings.error}
          fallback="Couldn't load the settings."
          what="the settings"
        />
      ) : (
        <Card>
          <CardContent className="space-y-6 pt-6">
            <section>
              <FormSection
                icon={ClipboardCheck}
                title="SOP task submission"
                description="How employees hand in their daily SOP tasks"
                className="mt-0"
              />
              <div className="mt-4">
                {settings.isLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : (
                  <Controller
                    control={control}
                    name="sopTaskSubmission"
                    render={({ field }) => (
                      <SubmissionModePicker
                        name="SOP task submission"
                        value={field.value}
                        onChange={field.onChange}
                        disabled={!settings.canUpdate || settings.isSaving}
                      />
                    )}
                  />
                )}
              </div>
            </section>

            <section>
              <FormSection
                icon={FolderKanban}
                title="Project task submission"
                description="How employees record progress and hand in project tasks"
              />
              <div className="mt-4">
                {settings.isLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : (
                  <Controller
                    control={control}
                    name="projectTaskSubmission"
                    render={({ field }) => (
                      <SubmissionModePicker
                        name="Project task submission"
                        value={field.value}
                        onChange={field.onChange}
                        disabled={!settings.canUpdate || settings.isSaving}
                      />
                    )}
                  />
                )}
              </div>
            </section>

            <div className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>
                  <strong className="font-medium text-foreground">
                    Takes effect on the next action.
                  </strong>{' '}
                  Switching to direct submission stops every running clock
                  automatically, and the time worked up to that moment is kept.
                  After that, Start is refused and employees submit their tasks
                  directly. Proof, note and approval rules stay as they are.
                </span>
              </p>
            </div>

            {!settings.canUpdate && (
              <p className="text-xs text-muted-foreground">
                You can view these settings but not change them.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
