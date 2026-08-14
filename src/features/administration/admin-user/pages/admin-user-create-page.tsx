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
        description="Their email address is the login. The role decides what they can do; the scope below decides which companies they can do it in."
        actions={
          <>
            {form.isOwner && (
              <Badge variant="default" className="gap-1.5">
                <Crown className="size-3.5" />
                Account owner
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
                : "Couldn't load this user."}
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
                description="Who this person is. The mobile number is one identity on the platform, so it has to be theirs alone."
                className="mt-0"
              />

              <Field label="First Name" required error={form.errors.firstName?.message}>
                <Input placeholder="e.g. Priya" {...form.form.register('firstName')} />
              </Field>

              <Field label="Last Name" required error={form.errors.lastName?.message}>
                <Input placeholder="e.g. Sharma" {...form.form.register('lastName')} />
              </Field>

              <Field
                label="Mobile Number"
                required
                error={form.errors.mobileNumber?.message}
              >
                <Input
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  {...form.form.register('mobileNumber')}
                />
              </Field>

              <FormSection
                icon={KeyRound}
                title="Login Credentials"
                description={
                  form.isEdit
                    ? 'The email is the login. Leave the password blank to keep the current one — changing it signs the user out everywhere.'
                    : 'The email is the login, and it has to be unused across the whole platform.'
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
                    : `At least ${MIN_ADMIN_USER_PASSWORD} characters.`
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
                hint="Checked in the browser only — re-type the password so a typo can't lock the user out."
              >
                <PasswordInput
                  autoComplete="new-password"
                  placeholder={
                    form.isEdit ? 'Leave blank to keep current' : 'Re-enter the password'
                  }
                  {...form.form.register('confirmPassword')}
                />
              </Field>

              <FormSection
                icon={ShieldCheck}
                title="Role"
                description="The role carries the permissions — what this user may do — and its company becomes theirs."
              />

              <AdminUserRoleFields form={form} />

              <FormSection
                icon={SlidersHorizontal}
                title="Scope & Access"
                description="Which companies this user reaches, and whether they may use Talk. This is theirs, not their role's — two people on one role can cover different offices."
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
