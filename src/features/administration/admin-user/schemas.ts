import { z } from 'zod'
import { emailField, mobileField, personNameField } from '@/lib/validation'

/**
 * The API's own limits, so the form refuses what the endpoint would anyway —
 * with a message on the field rather than a 400 after a round trip.
 */
export const MAX_ADMIN_USER_NAME = 100
export const MAX_ADMIN_USER_EMAIL = 255
export const MIN_ADMIN_USER_PASSWORD = 8
export const MAX_ADMIN_USER_PASSWORD = 200

/** The two states a user's login can be in. */
export const adminUserStatusSchema = z.enum(['active', 'inactive'])

/**
 * The Create / Edit User form.
 *
 * Built per mode rather than declared once, because two fields change meaning
 * with the record being edited:
 *
 * - **A password is required to create a login and optional to edit one.** On
 *   edit a blank box means "leave the credential alone", which is exactly how
 *   the PATCH reads an omitted key — so the field can't carry a `min(8)` in
 *   both modes.
 * - **A role is required except on an account OWNER**, who holds none at all.
 *   Demanding one there would block an owner's rename behind a pick the endpoint
 *   would refuse anyway.
 *
 * There is no permission or company field here on purpose. Everything about
 * what the user may DO comes from `roleId`, and their company is taken from
 * that role — the endpoint rejects a `company_id` outright.
 */
export function adminUserSchema({
  requirePassword,
  requireRole = true,
}: {
  requirePassword: boolean
  requireRole?: boolean
}) {
  const password = z
    .string()
    .max(MAX_ADMIN_USER_PASSWORD, `Cannot exceed ${MAX_ADMIN_USER_PASSWORD} characters`)

  return z
    .object({
      firstName: personNameField('the first name', { max: MAX_ADMIN_USER_NAME }),
      lastName: personNameField('the last name', { max: MAX_ADMIN_USER_NAME }),
      /** The login itself — unique across the whole platform, not just this account. */
      email: emailField({ required: true, max: MAX_ADMIN_USER_EMAIL }),
      mobileNumber: mobileField({ required: true }),
      /** Held as a string: it comes from a `<Combobox>`, which speaks strings. */
      roleId: requireRole ? z.string().trim().min(1, 'Pick a role') : z.string().trim(),
      password,
      /**
       * FRONT-END ONLY — it is never sent. The endpoint takes a single
       * `password`; this exists so a typo can't quietly become someone's login,
       * and the mappers drop it on the way out.
       */
      confirmPassword: password,
      status: adminUserStatusSchema,
    })
    .superRefine((values, ctx) => {
      // Creating a login without a credential is meaningless; on edit, blank is
      // the ordinary case and means "unchanged".
      if (requirePassword && !values.password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'Please enter a password',
        })
        return
      }

      if (values.password && values.password.length < MIN_ADMIN_USER_PASSWORD) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: `Password must be at least ${MIN_ADMIN_USER_PASSWORD} characters`,
        })
      }

      // Only asked for when a password is actually being set — an edit that
      // leaves the box empty has nothing to confirm.
      if (values.password && values.confirmPassword !== values.password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['confirmPassword'],
          message: 'Passwords do not match',
        })
      }
    })
}

export type AdminUserFormValues = z.infer<ReturnType<typeof adminUserSchema>>
export type AdminUserStatus = z.infer<typeof adminUserStatusSchema>

/* ── Responses ─────────────────────────────────────────────────────────────── */

/**
 * One user, as every endpoint on this resource answers it.
 *
 * The audit block only comes back on the LIST, so it's parsed leniently here and
 * defaulted by the mapper — a detail read isn't missing data, it just answers a
 * narrower record. `session_revoked` likewise appears on PATCH alone.
 */
export const adminUserResponseSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  name: z.string(),
  email: z.string(),
  mobile_number: z.string().nullish(),
  role_id: z.number().nullish(),
  /** Null for an account owner, who holds no role. */
  role_name: z.string().nullish(),
  /** Taken from the role. Null for an owner, who belongs to no one company. */
  company_id: z.number().nullish(),
  /** True when the user holds no role — the account's own owner. */
  is_owner: z.boolean().default(false),
  status: z.string().default('active'),
  created_at: z.string().nullish(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
  /** PATCH only: true when this edit ended a live session. */
  session_revoked: z.boolean().nullish(),
})
export type AdminUserResponse = z.infer<typeof adminUserResponseSchema>

export const adminUsersResponseSchema = z.object({
  items: z.array(adminUserResponseSchema),
  total: z.number(),
})

/** `GET /user/admin-users/assignable-roles` — the form's role dropdown. */
export const assignableRoleResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  company_id: z.number(),
  access_level: z.enum(['GLOBAL', 'COMPANY']).default('COMPANY'),
  talk_enabled: z.boolean().default(false),
})
export type AssignableRoleResponse = z.infer<typeof assignableRoleResponseSchema>

export const assignableRolesResponseSchema = z.object({
  items: z.array(assignableRoleResponseSchema),
})

/* ── Request bodies ────────────────────────────────────────────────────────── */

/**
 * Hand-written rather than zod: the endpoint rejects unknown keys, so this type
 * is exactly what may be sent. No `company_id` — it comes from the role.
 */
export interface AdminUserPayload {
  first_name: string
  last_name: string
  email: string
  /** Digits only; the endpoint compares numbers as stored. */
  mobile_number: string
  role_id: number
  password: string
}

/**
 * PATCH is a genuine partial: an omitted key leaves the field untouched, which
 * is what carries "keep the current password" and "don't touch the role".
 */
export type AdminUserUpdatePayload = Partial<AdminUserPayload> & {
  status?: AdminUserStatus
}
