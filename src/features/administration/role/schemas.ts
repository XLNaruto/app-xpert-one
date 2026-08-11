import { z } from 'zod'
import { permissionModuleSchema } from '@/features/permissions'

/**
 * The API's own limits, so the form refuses what the endpoint would anyway —
 * with a message on the field rather than a 400 after a round trip.
 */
export const MAX_ROLE_NAME = 100
export const MAX_ROLE_PERMISSIONS = 300
export const MAX_ROLE_COMPANIES = 200
export const MAX_ROLE_TALK_GRANTS = 500

/** One Talk grant row on the form. */
export const roleTalkGrantSchema = z.object({
  /** Held as a string: it comes from a `<Combobox>`, which speaks strings. */
  companyId: z.string().trim().min(1, 'Pick a company'),
  /** Empty means the whole company. */
  departmentId: z.string().trim(),
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
    name: z
      .string()
      .trim()
      .min(1, 'Role name is required')
      .max(MAX_ROLE_NAME, `Role name cannot exceed ${MAX_ROLE_NAME} characters`),
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

    // The same company twice — once for the whole company and once for one of its
    // departments — is contradictory, and two identical rows are a mistake.
    const seen = new Set<string>()
    values.talkAccess.forEach((grant, index) => {
      const key = `${grant.companyId}:${grant.departmentId}`
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['talkAccess', index, 'companyId'],
          message: 'This grant is already on the list',
        })
      }
      seen.add(key)
    })
  })

export type RoleFormValues = z.infer<typeof roleSchema>

/* ── Responses ─────────────────────────────────────────────────────────────── */

/** One Talk grant as stored. */
const talkAccessResponseSchema = z.object({
  company_id: z.number(),
  department_id: z.number().nullish(),
})

/**
 * `GET /user/roles/:id` — the role plus the catalog it's ticked against. Parsed
 * as leniently as `my-role` is: the catalog grows server-side, and a missing
 * display field must never throw away the whole tree.
 */
export const roleResponseSchema = z.object({
  id: z.number(),
  company_id: z.number().nullish(),
  name: z.string(),
  permission_codes: z.array(z.string()).default([]),
  is_system: z.boolean().default(false),
  access_level: z.enum(['GLOBAL', 'COMPANY']).default('COMPANY'),
  company_ids: z.array(z.number()).default([]),
  talk_enabled: z.boolean().default(false),
  talk_access: z.array(talkAccessResponseSchema).default([]),
  modules: z.array(permissionModuleSchema).default([]),
})
export type RoleResponse = z.infer<typeof roleResponseSchema>

/** One row of `GET /user/roles` — no codes, but `permission_count` and audit. */
export const roleListRowResponseSchema = z.object({
  id: z.number(),
  company_id: z.number().nullish(),
  name: z.string(),
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
export interface RolePayload {
  company_id: number
  name: string
  permission_codes: string[]
  access_level: 'GLOBAL' | 'COMPANY'
  company_ids: number[]
  talk_enabled: boolean
  talk_access: { company_id: number; department_id: number | null }[]
}

/** PATCH takes the same body minus the owning company, which is fixed. */
export type RoleUpdatePayload = Omit<RolePayload, 'company_id'>
