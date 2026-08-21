import { ArrowLeft, Info, KeyRound, SlidersHorizontal, UserRound } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Skeleton } from '@/components/ui/skeleton'
import { TALK_CREDENTIAL_STATUS_OPTIONS } from '../constants'
import { MIN_TALK_CREDENTIAL_PASSWORD } from '../schemas'
import { employeeLabel } from '../lib/talk-credential-mappers'
import { useTalkCredentialForm } from '../hooks/use-talk-credential-form'
import { TalkCredentialReachFields } from '../components/talk-credential-reach-fields'

interface TalkCredentialCreatePageProps {
  /**
   * Encrypted credential id from the `?data=` search param. When present the
   * page switches to edit mode; otherwise it's a fresh issue.
   */
  data?: string
}

/**
 * Issue / Edit Talk Credential — the employee, their Talk login, and how far it
 * reaches.
 *
 * This is Talk's OWN password, not the panel one, and it is write-only: no
 * endpoint ever returns it, so on edit the box starts empty and means "leave it
 * alone" — filling it ROTATES the password. The employee is chosen once and
 * never again: re-pointing a credential would hand someone else the first
 * person's conversation history under an address their colleagues already know.
 */
export function TalkCredentialCreatePage({ data }: TalkCredentialCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const credentialId = decryptId(data)

  const form = useTalkCredentialForm(credentialId)

  return (
    <div>
      <PageHeader
        title={form.isEdit ? 'Edit XpertOne Talk Credential' : 'Issue XpertOne Talk Credential'}
        description="The email address is the XpertOne Talk login, and it has to be unused across the whole Talk platform. The reach below decides who this person can talk to."
        actions={
          <Button variant="outline" onClick={form.goToList}>
            <ArrowLeft className="size-4" />
            Back to Credentials
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {form.isLoading ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
              <Skeleton className="h-40 w-full" />
            </div>
          ) : form.isError ? (
            <p className="text-sm text-destructive">
              {form.loadError instanceof Error
                ? form.loadError.message
                : "Couldn't load this XpertOne Talk credential."}
            </p>
          ) : (
            <form
              onSubmit={form.onSubmit}
              noValidate
              className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <FormSection
                icon={UserRound}
                title="Employee"
                description="Who this XpertOne Talk login is for. One employee may hold only one credential, and it can never be moved to someone else."
                className="mt-0"
              />

              {form.isEdit ? (
                /* Read-only by design, not by permission — the endpoint has no
                   field for the employee. Shown rather than hidden so the form
                   still says whose login is being edited. */
                <Field
                  label="Employee"
                  hint="An issued credential cannot be moved to another employee — delete it and issue a new one."
                >
                  <div className="flex h-9 items-center rounded-md border border-border/60 bg-muted/40 px-3 text-sm text-foreground">
                    {form.credential ? employeeLabel(form.credential) : '—'}
                  </div>
                </Field>
              ) : (
                <Field
                  label="Employee"
                  required
                  error={form.errors.employeeId?.message}
                  hint={
                    form.hasMoreEmployees
                      ? 'Showing the first 100 — type to search the rest by name.'
                      : 'Every employee of the account, across all companies.'
                  }
                >
                  <Combobox
                    value={form.employeeId}
                    onChange={form.setEmployeeId}
                    options={form.employeeOptions}
                    icon={UserRound}
                    placeholder="Select employee"
                    // Matched server-side, by name, across every company.
                    onSearchChange={form.setEmployeeSearch}
                    searchPlaceholder="Search employees by name"
                    loading={form.isEmployeesLoading}
                    panelMinWidth={280}
                    className="w-full"
                  />
                </Field>
              )}

              <FormSection
                icon={KeyRound}
                title="XpertOne Talk Login"
                description={
                  form.isEdit
                    ? "XpertOne Talk's own credential, not the panel one. Leave the password blank to keep the current one — filling it replaces it."
                    : "XpertOne Talk's own credential, not the panel one. The address is the username, and it must be unused across the whole Talk platform."
                }
              />

              <Field label="Email Address" required error={form.errors.email?.message}>
                <Input
                  type="email"
                  autoComplete="off"
                  placeholder="name@company.com"
                  {...form.form.register('email')}
                />
              </Field>

              <Field
                label="Password"
                required={!form.isEdit}
                error={form.errors.password?.message}
                hint={
                  form.isEdit
                    ? 'Leave blank to keep the current password.'
                    : `At least ${MIN_TALK_CREDENTIAL_PASSWORD} characters.`
                }
              >
                <PasswordInput
                  autoComplete="new-password"
                  placeholder={form.isEdit ? 'Leave blank to keep current' : '••••••••'}
                  {...form.form.register('password')}
                />
              </Field>

              {/* Front-end only — it never travels. The API takes one
                  `password`; this box exists so a typo can't quietly become
                  someone's login. Blank on an edit means the password isn't
                  being changed, so there is nothing to match. */}
              <Field
                label="Confirm Password"
                required={!form.isEdit}
                error={form.errors.confirmPassword?.message}
                hint="Checked in the browser only — the password is stored hashed and never shown again."
              >
                <PasswordInput
                  autoComplete="new-password"
                  placeholder={
                    form.isEdit ? 'Leave blank to keep current' : 'Re-enter the password'
                  }
                  {...form.form.register('confirmPassword')}
                />
              </Field>

              {/* Status is edit-only: a credential is issued active, and the
                  POST body has no field for it. */}
              {form.isEdit && (
                <Field
                  label="Status"
                  hint="Inactive suspends the login without deleting it — the address stays taken and the history intact."
                >
                  <Combobox
                    value={form.status}
                    onChange={form.setStatus}
                    options={TALK_CREDENTIAL_STATUS_OPTIONS}
                    className="w-full"
                  />
                </Field>
              )}

              <FormSection
                icon={SlidersHorizontal}
                title="Reach"
                description="Who this person can talk to. Whole companies and individual departments are two independent lists — a department can be granted without its company."
              />

              <TalkCredentialReachFields form={form} />

              {form.isEdit && (
                <p className="col-span-full flex items-start gap-1.5 text-xs leading-4 text-muted-foreground">
                  <Info className="size-3.5 shrink-0 translate-y-px" />
                  Changing the reach replaces what is stored — the lists here are what the
                  credential will hold, not additions to it.
                </p>
              )}

              <div className="col-span-full mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
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
                      : 'Issue Credential'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
