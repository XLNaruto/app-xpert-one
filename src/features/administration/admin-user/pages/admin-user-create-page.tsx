import {
  ArrowLeft,
  Crown,
  KeyRound,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Skeleton } from '@/components/ui/skeleton'
import { MIN_ADMIN_USER_PASSWORD } from '../schemas'
import { useAdminUserForm } from '../hooks/use-admin-user-form'
import { AdminUserRoleFields } from '../components/admin-user-role-fields'
import { AdminUserScopeFields } from '../components/admin-user-scope-fields'
import { AdminUserTalkFields } from '../components/admin-user-talk-fields'

interface AdminUserCreatePageProps {
  /**
   * Encrypted user id from the `?data=` search param. When present the page
   * switches to edit mode; otherwise it's a fresh create.
   */
  data?: string
}

/**
 * Create / Edit User — personal information, the login credentials, the role
 * that says what they may do, and the scope that says where.
 *
 * On edit the password boxes start empty and mean "leave the credential alone";
 * filling them resets it, which signs the user out of every session they hold.
 * Narrowing the SCOPE is different — it's read live on every request, so it
 * takes hold immediately and no session is cleared.
 */
export function AdminUserCreatePage({ data }: AdminUserCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const userId = decryptId(data)

  const form = useAdminUserForm(userId)

  return (
    <div>
      <PageHeader
        title={form.isEdit ? 'Edit User' : 'Add User'}
        description="Their Email Address Is the Login. The Role Decides What They Can Do; The Scope Below Decides Which Companies They Can Do It In."
        actions={
          <>
            {form.isOwner && (
              <Badge variant="default" className="gap-1.5">
                <Crown className="size-3.5" />
                Account Owner
              </Badge>
            )}
            <Button variant="outline" onClick={form.goToList}>
              <ArrowLeft className="size-4" />
              Back to Users
            </Button>
          </>
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
                : "Couldn't Load This User."}
            </p>
          ) : (
            <form
              onSubmit={form.onSubmit}
              noValidate
              className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <FormSection
                icon={UserRound}
                title="Personal Information"
                description="The Employee This Login Belongs To. An Employee of the Role's Company — Once Linked It Can Be Changed, Never Removed."
                className="mt-0"
              />

              <Field
                label="Employee"
                required={!form.isEdit}
                error={form.errors.employeeId?.message}
                hint={
                  form.hasMoreEmployees
                    ? 'Showing the First 100 — Type to Search the Rest by Name.'
                    : 'Their Name and Mobile Number Are Taken from the Employee Record.'
                }
                className="md:col-span-2"
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

              <FormSection
                icon={KeyRound}
                title="Login Credentials"
                description={
                  form.isEdit
                    ? 'The Email Is the Login. Leave the Password Blank to Keep the Current One — Changing It Signs the User out Everywhere.'
                    : 'The Email Is the Login, and It Has to Be Unused Across the Whole Platform.'
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
                    ? 'Leave Blank to Keep the Current Password.'
                    : `At least ${MIN_ADMIN_USER_PASSWORD} characters.`
                }
              >
                <PasswordInput
                  autoComplete="new-password"
                  placeholder={form.isEdit ? 'Leave Blank to Keep Current' : '••••••••'}
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
                hint="Checked in the Browser Only — Re-type the Password So a Typo Can't Lock the User Out."
              >
                <PasswordInput
                  autoComplete="new-password"
                  placeholder={
                    form.isEdit ? 'Leave Blank to Keep Current' : 'Re-enter the Password'
                  }
                  {...form.form.register('confirmPassword')}
                />
              </Field>

              <FormSection
                icon={ShieldCheck}
                title="Role"
                description="The Role Carries the Permissions — What This User May Do — And Its Company Becomes Theirs."
              />

              <AdminUserRoleFields form={form} />

              <FormSection
                icon={SlidersHorizontal}
                title="Scope & Access"
                description="Which Companies This User Reaches, and Whether They May Use Talk. This Is Theirs, Not Their Role's — Two People on One Role Can Cover Different Offices."
              />

              <AdminUserScopeFields form={form} disabled={form.isReachLocked} />
              <AdminUserTalkFields form={form} disabled={form.isReachLocked} />

              <div className="col-span-full mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={form.goToList}
                  disabled={form.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={form.isPending || (form.hasNoRoles && !form.isRoleLocked)}
                >
                  {form.isPending
                    ? 'Saving…'
                    : form.isEdit
                      ? 'Save Changes'
                      : 'Create User'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
