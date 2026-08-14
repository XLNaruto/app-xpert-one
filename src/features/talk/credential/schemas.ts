import { z } from 'zod'
import { emailField } from '@/lib/validation'

/**
 * The API's own limits, so the form refuses what the endpoint would anyway —
 * with a message on the field rather than a 400 after a round trip.
 */
export const MAX_TALK_CREDENTIAL_EMAIL = 255
export const MIN_TALK_CREDENTIAL_PASSWORD = 8
export const MAX_TALK_CREDENTIAL_PASSWORD = 200
export const MAX_TALK_CREDENTIAL_COMPANIES = 200
export const MAX_TALK_CREDENTIAL_DEPARTMENTS = 500

/** The two states a Talk login can be in. */
export const talkCredentialStatusSchema = z.enum(['active', 'inactive'])
export type TalkCredentialStatus = z.infer<typeof talkCredentialStatusSchema>

/**
 * One department-grant row on the form — a company and the departments inside
 * it this credential reaches.
 *
 * The rows are a UI grouping only: the endpoint takes a FLAT `department_ids`
 * and resolves each id to the company it belongs to. They're grouped here
 * because the department picker is per company (`GET /user/departments` takes a
 * `company_id`), and because a person reads "Support, in Liger" far better than
 * a bare list of department ids from four different companies.
 */
export const departmentGrantFormSchema = z.object({
  /** Held as a string: it comes from a `<Combobox>`, which speaks strings. */
  companyId: z.string().trim().min(1, 'Pick a company'),
  /** Same, and never empty — an empty row means nothing to the flat list. */
  departmentIds: z.array(z.string()),
})
export type DepartmentGrantFormValues = z.infer<typeof departmentGrantFormSchema>

/**
 * The Issue / Edit Talk Credential form.
 *
 * Built per mode rather than declared once, because two fields change meaning
 * with the record being edited:
 *
 * - **A password is required to issue a credential and optional to edit one.**
 *   On edit a blank box means "leave the credential alone", which is exactly how
 *   the PATCH reads an omitted key — so the field can't carry a `min(8)` in both
 *   modes. Filling it ROTATES the password.
 * - **The employee is picked once and never again.** Re-pointing a credential at
 *   someone else would hand them the first person's conversation history under
 *   an address their colleagues already know, so the endpoint has no field for
 *   it and the form asks for one on create alone.
 *
 * The REACH is two INDEPENDENT lists. `companyIds` grants whole companies —
 * every department in each, present and future — and the department rows grant
 * single departments. A department may be granted without its company appearing
 * in `companyIds`, and the two need not agree.
 */
export function talkCredentialSchema({
  requirePassword,
  requireEmployee,
}: {
  requirePassword: boolean
  requireEmployee: boolean
}) {
  const password = z
    .string()
    .max(MAX_TALK_CREDENTIAL_PASSWORD, `Cannot exceed ${MAX_TALK_CREDENTIAL_PASSWORD} characters`)

  return z
    .object({
      /**
       * Held as a string: it comes from a `<Combobox>`. Only asked for on
       * create — see the note above.
       */
      employeeId: requireEmployee
        ? z.string().trim().min(1, 'Pick the employee this credential is for')
        : z.string().trim(),
      /** The Talk login itself — unique across the whole PLATFORM, not just this account. */
      email: emailField({ required: true, max: MAX_TALK_CREDENTIAL_EMAIL }),
      password,
      /**
       * FRONT-END ONLY — it is never sent. The endpoint takes a single
       * `password`; this exists so a typo can't quietly become someone's login,
       * and the mappers drop it on the way out.
       */
      confirmPassword: password,
      status: talkCredentialStatusSchema,

      /* ── Reach: two independent lists ── */
      companyIds: z.array(z.number().int().positive()),
      departmentGrants: z.array(departmentGrantFormSchema),
    })
    .superRefine((values, ctx) => {
      // The reach rules run FIRST: the password branch below returns early, and
      // a missing password must not hide a reach error on the same submit.

      if (values.companyIds.length > MAX_TALK_CREDENTIAL_COMPANIES) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['companyIds'],
          message: `A credential cannot reach more than ${MAX_TALK_CREDENTIAL_COMPANIES} companies`,
        })
      }

      // One row PER COMPANY. Two rows for one company would flatten into a
      // single list anyway, so the second silently swallows the first.
      const seen = new Set<string>()
      values.departmentGrants.forEach((grant, index) => {
        if (seen.has(grant.companyId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['departmentGrants', index, 'companyId'],
            message: 'This company already has a row — add its departments there',
          })
        }
        seen.add(grant.companyId)

        // Unlike the admin-user Talk grants, an empty row is NOT "the whole
        // company" — that's what the company list above is for. It's a row that
        // would travel as nothing at all, so it's caught rather than dropped.
        if (grant.companyId && grant.departmentIds.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['departmentGrants', index, 'departmentIds'],
            message: 'Pick at least one department, or grant the whole company above',
          })
        }
      })

      const departmentCount = new Set(
        values.departmentGrants.flatMap((grant) => grant.departmentIds),
      ).size
      if (departmentCount > MAX_TALK_CREDENTIAL_DEPARTMENTS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['departmentGrants'],
          message: `A credential cannot name more than ${MAX_TALK_CREDENTIAL_DEPARTMENTS} departments`,
        })
      }

      // Issuing a login without a credential is meaningless; on edit, blank is
      // the ordinary case and means "unchanged".
      if (requirePassword && !values.password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'Please enter a password',
        })
        return
      }

      if (values.password && values.password.length < MIN_TALK_CREDENTIAL_PASSWORD) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: `Password must be at least ${MIN_TALK_CREDENTIAL_PASSWORD} characters`,
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

export type TalkCredentialFormValues = z.infer<ReturnType<typeof talkCredentialSchema>>

/* ── Responses ─────────────────────────────────────────────────────────────── */

/** A whole-company grant, named by the API so no chip needs a second call. */
export const talkCredentialCompanyResponseSchema = z.object({
  id: z.number(),
  company_name: z.string(),
})

/** A department grant, named, each carrying the company it belongs to. */
export const talkCredentialDepartmentResponseSchema = z.object({
  id: z.number(),
  department_name: z.string(),
  company_id: z.number(),
})

/**
 * One credential, as every endpoint on this resource answers it.
 *
 * The two halves are answered by different reads and both are parsed leniently
 * here, defaulted by the mapper rather than modelled as two types:
 *
 * - the AUDIT block comes back on the LIST alone,
 * - the named REACH (`companies` / `departments`) on GET-by-id, POST and PATCH,
 *   because resolving those names costs joins no list column would show.
 *
 * There is no `password` and never will be: it's stored hashed, so a screen that
 * needs a new one rotates it via PATCH.
 */
export const talkCredentialResponseSchema = z.object({
  id: z.number(),
  /** Null once the employee has been deleted — the credential outlives them. */
  employee_id: z.number().nullish(),
  employee_name: z.string().nullish(),
  email: z.string(),
  status: z.string().default('active'),
  /** Null until the credential's first Talk sign-in. */
  last_login_at: z.string().nullish(),
  companies: z.array(talkCredentialCompanyResponseSchema).default([]),
  departments: z.array(talkCredentialDepartmentResponseSchema).default([]),
  created_at: z.string().nullish(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
})
export type TalkCredentialResponse = z.infer<typeof talkCredentialResponseSchema>

export const talkCredentialsResponseSchema = z.object({
  items: z.array(talkCredentialResponseSchema),
  total: z.number(),
})

/* ── Request bodies ────────────────────────────────────────────────────────── */

/**
 * Hand-written rather than zod: the endpoint rejects unknown keys, so this type
 * is exactly what may be sent.
 *
 * `email` IS the login — there is no separate username — and it is unique across
 * every Talk credential on the PLATFORM (409 otherwise). One employee may hold
 * only one credential, so a second create naming the same one is a 409 too.
 */
export interface TalkCredentialPayload {
  employee_id: number
  email: string
  password: string
  /** WHOLE-COMPANY grants — every department in each, present and future. */
  company_ids: number[]
  /** Single-department grants, each resolved server-side to its own company. */
  department_ids: number[]
}

/**
 * PATCH is a genuine partial: an omitted key leaves the field untouched, which
 * is what carries "keep the current password".
 *
 * No `employee_id` — the endpoint has no such field (see the schema note above).
 * The two reach lists REPLACE what is stored when sent and are re-validated
 * TOGETHER whenever either arrives, so they travel together or not at all —
 * which is what the form does.
 */
export type TalkCredentialUpdatePayload = Partial<
  Omit<TalkCredentialPayload, 'employee_id'>
> & {
  status?: TalkCredentialStatus
}
