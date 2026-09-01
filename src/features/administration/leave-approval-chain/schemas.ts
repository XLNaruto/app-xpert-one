import { z } from 'zod'

/** One level of the chain as the API returns it, with its coverage counted. */
export const leaveApprovalLevelResponseSchema = z.object({
  /** 1-based position. Index 0 of the array decides first. */
  level: z.number(),
  role_name: z.string(),
  /** Live users holding a role of this name anywhere in the account. */
  user_count: z.number(),
  /** How many of the account's companies those users can reach. */
  companies_covered: z.number(),
})

export type LeaveApprovalLevelResponse = z.infer<typeof leaveApprovalLevelResponseSchema>

/**
 * `GET /user/leave-approval-chain` and the response to the PUT — the same shape,
 * so a save re-reads the coverage without a second request.
 */
export const leaveApprovalChainResponseSchema = z.object({
  levels: z.array(leaveApprovalLevelResponseSchema),
  /**
   * Whether the ACCOUNT OWNER is the chain's implicit last link.
   *
   * `true` — the historical behaviour, and the default for every account: a
   * company no level reaches waits on the owner. `false` — the owner opted out,
   * so no implicit row is drawn and nothing is pending with them.
   *
   * Nullish-tolerant so a server that predates the column still reads as the old
   * behaviour rather than blanking the screen.
   */
  includes_owner: z.boolean().nullish(),
  /** How many companies the account has, for `companies_covered` to be read against. */
  company_count: z.number(),
  /**
   * Two different statements, told apart by `includes_owner`:
   * in — the companies whose leave waits on the account owner personally;
   * out — the companies with NO approver at all, which is a warning.
   */
  companies_with_owner: z.array(z.object({ id: z.number(), name: z.string() })),
})

export type LeaveApprovalChainResponse = z.infer<typeof leaveApprovalChainResponseSchema>

/** `GET /user/leave-approval-chain/roles` — distinct role names in the account. */
export const leaveApprovalRolesResponseSchema = z.object({
  role_names: z.array(z.string()),
})

/**
 * The PUT body. The ARRAY ORDER IS THE ORDER OF AUTHORITY: index 0 decides, and
 * index 1 decides only when index 0 has nobody who reaches the company.
 *
 * Sending `[]` CLEARS the chain and switches routing off — an account with no
 * chain behaves exactly as it did before the feature existed, where anyone
 * holding `leaves:update` may decide any leave.
 *
 * A role may appear only once, and every name must be a role that exists
 * somewhere in the account — a typo would silently never match and route the
 * leave one authority too high with no error anywhere.
 */
export interface LeaveApprovalChainPayload {
  role_names: string[]
  /**
   * OPTIONAL, and omitted unless the user actually touched the toggle — a save
   * that only reordered a level must not silently put an opted-out owner back
   * into the routing.
   *
   * `false` is refused with a 400 unless every company of the account is covered
   * by a level, an empty chain included: an account may not configure itself
   * into leave nobody can decide.
   */
  includes_owner?: boolean
}
