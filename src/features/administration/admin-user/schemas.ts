import { z } from 'zod'
import { companyRefResponseSchema, talkGrantResponseSchema } from '@/features/permissions'
import { emailField, mobileField, personNameField } from '@/lib/validation'

/**
 * The API's own limits, so the form refuses what the endpoint would anyway —
 * with a message on the field rather than a 400 after a round trip.
 */
export const MAX_ADMIN_USER_NAME = 100
export const MAX_ADMIN_USER_EMAIL = 255
export const MIN_ADMIN_USER_PASSWORD = 8
export const MAX_ADMIN_USER_PASSWORD = 200
export const MAX_ADMIN_USER_COMPANIES = 200
export const MAX_ADMIN_USER_TALK_GRANTS = 500
export const MAX_ADMIN_USER_TALK_DEPARTMENTS = 500

/** The two states a user's login can be in. */
export const adminUserStatusSchema = z.enum(['active', 'inactive'])

/**
 * One Talk grant row on the form — a company and the departments inside it this
 * user may talk to.
 */
export const talkGrantFormSchema = z.object({
  /** Held as a string: it comes from a `<Combobox>`, which speaks strings. */
  companyId: z.string().trim().min(1, 'Pick a company'),
  /**
   * The departments picked inside that company, as strings for the same reason.
   * EMPTY means the WHOLE company — every department, present and future —
   * never "none", which is exactly how the endpoint reads it.
   */
  departmentIds: z
    .array(z.string())
    .max(
      MAX_ADMIN_USER_TALK_DEPARTMENTS,
      `A grant cannot name more than ${MAX_ADMIN_USER_TALK_DEPARTMENTS} departments`,
    ),
})
export type TalkGrantFormValues = z.infer<typeof talkGrantFormSchema>

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
 * What the user may DO still comes entirely from `roleId`, and the role decides
 * their OWN company. How far they REACH is a different question and lives here:
 * `accessLevel` / `companyIds` are the companies they can act in, and
 * `talkEnabled` / `talkAccess` are where they may chat. Don't conflate the two
 * — the role's company is not the reach.
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

      /* ── Reach: what this PERSON can get at, whatever their role says ── */
      accessLevel: z.enum(['GLOBAL', 'COMPANY']),
      companyIds: z.array(z.number().int().positive()),
      talkEnabled: z.boolean(),
      talkAccess: z.array(talkGrantFormSchema),
    })
    .superRefine((values, ctx) => {
      // The reach rules run FIRST: the password branch below returns early, and
      // a missing password must not hide a scope error on the same submit.

      // GLOBAL ignores the list entirely (the server stores it empty), so only
      // a COMPANY-level user has to name anyone.
      if (values.accessLevel === 'COMPANY' && values.companyIds.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['companyIds'],
          message: 'Select at least one company for company-specific access',
        })
      }

      if (values.companyIds.length > MAX_ADMIN_USER_COMPANIES) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['companyIds'],
          message: `A user cannot reach more than ${MAX_ADMIN_USER_COMPANIES} companies`,
        })
      }

      // Same shape on the Talk side: the switch is the gate, the grants are
      // what it opens, and one without the other is rejected by the endpoint.
      if (values.talkEnabled && values.talkAccess.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['talkAccess'],
          message: 'Select at least one Talk company when Talk access is enabled',
        })
      }

      if (values.talkAccess.length > MAX_ADMIN_USER_TALK_GRANTS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['talkAccess'],
          message: `A user cannot carry more than ${MAX_ADMIN_USER_TALK_GRANTS} Talk grants`,
        })
      }

      // One entry PER COMPANY: the endpoint merges a company sent twice rather
      // than replacing it, so a second row for the same company silently
      // changes what the first one meant. Caught here instead.
      const seen = new Set<string>()
      values.talkAccess.forEach((grant, index) => {
        if (seen.has(grant.companyId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['talkAccess', index, 'companyId'],
            message: 'This company already has a grant — add its departments to that row',
          })
        }
        seen.add(grant.companyId)
      })

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
 *
 * The reach works the other way round: GET-by-id, POST and PATCH carry it in
 * full, with `company_ids` and `talk_access` RESOLVED TO NAMES so a chip never
 * needs a second call. The LIST carries only the two scalars — `access_level`
 * and `talk_enabled` — because resolving the names costs two joins per row, so
 * the named lists default empty there rather than being missing data.
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
  /** An owner always reports `GLOBAL` with empty lists — they reach everything. */
  access_level: z.enum(['GLOBAL', 'COMPANY']).default('COMPANY'),
  /** Named. Absent on a list row; empty under `GLOBAL` means EVERY company. */
  company_ids: z.array(companyRefResponseSchema).default([]),
  talk_enabled: z.boolean().default(false),
  /** Named. Absent on a list row; an entry's empty `departments` is the whole company. */
  talk_access: z.array(talkGrantResponseSchema).default([]),
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

/**
 * `GET /user/admin-users/assignable-roles` — the form's role dropdown.
 *
 * A role is the permission codes and the company it belongs to; it carries no
 * `access_level` or `talk_enabled` any more, because reach is per USER.
 */
export const assignableRoleResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  company_id: z.number(),
})
export type AssignableRoleResponse = z.infer<typeof assignableRoleResponseSchema>

export const assignableRolesResponseSchema = z.object({
  items: z.array(assignableRoleResponseSchema),
})

/* ── Request bodies ────────────────────────────────────────────────────────── */

/**
 * One Talk grant as it travels — a company with the departments inside it.
 *
 * EMPTY (or omitted) `department_ids` means the WHOLE company — every
 * department, present and future — never "none". Each department must belong to
 * the company named alongside it (400 otherwise), and anything outside the
 * account answers 404.
 */
export interface TalkAccessPayload {
  company_id: number
  department_ids: number[]
}

/**
 * Hand-written rather than zod: the endpoint rejects unknown keys, so this type
 * is exactly what may be sent. No `company_id` — the user's OWN company comes
 * from the role. The four reach keys below are a different thing entirely: the
 * companies this person can act in.
 */
export interface AdminUserPayload {
  first_name: string
  last_name: string
  email: string
  /** Digits only; the endpoint compares numbers as stored. */
  mobile_number: string
  role_id: number
  password: string
  access_level: 'GLOBAL' | 'COMPANY'
  /** Required non-empty under `COMPANY`; sent as `[]` under `GLOBAL`. */
  company_ids: number[]
  talk_enabled: boolean
  /** Required non-empty when `talk_enabled`. One entry PER COMPANY. */
  talk_access: TalkAccessPayload[]
}

/**
 * PATCH is a genuine partial: an omitted key leaves the field untouched, which
 * is what carries "keep the current password" and "don't touch the role".
 *
 * The four reach keys are the exception to that partial-ness — **any one of
 * them re-validates all four**, with whatever is omitted filled in from what is
 * stored. So they travel together or not at all, which is what the form does.
 */
export type AdminUserUpdatePayload = Partial<AdminUserPayload> & {
  status?: AdminUserStatus
}
