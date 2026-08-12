import { z } from 'zod'
import {
  companyRefResponseSchema,
  permissionModuleSchema,
  talkGrantResponseSchema,
} from '@/features/permissions'
import { recordNameField } from '@/lib/validation'

/**
 * The API's own limits, so the form refuses what the endpoint would anyway —
 * with a message on the field rather than a 400 after a round trip.
 */
export const MAX_ROLE_NAME = 100
export const MAX_ROLE_PERMISSIONS = 300
export const MAX_ROLE_COMPANIES = 200
export const MAX_ROLE_TALK_GRANTS = 500
export const MAX_ROLE_TALK_DEPARTMENTS = 500

/**
 * One Talk grant row on the form — a company and the departments inside it the
 * role may talk to.
 */
export const roleTalkGrantSchema = z.object({
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
      MAX_ROLE_TALK_DEPARTMENTS,
      `A grant cannot name more than ${MAX_ROLE_TALK_DEPARTMENTS} departments`,
    ),
})
export type RoleTalkGrantFormValues = z.infer<typeof roleTalkGrantSchema>

/**
 * The Create / Edit Role form.
 *
 * `permissionCodes` is the COMPLETE ticked set — the API replaces what's stored
 * rather than merging, so the form always holds the whole selection. The
 * `requires` closure is maintained as the user ticks (see `lib/permission-tree`),
 * which is why nothing here re-checks it: by the time values reach the resolver
 * the set is already consistent.
 */
export const roleSchema = z
  .object({
    name: recordNameField('the role name', { max: MAX_ROLE_NAME }),
    permissionCodes: z
      .array(z.string())
      .min(1, 'Enable at least one permission')
      .max(MAX_ROLE_PERMISSIONS, `A role cannot carry more than ${MAX_ROLE_PERMISSIONS} permissions`),
    accessLevel: z.enum(['GLOBAL', 'COMPANY']),
    companyIds: z.array(z.number().int().positive()),
    talkEnabled: z.boolean(),
    talkAccess: z.array(roleTalkGrantSchema),
  })
  .superRefine((values, ctx) => {
    // GLOBAL ignores the list entirely (the server stores it empty), so only a
    // COMPANY-level role has to name anyone.
    if (values.accessLevel === 'COMPANY' && values.companyIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['companyIds'],
        message: 'Pick at least one company, or give the role access to all of them',
      })
    }

    if (values.companyIds.length > MAX_ROLE_COMPANIES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['companyIds'],
        message: `A role cannot reach more than ${MAX_ROLE_COMPANIES} companies`,
      })
    }

    // Same shape on the Talk side: the switch is the gate, the grants are what
    // it opens, and one without the other is rejected by the endpoint.
    if (values.talkEnabled && values.talkAccess.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['talkAccess'],
        message: 'Add at least one Talk grant, or turn Talk off',
      })
    }

    if (values.talkAccess.length > MAX_ROLE_TALK_GRANTS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['talkAccess'],
        message: `A role cannot carry more than ${MAX_ROLE_TALK_GRANTS} Talk grants`,
      })
    }

    // One entry PER COMPANY: the endpoint merges a company sent twice rather
    // than replacing it, so a second row for the same company silently changes
    // what the first one meant. Caught here instead.
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
  })

export type RoleFormValues = z.infer<typeof roleSchema>

/* ── Responses ─────────────────────────────────────────────────────────────── */

/**
 * `GET /user/roles/:id` — the role plus the catalog it's ticked against. Parsed
 * as leniently as `my-role` is: the catalog grows server-side, and a missing
 * display field must never throw away the whole tree.
 *
 * The reach comes back NAMED — `company_ids` is `{ id, company_name }` and each
 * Talk entry carries its company name plus a `departments` list — so nothing on
 * screen needs a second call to label a chip.
 */
export const roleResponseSchema = z.object({
  id: z.number(),
  company_id: z.number().nullish(),
  name: z.string(),
  permission_codes: z.array(z.string()).default([]),
  is_system: z.boolean().default(false),
  access_level: z.enum(['GLOBAL', 'COMPANY']).default('COMPANY'),
  company_ids: z.array(companyRefResponseSchema).default([]),
  talk_enabled: z.boolean().default(false),
  talk_access: z.array(talkGrantResponseSchema).default([]),
  modules: z.array(permissionModuleSchema).default([]),
})
export type RoleResponse = z.infer<typeof roleResponseSchema>

/** One row of `GET /user/roles` — the codes, `permission_count` and audit. */
export const roleListRowResponseSchema = z.object({
  id: z.number(),
  company_id: z.number().nullish(),
  name: z.string(),
  permission_codes: z.array(z.string()).default([]),
  is_system: z.boolean().default(false),
  access_level: z.enum(['GLOBAL', 'COMPANY']).default('COMPANY'),
  talk_enabled: z.boolean().default(false),
  permission_count: z.number().default(0),
  created_at: z.string().nullish(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
})
export type RoleListRowResponse = z.infer<typeof roleListRowResponseSchema>

export const rolesResponseSchema = z.object({
  items: z.array(roleListRowResponseSchema),
  total: z.number(),
})

/** `GET /user/roles/assignable-permissions` — the builder catalog, nothing ticked. */
export const assignablePermissionsResponseSchema = z.object({
  permission_codes: z.array(z.string()).default([]),
  modules: z.array(permissionModuleSchema).default([]),
})
export type AssignablePermissionsResponse = z.infer<
  typeof assignablePermissionsResponseSchema
>

/* ── Request bodies ────────────────────────────────────────────────────────── */

/**
 * Hand-written rather than zod: the endpoint rejects unknown keys, so this type
 * is exactly what may be sent.
 */
export interface RoleTalkAccessPayload {
  company_id: number
  /**
   * EMPTY (or omitted) means the WHOLE company — every department, present and
   * future — never "none". Each must belong to the company named alongside it.
   */
  department_ids: number[]
}

export interface RolePayload {
  company_id: number
  name: string
  permission_codes: string[]
  access_level: 'GLOBAL' | 'COMPANY'
  company_ids: number[]
  talk_enabled: boolean
  /** One entry PER COMPANY — repeating a company merges rather than replaces. */
  talk_access: RoleTalkAccessPayload[]
}

/** PATCH takes the same body minus the owning company, which is fixed. */
export type RoleUpdatePayload = Omit<RolePayload, 'company_id'>
