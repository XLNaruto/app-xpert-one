import { ArrowLeft, KeyRound, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { decryptId } from '@/lib/crypto'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { Field } from '@/components/common/form-field'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useRoleForm } from '../hooks/use-role-form'
import { PermissionMatrix } from '../components/permission-matrix'
import { RoleScopeFields } from '../components/role-scope-fields'
import { RoleTalkFields } from '../components/role-talk-fields'

interface RoleCreatePageProps {
  /**
   * Encrypted role id from the `?data=` search param. When present the page
   * switches to edit mode; otherwise it's a fresh create.
   */
  data?: string
}

export function RoleCreatePage({ data }: RoleCreatePageProps) {
  // Decrypt the params from the URL; missing/malformed → create mode.
  const roleId = decryptId(data)

  const form = useRoleForm(roleId)

  // A system role is seeded server-side: it renders in full, but nothing on it
  // moves, so the screen reads as a view rather than an edit that fails on save.
  const isReadOnly = Boolean(form.role?.isSystem)

  return (
    <div>
      <PageHeader
        title={form.isEdit ? 'Edit Role' : 'Create Role'}
        description="Name the role, then pick the screens it can open and what it can do on each."
        actions={
          <>
            <Badge variant="default" className="gap-1.5">
              <KeyRound className="size-3.5" />
              {form.selectedCount}/{form.totalCodes} enabled
            </Badge>
            <Button variant="outline" onClick={form.goToList}>
              <ArrowLeft className="size-4" />
              Back to Roles
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {form.isLoading ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
              <Skeleton className="h-72 w-full" />
            </div>
          ) : form.isError ? (
            <p className="text-sm text-destructive">
              {form.loadError instanceof Error
                ? form.loadError.message
                : "Couldn't load this role."}
            </p>
          ) : (
            <form
              onSubmit={form.onSubmit}
              noValidate
              className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              <FormSection
                icon={ShieldCheck}
                title="Role"
                description="What this role is called. The name has to be unique within the company."
                className="mt-0"
              />

              <Field label="Role Name" required error={form.errors.name?.message}>
                <Input
                  placeholder="e.g. Support Admin"
                  disabled={isReadOnly}
                  {...form.form.register('name')}
                />
              </Field>

              <FormSection
                icon={SlidersHorizontal}
                title="Scope & Access"
                description="Which companies the role reaches, and whether it may use Talk."
              />

              <RoleScopeFields form={form} disabled={isReadOnly} />
              <RoleTalkFields form={form} disabled={isReadOnly} />

              <FormSection
                icon={KeyRound}
                title="Permissions"
                description="Pick the screens this role can open, and what it can do on each."
              />

              <div className="col-span-full">
                {form.errors.permissionCodes?.message && (
                  <p className="mb-2 text-xs text-destructive">
                    {form.errors.permissionCodes.message}
                  </p>
                )}
                <PermissionMatrix form={form} disabled={isReadOnly} />
              </div>

              <div className="col-span-full mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground tabular-nums">
                    {form.selectedCount}
                  </span>{' '}
                  of {form.totalCodes} permissions enabled
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={form.goToList}
                    disabled={form.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={form.isPending || isReadOnly}>
                    {form.isPending
                      ? 'Saving…'
                      : form.isEdit
                        ? 'Save Changes'
                        : 'Create Role'}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
