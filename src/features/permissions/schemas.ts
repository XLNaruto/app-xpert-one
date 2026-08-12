import { z } from 'zod'

/**
 * `GET /user/my-role`. Parsed leniently on purpose: the permission catalog
 * grows server-side, so unknown extra fields are ignored and every display-only
 * field is optional — a missing `icon` or `description` must never throw away
 * the whole payload (and with it the entire menu).
 */

/** One checkbox under a menu node. */
export const permissionActionSchema = z.object({
  permission: z.string(),
  label: z.string().default(''),
  icon: z.string().nullish(),
  description: z.string().nullish(),
  granted: z.boolean().default(false),
  /**
   * The other codes this one doesn't work without. Only the role builder acts on
   * it — `my-role` describes a set already saved, where the dependencies are
   * satisfied by construction.
   */
  requires: z.array(z.string()).default([]),
})

/** The recursive menu node — `children` nests to whatever depth the catalog has. */
export interface PermissionModuleResponse {
  key: string
  label: string
  panel: 'employee' | 'user' | 'admin'
  panel_label?: string | null
  icon?: string | null
  permissions: string[]
  granted: boolean
  actions: z.infer<typeof permissionActionSchema>[]
  children: PermissionModuleResponse[]
}

/** One node of the catalog as the API sends it, for consumers that hold a raw tree. */
export type PermissionActionResponse = z.infer<typeof permissionActionSchema>

export const permissionModuleSchema: z.ZodType<PermissionModuleResponse> = z.lazy(() =>
  z.object({
    key: z.string(),
    label: z.string().default(''),
    panel: z.enum(['employee', 'user', 'admin']).default('user'),
    panel_label: z.string().nullish(),
    icon: z.string().nullish(),
    permissions: z.array(z.string()).default([]),
    granted: z.boolean().default(false),
    actions: z.array(permissionActionSchema).default([]),
    children: z.array(permissionModuleSchema).default([]),
  }),
)

/**
 * A company named on a role's reach. Both `my-role` and `GET /user/roles/:id`
 * answer with `{ id, company_name }` rather than a bare id, so a chip can be
 * labelled without a second call.
 */
export const companyRefResponseSchema = z.object({
  id: z.number(),
  company_name: z.string().default(''),
})

/**
 * One Talk grant — a COMPANY with its departments nested. There is one entry per
 * company, and an EMPTY `departments` means the whole company (every department,
 * present and future), never "none".
 */
export const talkGrantResponseSchema = z.object({
  company_id: z.number(),
  company_name: z.string().default(''),
  departments: z
    .array(
      z.object({
        department_id: z.number(),
        department_name: z.string().default(''),
      }),
    )
    .default([]),
})

export type CompanyRefResponse = z.infer<typeof companyRefResponseSchema>
export type TalkGrantResponse = z.infer<typeof talkGrantResponseSchema>

export const myRoleResponseSchema = z.object({
  user_id: z.number(),
  role_id: z.number().nullish(),
  role_name: z.string().nullish(),
  is_owner: z.boolean().default(false),
  permission_codes: z.array(z.string()).default([]),
  modules: z.array(permissionModuleSchema).default([]),
  access_level: z.enum(['GLOBAL', 'COMPANY']).default('COMPANY'),
  company_ids: z.array(companyRefResponseSchema).default([]),
  talk_enabled: z.boolean().default(false),
  talk_access: z.array(talkGrantResponseSchema).default([]),
  access: z
    .object({
      web: z.boolean().default(false),
      app: z.boolean().default(false),
      talk: z.boolean().default(false),
      attendance: z.boolean().default(false),
    })
    .default({ web: false, app: false, talk: false, attendance: false }),
})

export type MyRoleResponse = z.infer<typeof myRoleResponseSchema>
