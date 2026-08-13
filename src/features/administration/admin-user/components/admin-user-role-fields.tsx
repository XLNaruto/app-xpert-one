import { Building2, Globe2, Info, MessageSquare, ShieldCheck } from 'lucide-react'
import { Field } from '@/components/common/form-field'
import { Badge } from '@/components/ui/badge'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { ADMIN_USER_STATUS_OPTIONS } from '../constants'
import type { useAdminUserForm } from '../hooks/use-admin-user-form'

interface AdminUserRoleFieldsProps {
  form: ReturnType<typeof useAdminUserForm>
}

/**
 * The role picker and, on an edit, the status switch.
 *
 * The role is the entire access model — permissions, company reach and Talk
 * grants all live on it, and the role's company becomes the user's. So the pick
 * is previewed rather than left implicit: the chips below say what the role
 * carries before anything is saved.
 *
 * Where the API won't take a change — the caller's own row, or an owner, who
 * holds no role at all — the picker is replaced by what's stored rather than
 * offered and then refused.
 */
export function AdminUserRoleFields({ form }: AdminUserRoleFieldsProps) {
  const { selectedRole, selectedRoleCompany } = form

  return (
    <>
      <Field
        label="Role"
        required={!form.isRoleLocked}
        error={form.errors.roleId?.message}
        hint="The role decides which screens this user can open and what they can do there — and the company it belongs to becomes theirs."
      >
        {form.isRoleLocked ? (
          <Input
            readOnly
            disabled
            value={
              form.isOwner
                ? 'Account owner — no role'
                : (form.user?.roleName ?? 'No role assigned')
            }
          />
        ) : (
          <Combobox
            options={form.roleOptions}
            value={form.roleId}
            onChange={form.setRoleId}
            loading={form.isRolesLoading}
            icon={ShieldCheck}
            placeholder={form.isRolesLoading ? 'Loading roles…' : 'Select a role'}
            searchPlaceholder="Search roles"
            className="w-full"
          />
        )}
      </Field>

      {form.isEdit && (
        <Field
          label="Status"
          error={form.errors.status?.message}
          hint="An inactive user keeps their record but cannot sign in."
        >
          <Combobox
            options={ADMIN_USER_STATUS_OPTIONS}
            value={form.status}
            onChange={form.setStatus}
            searchable={false}
            className="w-full"
          />
        </Field>
      )}

      {/* What the pick implies — the reach and the Talk grant that come with it. */}
      {selectedRole && (
        <div className="col-span-full flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Building2 className="size-3" />
            {selectedRoleCompany ?? `Company #${selectedRole.companyId}`}
          </Badge>
          {selectedRole.accessLevel === 'GLOBAL' ? (
            <Badge variant="default" className="gap-1">
              <Globe2 className="size-3" />
              Reaches all companies
            </Badge>
          ) : (
            <Badge variant="secondary">Reaches selected companies</Badge>
          )}
          {selectedRole.talkEnabled && (
            <Badge variant="success" className="gap-1">
              <MessageSquare className="size-3" />
              Talk enabled
            </Badge>
          )}
        </div>
      )}

      {form.isSelf && !form.isOwner && (
        <p className="col-span-full flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          You cannot change your own role — ask another administrator to do it.
        </p>
      )}

      {form.isOwner && (
        <p className="col-span-full flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          An account owner holds no role. Their access comes from the account's
          subscription, so there is nothing to assign here.
        </p>
      )}

      {form.hasNoRoles && !form.isRoleLocked && (
        <p className="col-span-full flex items-start gap-2 text-xs text-destructive">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          No roles have been created yet. Author one under Roles &amp; Permissions
          first — a user cannot be added without one.
        </p>
      )}
    </>
  )
}
