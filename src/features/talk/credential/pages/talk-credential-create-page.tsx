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
import { Switch } from '@/components/ui/switch'
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
 *
 * On create the login may instead be COPIED from the employee's panel
 * credential, which is why the employee is asked for before it. That only seeds
 * the credential — it is not a link, and nothing keeps the two in step
 * afterwards — so the edit form has no such box.
 */
export function TalkCredentialCreatePage({ data }: TalkCredentialCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const credentialId = decryptId(data)

  const form = useTalkCredentialForm(credentialId)

  /**
   * Copying the panel credential puts the password boxes away — until the
   * endpoint answers that this employee had no panel password to copy, which is
   * the one case the client can't foresee.
   */
  const showPasswordFields = !form.isSameAsPanelCreds || form.panelPasswordRequired

  return (
    <div>
      <PageHeader
        title={form.isEdit ? 'Edit Talk Credential' : 'Issue Talk Credential'}
        description="The Email Address Is the Talk Login, and It Has to Be Unused Across the Whole Talk Platform. The Reach Below Decides Who This Person Can Talk To."
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
                : "Couldn't Load This Talk Credential."}
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
                description="Who This Talk Login Is For. One Employee May Hold Only One Credential, and It Can Never Be Moved to Someone Else."
                className="mt-0"
              />

              {form.isEdit ? (
                /* Read-only by design, not by permission — the endpoint has no
                   field for the employee. Shown rather than hidden so the form
                   still says whose login is being edited. */
                <Field
                  label="Employee"
                  hint="An Issued Credential Cannot Be Moved to Another Employee — Delete It and Issue a New One."
                >
                  <div className="flex h-9 items-center rounded-md border border-border/60 bg-muted/40 px-3 text-sm text-foreground">
                    {form.credential ? employeeLabel(form.credential) : 'N/A'}
                  </div>
                </Field>
              ) : (
                <Field
                  label="Employee"
                  required
                  error={form.errors.employeeId?.message}
                  hint={
                    form.hasMoreEmployees
                      ? 'Showing the First 100 — Type to Search the Rest by Name.'
                      : 'Every Employee of the Account, Across All Companies.'
                  }
                >
                  <Combobox
                    value={form.employeeId}
                    onChange={form.setEmployeeId}
                    options={form.employeeOptions}
                    icon={UserRound}
                    placeholder="Select Employee"
                    // Matched server-side, by name, across every company.
                    onSearchChange={form.setEmployeeSearch}
                    searchPlaceholder="Search Employees by Name"
                    loading={form.isEmployeesLoading}
                    panelMinWidth={280}
                    className="w-full"
                  />
                </Field>
              )}

              <FormSection
                icon={KeyRound}
                title="Talk Login"
                description={
                  form.isEdit
                    ? "Talk's Own Credential, Not the Panel One. Leave the Password Blank to Keep the Current One — Filling It Replaces It."
                    : "Talk's Own Credential, Not the Panel One. The Address Is the Username, and It Must Be Unused Across the Whole Talk Platform — Copy the Employee's Panel Login, or Type One Here."
                }
              />

              {/* Live on BOTH forms — the PATCH takes the flag too, where ON
                  RE-SEEDS from the panel credential as it stands now and OFF
                  takes the flag down. It sits above the boxes it governs, and
                  below the employee it copies from. */}
              <Field
                label="Panel Credentials"
                hint={
                  form.isEdit
                    ? "Turn On to Re-copy the Employee's Panel Login Onto This Credential as It Stands Right Now. Turn Off to Make It Its Own Again — The Boxes Come Back and the Password Can Be Rotated There. The Panel Login Itself Is Never Touched."
                    : "Copies the Employee's Panel Email — And Their Panel Password, If They Have a Panel Login. It Seeds This Credential Once; Changing Either Side Later Does Not Affect the Other."
                }
                className="flex flex-col justify-end"
              >
                <div className="flex h-9 items-center gap-3">
                  <Switch
                    checked={form.isSameAsPanelCreds}
                    onCheckedChange={form.setIsSameAsPanelCreds}
                    aria-label="Use the employee's panel credentials for this Talk login"
                  />
                  {/* Short enough to stay on ONE line inside a grid column —
                      the whole story is in the label's tooltip, and a caption
                      that wraps to two lines pushes this field taller than the
                      inputs beside it. */}
                  <span className="min-w-0 truncate text-sm text-muted-foreground">
                    {form.isSameAsPanelCreds
                      ? form.isEdit && !form.wasSeededFromPanel
                        ? 'Will Copy Panel Login'
                        : 'Copied from Panel Login'
                      : form.isEdit
                        ? 'Its Own Talk Login'
                        : 'Enter a Login Below'}
                  </span>
                </div>
              </Field>

              {/* Gone rather than disabled while the login is copied: nothing
                  typed here would survive — the endpoint takes the employee's
                  own address and discards what it was sent — so an empty box
                  would only invite an answer it then throws away. */}
              {!form.isSameAsPanelCreds && (
                <Field label="Email Address" required error={form.errors.email?.message}>
                  <Input
                    type="email"
                    autoComplete="off"
                    placeholder="name@company.com"
                    {...form.form.register('email')}
                  />
                </Field>
              )}

              {/* Away with the address while the panel password is being
                  copied — and BACK, required, if the endpoint answers that
                  there was none to copy (an employee who signs in by phone OTP
                  has no panel account). That case can't be told apart from
                  here, so it's recovered rather than prevented: the rest of the
                  form, reach included, survives the failed save. */}
              {showPasswordFields && (
                <>
                  <Field
                    label="Password"
                    required={!form.isEdit}
                    error={form.errors.password?.message}
                    hint={
                      form.isEdit
                        ? 'Leave Blank to Keep the Current Password.'
                        : `At least ${MIN_TALK_CREDENTIAL_PASSWORD} characters.`
                    }
                  >
                    <PasswordInput
                      autoComplete="new-password"
                      placeholder={
                        form.isEdit ? 'Leave Blank to Keep Current' : '••••••••'
                      }
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
                    hint="Checked in the Browser Only — The Password Is Stored Hashed and Never Shown Again."
                  >
                    <PasswordInput
                      autoComplete="new-password"
                      placeholder={
                        form.isEdit ? 'Leave Blank to Keep Current' : 'Re-enter the Password'
                      }
                      {...form.form.register('confirmPassword')}
                    />
                  </Field>
                </>
              )}

              {/* Nothing is asked for, so the section says what will happen
                  instead of standing empty. */}
              {form.isSameAsPanelCreds && !form.panelPasswordRequired && (
                <p className="col-span-full flex items-start gap-1.5 text-xs leading-4 text-muted-foreground">
                  <Info className="size-3.5 shrink-0 translate-y-px" />
                  The address and password are taken from the employee's panel login when
                  this credential is issued. If they have no panel login, the address comes
                  from their employee record and you'll be asked for a password here.
                </p>
              )}

              {/* Only when this save is about to CHANGE the answer — the
                  switch above already states it otherwise, and the screen
                  re-renders from the PATCH response either way. */}
              {form.isEdit && form.isSameAsPanelCreds !== form.wasSeededFromPanel && (
                <p className="col-span-full flex items-start gap-1.5 text-xs leading-4 text-muted-foreground">
                  <Info className="size-3.5 shrink-0 translate-y-px" />
                  {form.isSameAsPanelCreds
                    ? "Saving Replaces This Talk Login with the Employee's Panel One as It Stands Now. The Credential Keeps Its Conversations and Its Reach — Only the Address and Password Change."
                    : 'Saving Keeps the Address and Password This Credential Already Has and Simply Stops Calling It the Panel One. Set a New Password Below to Rotate It at the Same Time.'}
                </p>
              )}

              {/* Status is edit-only: a credential is issued active, and the
                  POST body has no field for it. */}
              {form.isEdit && (
                <Field
                  label="Status"
                  hint="Inactive Suspends the Login Without Deleting It — The Address Stays Taken and the History Intact."
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
                description="Who This Person Can Talk To. Whole Companies and Individual Departments Are Two Independent Lists — A Department Can Be Granted Without Its Company."
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
