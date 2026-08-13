import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { useAuthStore } from '@/stores/auth-store'
import { useMyCompanies } from '@/features/company'
import { adminUserSchema, type AdminUserFormValues } from '../schemas'
import { EMPTY_ADMIN_USER_FORM } from '../constants'
import { useAdminUser, useAssignableRoles } from '../api/use-admin-users'
import { useCreateAdminUser, useUpdateAdminUser } from '../api/use-admin-user-mutations'
import { adminUserToFormValues } from '../lib/admin-user-mappers'

/**
 * Owns the Create / Edit User screen — personal information, the login
 * credentials and the role that decides everything else.
 *
 * **The role is the whole access model.** Permissions, company reach and Talk
 * grants all live on it, and the role's company becomes the user's — which is
 * why there's no company field here, and why the picker shows what the pick
 * implies before it's saved.
 *
 * Two things the API refuses, handled here rather than as a 400:
 *
 * - **Your own role.** The caller can't re-role their own row, so the field is
 *   locked when editing yourself.
 * - **A role with no company.** That's the account owner's shape; the endpoint
 *   never offers such a role, so an OWNER being edited simply has no role to
 *   show and the picker stays out of the way.
 */
export function useAdminUserForm(id?: number) {
  const isEdit = id !== undefined
  const navigate = useNavigate()

  const detail = useAdminUser(id ?? Number.NaN)
  const roles = useAssignableRoles()

  const createUser = useCreateAdminUser()
  const updateUser = useUpdateAdminUser(id ?? Number.NaN)

  const { companies } = useMyCompanies()

  /** The caller's own row — the one whose role can't be changed. */
  const currentUserId = useAuthStore((state) => state.user?.id ?? null)
  const isSelf = isEdit && currentUserId !== null && currentUserId === id

  /**
   * An OWNER holds no role at all. Their name, email and mobile are still
   * editable; the role picker isn't, because there's nothing this screen could
   * put there that the API would take.
   */
  const isOwner = Boolean(detail.data?.isOwner)

  /**
   * A password is required to create a login and optional to edit one, and a
   * role is required of everyone except an owner — so the schema is built for
   * the record on screen rather than declared once.
   */
  const schema = useMemo(
    () => adminUserSchema({ requirePassword: !isEdit, requireRole: !isOwner }),
    [isEdit, isOwner],
  )

  const form = useForm<AdminUserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_ADMIN_USER_FORM,
  })
  const { control, reset, handleSubmit, setValue } = form

  // Seed the form once the record loads (edit mode only).
  useEffect(() => {
    if (detail.data) reset(adminUserToFormValues(detail.data))
  }, [detail.data, reset])

  const roleId = useWatch({ control, name: 'roleId' }) ?? ''
  const status = useWatch({ control, name: 'status' }) ?? 'active'

  /** Company names by id, so a role can be labelled with the company it carries. */
  const companyNames = useMemo(
    () => new Map(companies.map((company) => [company.id, company.name])),
    [companies],
  )

  /**
   * The role dropdown. Each option names the company the role belongs to,
   * because that company becomes the user's — two roles called "Manager" under
   * different companies are otherwise indistinguishable here.
   */
  const roleOptions = useMemo(
    () =>
      (roles.data ?? []).map((role) => {
        const companyName = companyNames.get(role.companyId)
        return {
          label: companyName ? `${role.name} — ${companyName}` : role.name,
          value: String(role.id),
        }
      }),
    [roles.data, companyNames],
  )

  /** The role currently picked, for the preview of what it implies. */
  const selectedRole = useMemo(
    () => (roles.data ?? []).find((role) => String(role.id) === roleId) ?? null,
    [roles.data, roleId],
  )

  const selectedRoleCompany = selectedRole
    ? (companyNames.get(selectedRole.companyId) ?? null)
    : null

  const setRoleId = (value: string) =>
    setValue('roleId', value, { shouldValidate: true, shouldDirty: true })

  const setStatus = (value: string) =>
    setValue('status', value === 'inactive' ? 'inactive' : 'active', {
      shouldValidate: true,
      shouldDirty: true,
    })

  const goToList = () => navigate({ to: '/administration/admin-user' })

  const onSubmit = handleSubmit((values) => {
    if (isEdit) {
      const record = detail.data
      // The record is what decides whether the role travels, so an edit can't
      // be submitted before it has loaded.
      if (!record) return

      updateUser.mutate(
        { values, record },
        {
          onSuccess: (updated) => {
            toast.success('User updated')
            // A role change or a password reset ends every session the user
            // holds, and permissions are minted at login — so the change only
            // truly lands when they sign in again. Say so rather than leaving
            // them wondering why nothing moved.
            if (updated.sessionRevoked) {
              toast.info(
                'They have been signed out — the change takes effect at their next sign-in.',
              )
            }
            goToList()
          },
          onError: (err) =>
            toast.error(getApiErrorMessage(err, "Couldn't update the user.")),
        },
      )
      return
    }

    createUser.mutate(values, {
      onSuccess: () => {
        toast.success('User created')
        goToList()
      },
      // An email or mobile number already in use answers 409 with a message
      // that deliberately doesn't say where the clash is — surface it as-is.
      onError: (err) => toast.error(getApiErrorMessage(err, "Couldn't create the user.")),
    })
  })

  return {
    form,
    errors: form.formState.errors,
    onSubmit,
    isEdit,
    goToList,

    /** The user being edited — undefined while loading, and in create mode. */
    user: detail.data,
    isSelf,
    isOwner,

    /* Role & access */
    roleId,
    setRoleId,
    roleOptions,
    selectedRole,
    selectedRoleCompany,
    isRolesLoading: roles.isLoading,
    /** No role can be assigned until one has been authored for a company. */
    hasNoRoles: !roles.isLoading && roleOptions.length === 0,
    /** The API refuses to re-role the caller's own row, and an owner holds none. */
    isRoleLocked: isSelf || isOwner,

    /* Credentials */
    status,
    setStatus,

    isPending: isEdit ? updateUser.isPending : createUser.isPending,
    isLoading: isEdit ? detail.isLoading : roles.isLoading,
    isError: isEdit
      ? detail.isError || (!detail.isLoading && !detail.data)
      : roles.isError,
    loadError: isEdit ? detail.error : roles.error,
  }
}
