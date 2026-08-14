import { z } from 'zod'
import { permissionModuleSchema } from '@/features/permissions'
import { recordNameField } from '@/lib/validation'

/**
 * The API's own limits, so the form refuses what the endpoint would anyway —
 * with a message on the field rather than a 400 after a round trip.
 */
export const MAX_ROLE_NAME = 100
export const MAX_ROLE_PERMISSIONS = 300

/**
 * The Create / Edit Role form.
 *
 * **A role carries the permission codes and nothing else.** Access level,
 * company reach and the Talk grants used to live here; they are properties of
 * the PERSON now and are edited on the Admin User form — one role ticked once
 * serves every office. Sending `access_level` / `company_ids` / `talk_enabled` /
 * `talk_access` here is IGNORED rather than rejected, so a stale field would
 * fail silently.
 *
 * `permissionCodes` is the COMPLETE ticked set — the API replaces what's stored
 * rather than merging, so the form always holds the whole selection. The
 * `requires` closure is maintained as the user ticks (see `lib/permission-tree`),
 * which is why nothing here re-checks it: by the time values reach the resolver
 * the set is already consistent.
 */
export const roleSchema = z.object({
  name: recordNameField('the role name', { max: MAX_ROLE_NAME }),
  permissionCodes: z
    .array(z.string())
    .min(1, 'Enable at least one permission')
    .max(
      MAX_ROLE_PERMISSIONS,
      `A role cannot carry more than ${MAX_ROLE_PERMISSIONS} permissions`,
    ),
})

export type RoleFormValues = z.infer<typeof roleSchema>

/* ── Responses ─────────────────────────────────────────────────────────────── */

/**
 * `GET /user/roles/:id` — the role plus the catalog it's ticked against. Parsed
 * as leniently as `my-role` is: the catalog grows server-side, and a missing
 * display field must never throw away the whole tree.
 *
 * `{ id, company_id, name, permission_codes, is_system, created_at }` is the
 * whole record — the reach was moved to the user and no longer comes back here.
 */
export const roleResponseSchema = z.object({
  id: z.number(),
  company_id: z.number().nullish(),
  name: z.string(),
  permission_codes: z.array(z.string()).default([]),
  is_system: z.boolean().default(false),
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
 * Hand-written rather than zod: this type is exactly what may be sent.
 *
 * The reach keys are deliberately absent. `access_level`, `company_ids`,
 * `talk_enabled` and `talk_access` are properties of the user now; sent here
 * they are IGNORED rather than rejected, which would save a role quietly
 * granting no reach at all.
 */
export interface RolePayload {
  company_id: number
  name: string
  permission_codes: string[]
}

/** PATCH takes the same body minus the owning company, which is fixed. */
export type RoleUpdatePayload = Omit<RolePayload, 'company_id'>
