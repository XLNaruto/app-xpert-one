/**
 * ENDPOINT REFERENCE — documentation only, no code. Paths live in `endpoints.ts`.
 *
 * Base URL: `env.VITE_APP_API_URL` (see `config/env.ts`). Every tenant route is
 * namespaced under `/user`; the public ones (CONFIG) sit at the root. Bodies and
 * responses are snake_case; the feature `lib/*-mappers.ts` convert to the
 * camelCase UI types.
 *
 * Auth header: `Authorization: Bearer <access_token>` on everything except
 * CONFIG, LOGIN and REFRESH_TOKEN (added by the `api-client` request interceptor).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CONFIG.GET — GET /config                                  (no bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * ←  { "media_path": "https://cdn.dev.xpertoneindia.com/" }
 * Notes: the CDN origin every stored path is rendered against. Read once per
 * session from the dashboard layout and mirrored into `stores/config-store`, so
 * the pure `lib/media.mediaUrl()` helper can join base + path synchronously —
 * the store is IndexedDB-persisted, so it resolves on the first paint after a
 * reload too. Not tenant-scoped: a company switch leaves it alone.
 * Code: `features/config/api/config-api.ts` → `fetchAppConfig`,
 *       `features/config/api/use-app-config.ts`
 *
 * ───────────────────────────────────────────────────────────────────────────
 * AUTH.LOGIN — POST /user/auth/login                       (no bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * →  { "email": "jdoe@acme.com", "password": "secret",
 *      "is_owner": true, "company_code": "ACME",   // code only when is_owner:false
 *      "source": "WEB", "remember_me": false }
 * ←  ONE OF THREE bodies, told apart by `status`:
 *    1. signed in
 *    {  "status": "authenticated",
 *       "access_token": "…",
 *       "refresh_token": "…",
 *       "expires_in": 3600,                // access-token lifetime, seconds
 *       "refresh_expires_in": 43200,       // 30 days when remember_me
 *       "user": {
 *         "id": 1,
 *         "account_id": 1,
 *         "email": "jdoe@acme.com",
 *         "name": "J Doe",
 *         "role_id": 2 | null,
 *         "company_id": 5 | null,          // active company, or null → must select one
 *         "last_selected_company_id": 5 | null,
 *         "is_owner": false
 *       }
 *    }
 *    2. address never verified — no token minted, a code was mailed instead
 *    {  "status": "email_verification_required",
 *       "otp_expires_in": 120, "masked_email": "xp****@gmail.com", "message": "…" }
 *    3. second factor on — the password alone is not enough
 *    {  "status": "two_factor_required", "challenge_token": "…",
 *       "otp_expires_in": 120, "masked_email": "xp****@gmail.com", "message": "…" }
 * Notes: TWO forms picked by `is_owner` — `true` is the account owner (email +
 * password alone), `false` is a tenant-created admin and additionally REQUIRES
 * `company_code`. There is no fallback: an address sent through the wrong form
 * answers 401 with the same message as a wrong password. `source: "WEB"` allows
 * exactly ONE browser session, so signing in again on the web signs the previous
 * browser out, while the user's `APP` sessions on their phones are untouched. It
 * also picks the permission the login is checked against — `web:access` — so a
 * user without panel access gets a 403, not a 401 (owners are exempt on WEB).
 * `remember_me` lengthens the SIGNED refresh-token lifetime (30 days vs 12
 * hours); the client cannot extend it by storing the token differently.
 * Both non-`authenticated` bodies are 200s, not errors — they are the next step,
 * so `loginRequest` resolves them as a `LoginOutcome` rather than throwing.
 * Whether the second factor is on is not readable anywhere, so it is INFERRED
 * here: reaching a session through shape 3 means on, straight through shape 1
 * means off (see `AuthState.twoFactorEnabled`).
 * Code: `features/auth/api/auth-api.ts` → `loginRequest`
 * Schema: `loginResponseSchema` (`features/auth/schemas.ts`)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * AUTH.VERIFY_EMAIL — POST /user/auth/verify-email          (no bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * →  { "email": "jdoe@acme.com", "otp_code": "123456" }
 * ←  { "email": "…", "is_email_verified": true, "message": "…" }
 * Notes: takes the ADDRESS, not a handle, so the user can finish from the mail
 * on a device that never saw the login response — which user gets verified
 * still comes out of the stored code. Single-use, lives two minutes, and three
 * wrong guesses burn it; wrong / expired / too-many all answer 401. NO token is
 * issued, so the screen replays the login once this succeeds — which is also
 * what surfaces a `two_factor_required` on an account holding both.
 * Code: `features/auth/api/auth-api.ts` → `verifyEmailRequest`
 *
 * ───────────────────────────────────────────────────────────────────────────
 * AUTH.RESEND_EMAIL_OTP — POST /user/auth/resend-email-otp  (no bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * →  { "email": "jdoe@acme.com" }
 * ←  { "otp_expires_in": 120, "masked_email": "xp****@gmail.com", "message": "…" }
 * Notes: the code screen's "didn't get it?" button, for BOTH challenges. A new
 * code replaces any live one *for that address*, and a two-factor login code is
 * mailed to that same address, so this re-arms either kind. ALWAYS 200 with the
 * same shape — an unknown address, a deactivated user and an already-verified
 * one are indistinguishable from a code being sent, so it can't double as an
 * account-exists lookup.
 * It returns no `challenge_token`, so the two-factor branch keeps the one the
 * login gave it. That token is bound to the login, not to the code, but carries
 * the login's own two-minute life — so a resend renews the code while the
 * challenge behind it keeps ageing. A verify rejected after a resend means that
 * challenge lapsed and the sign-in must start again.
 * Code: `features/auth/api/auth-api.ts` → `resendEmailOtpRequest`
 *
 * ───────────────────────────────────────────────────────────────────────────
 * AUTH.VERIFY_LOGIN_OTP — POST /user/auth/verify-login-otp  (no bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * →  { "challenge_token": "…", "otp_code": "123456" }
 * ←  EXACTLY the `authenticated` body of AUTH.LOGIN — never a challenge.
 * Notes: the only place a token is minted for a two-factor login. WHICH user is
 * signed in — and from which client — comes out of the challenge, never out of
 * this request, so the session shape (a `WEB` login signs the previous browser
 * out, an `APP` login does not) can't be changed between the two steps. The
 * role and the application right are re-read here, so a login refused in the
 * meantime does not complete. Single-use and expires with the code after two
 * minutes, and a replay reads as expired — so a spent or stale challenge is a
 * 401, NOT a re-issued one. Unlike the login this either resolves to a session
 * or throws, which is why the code screen has no branch for another challenge.
 * Code: `features/auth/api/auth-api.ts` → `verifyLoginOtpRequest`
 *
 * ───────────────────────────────────────────────────────────────────────────
 * AUTH.REFRESH_TOKEN — POST /user/auth/refresh             (no bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * →  { "refresh_token": "…" }
 * ←  { "access_token": "…", "refresh_token": "…", "expires_in": 3600 }
 * Notes: always rotates — the old refresh token is revoked. No `user` object,
 * but the new access token re-reads `company_id` from the database, which is
 * how a company switch takes effect. Called from a bare axios client so it
 * can't recurse through the 401 interceptor; single-flight.
 * Code: `lib/auth-refresh.ts` → `refreshAccessToken`
 *
 * ───────────────────────────────────────────────────────────────────────────
 * AUTH.LOGOUT — POST /user/auth/logout                     (bearer, no body)
 * ───────────────────────────────────────────────────────────────────────────
 * ←  204 / {}
 * Notes: revokes the caller's session server-side; a no-op once signed out,
 * so failures are ignored and the local session is cleared regardless.
 * Code: `features/auth/api/auth-api.ts` → `logoutRequest`
 *
 * ───────────────────────────────────────────────────────────────────────────
 * AUTH.SELECT_COMPANY — POST /user/auth/select-company      (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * →  { "company_id": 5 }
 * ←  { "id": 5, "company_name": "Acme", "company_code": "ACME", "logo": "…"|null }
 * Notes: the active company is session state stored against the token, so the
 * response only echoes the chosen company. Follow the call with a token
 * rotation (REFRESH_TOKEN) to pick up the new `user.company_id`, then
 * invalidate company-scoped queries.
 * Code: `features/company/api/company-api.ts` → `selectMyCompany`,
 *       `features/company/api/use-select-company.ts`
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ME.GET — GET /user/me                                     (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * ←  { "account": { … }, "subscription": { … }, "usage": { … } }
 * Notes: the caller's own account context, resolved from the token. It does
 * NOT report `two_factor_auth` — no endpoint does (see below).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ME.TWO_FACTOR_ENABLE  — POST /user/me/two-factor/enable    (bearer, no body)
 * ME.TWO_FACTOR_DISABLE — POST /user/me/two-factor/disable   (bearer, no body)
 * ───────────────────────────────────────────────────────────────────────────
 * ←  { "two_factor_auth": true | false, "message": "…" }
 * Notes: flips the factor for the CALLER only — the user comes from the token.
 * Carries no permission code (no tenant should be able to stop its own users
 * securing their logins) and needs no mailed code (the address was already
 * proved at the first login). Neither signs the current session out. Enabling
 * when already on — or disabling when already off — answers 409, which is
 * itself the truth about the stored state, so the toggle corrects itself from
 * that rather than showing an error. There is NO endpoint that reads the flag:
 * the profile screen shows `AuthState.twoFactorEnabled`, inferred at login from
 * which body the login answered with and then updated by these two calls.
 * Code: `features/profile/api/two-factor-api.ts`,
 *       `features/profile/api/use-two-factor.ts`
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ME.COMPANIES — GET /user/my/companies                     (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * ←  { "items": [ { "id": 5, "company_name": "Acme",
 *                   "company_code": "ACME", "logo": "…"|null } ] }
 * Notes: the tenants the caller belongs to. Says nothing about which one is
 * active — that's `AuthUser.companyId` on the session. `logo` is a storage
 * path; render it through `lib/media.mediaUrl`.
 * Code: `features/company/api/company-api.ts` → `fetchMyCompanies`
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ME.MY_ROLE — GET /user/my-role                            (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * ←  {
 *      "user_id": 7, "role_id": 3 | null, "role_name": "HR Manager",
 *      "is_owner": false,
 *      "permission_codes": [ "web:access", "employees:read", "employees:create" ],
 *      "modules": [ {                       // the same set as a menu tree
 *        "key": "hr", "label": "Human Resource",
 *        "panel": "user", "panel_label": "Web Panel", "icon": "Users",
 *        "permissions": [ "employees:read", … ],   // everything at/below the node
 *        "granted": false,                         // true only if ALL are held
 *        "actions": [ { "permission": "employees:read", "label": "View",
 *                       "icon": "Eye", "granted": true } ],
 *        "children": [ … ]                         // same shape, any depth
 *      } ],
 *      "access_level": "GLOBAL" | "COMPANY",
 *      "company_ids": [ { "id": 5, "company_name": "Acme" } ],  // NAMED; empty
 *                                           //   on GLOBAL → every company
 *      "talk_enabled": false,
 *      "talk_access": [ { "company_id": 5, "company_name": "Acme",
 *                         "departments": [ { "department_id": 9,
 *                                            "department_name": "Sales" } ] } ],
 *                                           // one entry PER COMPANY; empty
 *                                           //   departments = the WHOLE company
 *      "access": { "web": true, "app": false, "talk": false, "attendance": true }
 *    }
 * Notes: `permission_codes` is the EXACT set every route policy checks — the
 * role's list plus the default-granted codes that have no checkbox (for an
 * owner, the subscription's plan permissions narrowed to the web panel). A
 * screen missing from it answers 403, which is why the client uses it to hide
 * the menu entry and block the route up front. The answer follows the token's
 * login source: a WEB token gets the web panel, an APP token only the
 * Supervisor app's two screens. Read once per session and per company switch.
 * The only role route that needs no permission.
 * Code: `features/permissions/api/permissions-api.ts` → `fetchMyRole`,
 *       `features/permissions/api/use-permissions.ts`,
 *       `features/permissions/lib/route-guard.ts`
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ROLES — /user/roles                                        (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * Roles — what a web-panel user may do, authored per company.
 *
 * `ASSIGNABLE_PERMISSIONS` is the builder's checkbox matrix: the web panel's
 * catalog narrowed to what the account's plan unlocked and minus `roles:*`,
 * which is never delegatable. An action absent from it can never be saved, so
 * the screen renders exactly what comes back rather than the full catalog.
 *
 * `permission_codes` on POST / PATCH is the COMPLETE ticked set and REPLACES
 * what's stored — unticking a box means omitting its code, never sending a
 * diff. Each action carries `requires`, the codes it doesn't work without, and
 * the server does not repair a selection: an incomplete one answers 400 naming
 * what's missing, so the builder maintains that closure itself.
 *
 * A DELETE is refused with 409 while a live user still holds the role.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ADMIN_USERS — /user/admin-users                            (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * Admin users — the account's web-panel logins.
 *
 * ACCOUNT-scoped, not tenant-scoped: `company_id` on the list is a filter, not
 * a requirement, and a create never sends one at all. Everything about what a
 * user may DO comes from `role_id` — permissions, reach and Talk grants all
 * live on the role, and the role's company BECOMES the user's.
 *
 * `email` IS the login and is unique across the whole platform; a mobile
 * number is one identity too. Both are checked against every admin, every
 * organization and every user (409), with a message that never says where the
 * clash is — so no screen becomes a lookup for who holds an address. Mobile
 * numbers go up as DIGITS ONLY.
 *
 * `ASSIGNABLE_ROLES` is the form's role dropdown: every role this account has
 * authored across ALL of its companies, unpaginated, gated on `users:read`.
 * Distinct from `ROLES.LIST`, which is the role screen — paged and needing a
 * `company_id`, whereas here the company is a consequence of the pick.
 *
 * Refusals worth surfacing verbatim: a role with no company (that's the
 * OWNER's shape, 400), changing your OWN role (400), and deleting yourself or
 * an owner (400). A role or password change ends the user's live sessions —
 * the PATCH answers `session_revoked` when it did.
 *
 * `GET /user/admin-users/deleted-data` is deliberately absent: it's the delta
 * sync for a client holding a cached list, which the web panel isn't — query
 * invalidation refetches the page instead.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * BILLING — /user/plans · /user/subscription                 (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * Billing — the account's plan, not a company's. Nothing here takes a
 * `company_id`: the subscription, its entitlements and the usage counted
 * against them all belong to the organization.
 *
 * `PLANS` is the buyable catalog plus any plan built for this organization,
 * with the running one flagged `is_active`. `SUBSCRIPTION` is what's actually
 * live, including the prices it was bought at — prices the plan catalog quotes
 * for *today*, which is why the two are read separately rather than joined.
 * Usage against the plan's limits comes from `ME.GET`.
 *
 * Purchasing (`POST /user/subscriptions`, which answers with a Razorpay order)
 * is deliberately absent: the checkout handoff needs a publishable key the API
 * doesn't hand out, so the screen reads and doesn't sell.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * IP_ADDRESSES — /user/ip-addresses                          (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * IP access control — which networks may reach the panel for a company.
 *
 * Two things live here. `MODE` is the company-level switch: `PUBLIC` means
 * everyone but the blocked list, `RESTRICTED` means only the allowed list. The
 * rest is the list itself — one entry per host (`203.0.113.4`, `2001:db8::1`)
 * or CIDR range (`10.0.0.0/8`), each tagged `ALLOWED` or `BLOCKED`.
 *
 * The API refuses the moves that would lock the caller out: switching to
 * `RESTRICTED` with an empty allow list, and deleting (or re-typing) the last
 * allowed entry of a `RESTRICTED` company both answer 409. The same address may
 * sit on both lists — `BLOCKED` wins at the door.
 *
 * Tenant-scoped: a required `company_id` on reads and on the mode write, and in
 * the body on create. Gated by `ip-addresses:*`, not `companies:*`.
 *
 * MODE — GET reads the company's mode + list counts; PUT switches it.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * SUPPORT_TICKETS — /user/support/tickets                    (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * Help & Support — the tickets THIS organization raises with the PLATFORM
 * desk. Account-scoped: a ticket names no company, and every user of the
 * account sees every ticket (a colleague follows one up while its author is
 * away), which is why `raised_by_user_id` is a filter rather than a scope.
 *
 * `ticket_type` and `priority` together select one cell of the subscription's
 * support promise, and that cell BECOMES the ticket's deadline (`sla_value` /
 * `sla_unit` / `due_at`), snapshot at creation. Neither is editable
 * afterwards, and `REOPEN` does not re-buy the clock — raise a new ticket if
 * the desk or the severity was wrong.
 *
 * `PATCH` corrects only the wording, and only until an admin first touches the
 * ticket (409 after that). Resolving is the desk's job, not ours: this side
 * can only `REOPEN` a finished ticket or `CLOSE` a resolved one. There is no
 * delete — the platform's SLA reports are counted over these rows.
 *
 * REOPEN — `resolved` / `closed` → `reopened`, with a required reason.
 * CLOSE  — `resolved` → `closed`. The screen's trash button, which files
 *          rather than deletes.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * EMPLOYEE_SUPPORT_TICKETS — /user/employee-support-tickets   (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * The EMPLOYEE help desk — the queue of what this account's employees raised
 * from the mobile app, answered by the back office. The mirror image of
 * `SUPPORT_TICKETS`: there we ask, here we answer.
 *
 * Account-scoped across every company unless `company_id` narrows it, and
 * ordered most-severe-then-oldest: it's work waiting on somebody. Severity
 * carries NO deadline on this desk — it ranks the queue and nothing else, so
 * there is no `due_at` and nothing to police.
 *
 * There is no assignee: a ticket is worked by whoever picks it up, recorded on
 * the resolution and on each message. `SUMMARY` is the per-status counts for
 * the tab strip, in one round trip rather than five list calls.
 *
 * `STATUS` is the single route for all three transitions and reads only
 * `status`; its body is a UNION, so `resolved` demands a `resolution_note` and
 * the other two take nothing. Priority is the EMPLOYEE's statement of how much
 * it hurts and is not re-gradable from here.
 *
 * SUMMARY  — one count per status, honouring the list's filters minus the
 *            status ones.
 * GET      — the ticket AND its whole thread, oldest-first — the detail screen
 *            in one call.
 * MESSAGES — post an office reply; the first one stamps `first_response_at`.
 * STATUS   — `in_progress` | `resolved` (+ note) | `closed` — one route, a
 *            union body.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * COMPANIES — /user/companies                                (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * The company master — every company under the caller's account. Unlike the
 * tenant-scoped masters below it carries no `company_id`: the account itself
 * is the scope, and a company's code is generated server-side.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * BRANCHES — /user/branches                                  (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * The company's branches. Tenant-scoped: a required `company_id` on reads and
 * in the body on create — and an edit can't move a branch between companies,
 * so the PATCH body leaves it out.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ACT_REGISTRATIONS — /user/act-registrations                 (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * A branch's applicable acts — PF, ESIC, Factory, Professional Tax, LWF and
 * Employment Exchange in one row per branch.
 *
 * `LIST` is a read for one `branch_id` and answers `{ act_registration }`,
 * `null` when the tab has never been saved — which is how a save picks POST
 * over PATCH. A second POST for the same branch is a 409.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PF_RATES — /user/pf-rates                                 (bearer)
 * Master → Statutory Setup → PF Rate Setting. Slabs are versioned by
 * `effective_date`; a new row supersedes the previous one from that date.
 * ───────────────────────────────────────────────────────────────────────────
 * GET    /user/pf-rates?limit=20&offset=0     limit 1–100 (default 20)
 * ←  { "items": [ <slab> ], "total": 7 }
 *
 * POST   /user/pf-rates                       → 201 <slab>
 * GET    /user/pf-rates/{id}                  → 200 <slab>
 * PATCH  /user/pf-rates/{id}                  → 200 <slab>   (partial body ok)
 * DELETE /user/pf-rates/{id}                  → 200
 *
 * <slab> — every value is `number|null`; `effective_date` is `yyyy-MM-dd`:
 *   { "id": 1, "effective_date": "2026-05-23",
 *     "wage_ceiling_limit": 15000, "edli_wage_ceiling_limit": 15000,
 *     "employee_pf_contribution": 12, "employer_pf_contribution": 8.33,
 *     "employer_fpf_contribution": 3.67, "deduction": 12,
 *     "admin_charges": 0.5, "edli_charges": 0.5, "edli_admin_charges": 0.01,
 *     "minimum_admin_charges": 500, "maximum_edli_charges": 75,
 *     "minimum_closed_admin_charges": 75, "minimum_edli_closed_charges": 25,
 *     "pension_fund_age_limit": 58, "created_at": "…" }
 * The request body is the same minus `id` / `created_at`.
 * Notes: `created_at` is the only audit field — no updated_at / created_by, so
 * the list's Updated column reads as a dash. The UI calls the date `wef`;
 * `lib/pf-rate-mappers.ts` (`toPfRate` / `pfRateToPayload`) is the only place
 * the two namings meet.
 * Code: `features/master/pf-rate/api/pf-rate-api.ts`
 * Schema: `pfRateResponseSchema`, `pfRatesResponseSchema`
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ESIC_RATES — /user/esic-rates                             (bearer)
 * Master → Statutory Setup → ESIC Rate Setting. Same shape as PF_RATES —
 * slabs versioned by `effective_date`, offset pagination, one `created_at`.
 * ───────────────────────────────────────────────────────────────────────────
 * GET    /user/esic-rates?limit=20&offset=0   limit 1–100 (default 20)
 * ←  { "items": [ <slab> ], "total": 4 }
 *
 * POST   /user/esic-rates                     → 201 <slab>
 * GET    /user/esic-rates/{id}                → 200 <slab>
 * PATCH  /user/esic-rates/{id}                → 200 <slab>   (partial body ok)
 * DELETE /user/esic-rates/{id}                → 200
 *
 * <slab> — every value is `number|null`; `effective_date` is `yyyy-MM-dd` and
 * the two contribution periods are month numbers (1–12), not strings:
 *   { "id": 1, "effective_date": "2026-04-01",
 *     "wage_ceiling_limit": 21000, "minimum_rate": 176,
 *     "employee_esic_contribution": 0.75, "employer_esic_contribution": 3.25,
 *     "disability_duration": 2, "disability_wage_limit": 21000,
 *     "contribution_end_period1": 9, "contribution_end_period2": 3,
 *     "created_at": "…" }
 * Notes: the POST body spells the two contribution fields
 * `employee_esi_contribution` / `employer_esi_contribution` (no "c") while the
 * response and the PATCH body use `..._esic_...`. Both bodies are declared
 * `additionalProperties: false`, so the two verbs really do need different
 * keys — `esicRateToCreatePayload` / `esicRateToUpdatePayload` in
 * `lib/esic-rate-mappers.ts` are the only place that asymmetry lives. Collapse
 * them once the backend settles on one spelling.
 * `created_at` is the only audit field, so the Updated column reads as a dash.
 * Code: `features/master/esic-rate/api/esic-rate-api.ts`
 * Schema: `esicRateResponseSchema`, `esicRatesResponseSchema`
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PT_RATES — /user/pt-rates                                  (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * A PT rate carries its salary slabs inline as `details` — the nested array
 * travels with the rate on POST/PATCH, so slabs are never saved separately.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * OFFICE_ADDRESSES — /user/office-addresses                   (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * One endpoint behind all five office-address screens — PF, ESIC, LWF,
 * Factory and Employment Exchange — told apart by the record's `office_for`.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * DEPARTMENTS — /user/departments                             (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * The company's departments, each optionally pinned to a branch. Tenant-scoped:
 * a required `company_id` on reads and in the body on create — an edit can move
 * a department between branches but never between companies, so the PATCH body
 * leaves `company_id` out. The department code is generated server-side.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * SHIFTS — /user/shifts                                       (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * The company's shifts — a named window of the clock, plus the tolerances
 * attendance is judged against (the concession period, the early-exit grace,
 * and the hours that make a full or a half day).
 *
 * Tenant-scoped: a required `company_id` on reads and in the create body. A
 * shift is never moved between companies, so the PATCH body leaves it out.
 * `is_night_shift` is DERIVED from the two times (an `end_time` earlier than
 * `start_time` makes it one) and is never sent.
 *
 * `SET_DEFAULT` / `CLEAR_DEFAULT` are what make per-employee assignment
 * unnecessary: with a default in place an ordinary employee needs no
 * assignment row at all. Both take exactly one of `company_id` or
 * `department_id` — a department's default wins over its company's, and a
 * department with none falls back to the company's.
 *
 * A DELETE is refused with 409 while the shift is still a default anywhere or
 * referenced by a rotation, an assignment or a roster entry.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * SHIFT_ROTATIONS — /user/shift-rotations                     (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * Rotation cycles — a named ring of shifts an employee walks week by week
 * (nights one week, mornings the next).
 *
 * Tenant-scoped like the shifts they name: a required `company_id` on reads and
 * in the create body, and every shift in the cycle must belong to that same
 * company.
 *
 * `weeks` is the WHOLE cycle, not a patchable list: it has to cover weeks
 * `1..cycle_length_weeks` exactly once, because an employee landing on a missing
 * week would silently fall through to the department default. On a PATCH,
 * omitting `weeks` leaves the cycle alone and sending it replaces every week —
 * so `cycle_length_weeks` and `weeks` are validated against each other whichever
 * of the two moved.
 *
 * The cycle is anchored per assignment, not globally: week 1 starts at each
 * employee's own `effective_date`, so two people assigned a week apart are
 * legitimately out of phase.
 *
 * A DELETE is refused with 409 while employees are still assigned to it.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * WEEKOFF_POLICIES — /user/weekoff-policies                   (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * Week-off policies — which days of the week don't count as working days.
 *
 * `days` is a list of RULES rather than a list of weekdays, which is what makes
 * the interesting patterns expressible: `week_day` is 0 = Sunday … 6 = Saturday
 * and `week_number` names WHICH occurrence of that weekday in the month (1–5),
 * `null` meaning every one. Alternate Saturdays are therefore two rules with
 * `week_number` 2 and 4, and because a dated rule beats an every-week rule,
 * `is_off: false` carves an exception out of a broad one.
 *
 * Like the rotation's cycle, the rule set is replaced wholesale: omitting `days`
 * on a PATCH leaves the rules alone and sending it replaces them all — "which
 * days are off" only makes sense read together, so there is no per-rule patch.
 *
 * `SET_DEFAULT` / `CLEAR_DEFAULT` take exactly one of `company_id` or
 * `department_id` (the department wins). A shift may name its own policy, but
 * most don't — and without a default at one of those two levels every such shift
 * falls back to the platform's Sunday-only constant.
 *
 * A DELETE is refused with 409 while a shift, company or department points at it.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * DESIGNATIONS — /user/designations                           (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * The company's designations — a title plus an effective-dated wage structure
 * behind it. The two are separate resources on purpose:
 *
 * - `LIST` answers titles only (name + audit), so the list screen shows no pay.
 * - `POST` establishes the title *and* its opening wage structure in one body.
 * - `PATCH` takes the `name` and nothing else — pay is never edited in place.
 * - `WAGE_STRUCTURES` is the version history: POST appends one version from a
 *   `YYYY-MM` month, and `WAGE_STRUCTURE` patches one existing version in
 *   place (correcting a row rather than superseding it).
 *
 * The last two are the bulk wage screen's, which configures every designation
 * of a company at once against one effective month:
 *
 * - `BULK_WAGE_GRID` reads the whole grid — every designation with the version
 *   of its structure in force. Unpaginated: the screen is saved as a whole.
 * - `BULK_UPDATE` writes it back in one transaction — either every row lands
 *   or none does. Per row, a structure already effective from that exact month
 *   is updated and any other month adds a version, keeping the earlier ones as
 *   history.
 *
 * Tenant-scoped: a required `company_id` on reads and in the create body.
 *
 * BULK_WAGE_HISTORY — every designation of a company with *all* its wage
 * versions — the bulk grid's read-only history twin. Paged over the
 * designations, so a title's versions are never split across two pages.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LEAVE_TYPES — /user/leave-types                             (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * The company's leave catalog. Every read is scoped by a required
 * `company_id`, and a new leave type carries the same id in its body.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * HOLIDAYS — /user/holidays                                   (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * The company's holiday calendar. Like leave types, every read is scoped by a
 * required `company_id` and a new holiday carries the same id in its body.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PAY_COMPONENTS — /user/pay-components                        (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * The company's payroll catalog — allowances and deductions in one resource,
 * told apart by the record's `type`. Tenant-scoped like the two masters above:
 * a required `company_id` on reads, and in the body on create.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ASSETS — /user/assets                                       (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * The company's asset master — the catalog employee assets are issued from.
 * Tenant-scoped: a required `company_id` on reads, and in the body on create.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * DOCUMENT_TYPES — /user/document-types                        (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * The company's document categories — the parent of the `documents` master, so
 * a type exists before anything can be filed under it. Tenant-scoped: a
 * required `company_id` on reads, and in the body on create. A name must be
 * unique within the company (409 otherwise), and a delete is refused with 409
 * while documents still reference the type.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * DOCUMENTS — /user/documents                                  (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * The company's document master, each row filed under a document type.
 * Tenant-scoped like its parent, and `document_type_id` narrows a read to one
 * category. Names are unique within the company (409 otherwise).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * EMPLOYEES — /user/employees                                  (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * The employee — one person, plus the postings and the nine steps hung off
 * them. The wizard's shape follows the API's: step 1 is the employee row
 * itself (created together with the FIRST posting), and every later step is
 * its own sub-resource under `/user/employees/:id/…`.
 *
 * `POST` establishes the person and their opening posting in one body, so a
 * new employee exists only once step 1 is saved — which is why every other
 * tab is locked until then. `PATCH` writes the person and the CURRENT posting;
 * moving someone between company / branch / department / designation goes
 * through `TRANSFERS` instead, so the old posting survives as history.
 *
 * Reads are scoped by a required `company_id` on the list and by the record's
 * own tenant everywhere else.
 *
 * DELETE_FACE — DELETE: de-register the employee's face: the face record and
 * its captured images are soft-deleted and the stored images purged, answering
 * how many went. The person is re-registered from the mobile app afterwards,
 * not just re-captured. (`DELETE …/delete-faces` drops only the pictures and
 * keeps the enrolment; the portal doesn't use it.)
 *
 * KYC — step 2. Every field is a column on the employee, so an untouched step
 * reads back as a record of `null`s rather than a 404. The first save is a POST
 * (a full overwrite: an omitted field is stored as `null`), and every save
 * after it is a PATCH.
 *
 * WAGE_STRUCTURE — step 3, read-only. The wage structure the employee inherits
 * from the designation on their current posting; nothing is stored per
 * employee, so there is no write here at all.
 *
 * FAMILY / FAMILY_MEMBER — step 4, family members, one row per call (no
 * whole-step save).
 *
 * EDUCATIONS / EDUCATION — step 5a, qualifications.
 *
 * EXPERIENCES / EXPERIENCE — step 5b, prior employment. Its two dates are
 * `YYYY-MM`, never full dates.
 *
 * DOCUMENTS / DOCUMENT — step 6, attachments. `document` is the object key from
 * `UPLOADS.EMPLOYEE_DOCUMENT`; the file itself never passes through here.
 *
 * ASSETS / ASSET — step 7, assets issued from the asset master.
 *
 * TRANSFERS / TRANSFER / LEAVE_SERVICE — step 8, the posting history, newest
 * first. `POST` is one atomic move (close the open posting, open the new one);
 * `PATCH` corrects the latest posting in place and is refused for a closed one;
 * `LEAVE_SERVICE` closes the open posting without opening another — the
 * employee exits.
 *
 * SHIFT_ON_DAY / SHIFTS / SHIFT_ENTRY / ROSTER / ROSTER_ENTRY — step 9, which
 * shift the employee works, and why.
 *
 * `SHIFT_ON_DAY` walks the whole precedence chain (roster → rotation →
 * assignment → department default → company default) for one date and reports
 * which link answered in `source`. That's the only way to tell "General,
 * because it's the company default" (nothing to undo) from "General, because
 * somebody rostered it onto this date" (one row a manager can remove). It
 * answers for any day, past or future, so a rotation can be walked forward
 * without materialising anything.
 *
 * `SHIFTS` is the assignment TIMELINE — append-only and unpaginated, since a
 * career collects a handful of entries. An EMPTY timeline is the ordinary,
 * healthy state: it means the employee is on their department's or company's
 * default. A POST with NEITHER `shift_id` nor `rotation_id` is how an
 * assignment ENDS ("back to the default from this date"); `SHIFT_ENTRY`'s
 * DELETE is only for an entry typed by mistake, because removing one rewrites
 * which shift the employee was judged against on days already closed.
 *
 * `ROSTER` is the per-date override — the highest-priority answer in the
 * chain. Only the dates a manager explicitly overrode are rows; re-rostering
 * a date REPLACES its entry rather than conflicting, and unlike a timeline
 * entry a roster row IS safe to delete, since it says nothing about history.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * EMPLOYEE_LEAVES — /user/employee-leaves                      (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * Step 9 — leave records. A top-level collection rather than a sub-resource:
 * `?employee_id=` is the employee's own tab, and leaving it off gives the
 * company-wide queue. Recording a leave from the back office IS the approval
 * (`status` defaults to `APPROVED`); `STATUS` is the decision on one that was
 * filed as `PENDING`, and only a pending row can be decided.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * SALARY — /user/salary                                        (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * Payroll — the salary register and the writes that process a month.
 *
 * `REGISTER` is the screen: one page of postings open inside the period, each
 * carrying the attendance the month would be paid on, the wage structure in
 * force for its designation and `computed` — the pay that would be saved if the
 * row were committed as it stands. `?status=pending|complete` splits it into
 * the month's queue and the month already processed.
 *
 * `BULK_SAVE` commits the run. **The server computes the pay**: a row sends
 * only the days it is paid for (`present_days`, and optional `working_days` /
 * `ot_hours` overrides), never a gross or a per-head amount, so a stale screen
 * can't write pay from a wage structure that has since been revised.
 *
 * `BULK_DELETE` is the register's "discard selected" — a POST because the ids
 * travel in a body. It soft-deletes, which is what lets the month be run
 * again; an already-paid salary is refused and reported back in `skipped`.
 *
 * REPORT — the month already processed, as a MATRIX — the "View Salary" screen.
 * One row per *stored* salary of the period, each with the employee's
 * particulars, statutory numbers and bank details plus its per-head
 * allowance and deduction lines. `allowance_heads` / `deduction_heads` are
 * the union of head names across the whole result, in catalog order, and are
 * the column set to pivot on — a row simply carries no line for a head it
 * doesn't have, which reads as zero. Pivoting on one row's own components
 * instead would give a table whose columns shift per row.
 * `totals` is the footer for the ROWS RETURNED, so a paged screen's total
 * adds up to the column above it. Unlike the register there is no `sort`:
 * the endpoint fixes the order, so the screen's columns aren't sortable.
 *
 * IMPORTS — step 2 of the spreadsheet import: read the workbook already
 * uploaded at `file_key`, price every row and save it. Rows are only ever
 * *created* — a period already processed for a posting comes back in `skipped`,
 * never overwritten. **The period written inside the sheet wins** over the one
 * sent, and the response says which one actually landed.
 *
 * IMPORT_TEMPLATE — step 0 of the same import: the sheet to fill in. It answers
 * the workbook itself as an attachment — one pre-filled row per posting **not
 * yet processed** for the period, Present Days already filled in from
 * attendance and every other cell locked, because the import matches rows
 * by employee code and service id.
 * Takes the register's own filters (`company_id`, `month`, `year`, and
 * optionally `designation_id` / `department_id`), so the sheet that comes
 * down is the register that is on screen.
 *
 * PAYMENTS — Pay Salary: what is outstanding for the period, and what already
 * went out. `?status=unpaid|paid` is the screen's two tabs, split in SQL rather
 * than filtered here.
 * It reads *salary rows*, not the roster: someone the month was never run
 * for is on neither tab, which is the register's question
 * (`REGISTER?status=pending`), not this screen's. `totals` describes the
 * whole filter while `items`/`total` describe the page, so the tiles don't
 * move when the pager does. There is no `sort` — the order is the server's,
 * so the screen's columns aren't sortable. `limit` goes up to 500 so a whole
 * department can be ticked at once.
 * The POST is Confirm & Pay: ONE batch — the date the money left, the mode
 * it left by, its proof documents and the salaries it settles. Nothing in
 * the `salary_id`/`employee_id` pairing is taken on trust; a row failing any
 * check comes back in `skipped` with its reason while the rest still lands,
 * and a concurrent batch that settled part of the same selection makes this
 * one a 409 rather than a batch whose total describes rows it didn't pay.
 *
 * PAYMENT_HISTORY — the batches of one period, newest first, with the three
 * counters over the whole filter. `batch_number` ("Batch #1") is a POSITION in
 * that list, not an identifier — address a batch by `batch.id`, which is what
 * `PAYMENT` takes.
 *
 * PAYMENT — one batch expanded: the batch itself, the employees it settled
 * (paged — a batch may hold five hundred) and every proof document filed
 * against it. A document's `document` is the storage KEY, not a url — resolve
 * it against the media base like any other stored file.
 *
 * BANK_TRANSFER_SHEET — the bank's bulk-transfer upload sheet (.xlsx): one
 * beneficiary row per UNPAID salary of the period with a positive net pay, in
 * the fixed column order the bank's template mandates.
 * Unpaid rows only, so it always describes what is still outstanding and is
 * safe to re-download. `debit_account_number` is the company account being
 * debited and is required: this system holds no company bank account of its
 * own. 404 when nothing of the period is outstanding.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * BONUS_ESTIMATION — /user/bonus-estimation                    (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * Bonus Estimation — what a bonus over a RANGE of periods would cost, and the
 * bonuses committed for it.
 *
 * The range is `from`…`to` as `YYYY-MM`, inclusive, because a salary row
 * carries a month and a year and no date at all. Everything is read off
 * PROCESSED months, so an employee the register never priced is absent.
 *
 * `ESTIMATE` writes nothing. One line per employee with ALL FOUR bases summed
 * over the range — net pay, gross pay, basic pay and basic pay of present days
 * — so switching the CALCULATION BASE dropdown re-fills the column without
 * another read. They are also the sums the save apportions against, so the
 * amount authorised and the rows it lands on are figured from the same numbers.
 * `advance_bonus` beside them is the BONUS pay component already paid inside
 * the range, shown and never netted off. `total` counts EMPLOYEES, not months.
 *
 * The POST commits ONE bonus per employee: each sends the total `amount` for
 * the whole range and the `percentage` that produced it, and the server splits
 * that amount across the employee's processed months in proportion to each
 * month's `calculation_field`. **`amount` is trusted and never recomputed** —
 * the screen allows keying it by hand when the base is unavailable. A month
 * that already carries a bonus is SKIPPED rather than overwritten and its
 * share is not redistributed, so `saved_amount` may be less than
 * `requested_amount` and each line reports what was written and why. Only a
 * selection where nothing at all could be written is a 400; a concurrent save
 * that committed part of the range is a 409 with nothing landed.
 *
 * `SAVED` reads it back, one card per employee with `total_bonus` being the sum
 * of the months under it. Each month carries the base it was figured on and the
 * `base_amount` that base held AT SAVE TIME — a snapshot, so reprocessing the
 * month afterwards can't rewrite a committed bonus.
 *
 * BASE — POST: commit the ticked employees' bonuses for the range.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * SALARY_REPORTS — /user/salary-reports                        (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * Reports — the statutory and payroll statements, read off the month already
 * processed.
 *
 * All twelve share ONE query shape: `company_id`, `month`, `year`, an optional
 * `department_id`, an optional `employee_ids`, plus `search` / `sort` /
 * `sort_by` / `limit` / `offset`. `GROSS_SALARY` is the one exception — it
 * spans a range and takes `from`/`to` as `YYYY-MM` instead of a period, because
 * a salary row carries a month and a year and no date at all.
 *
 * **`sort` is per type.** Each endpoint accepts only its OWN columns and
 * answers a 400 for anything else, so a type switch has to drop the order the
 * previous type was read in rather than carry it across.
 *
 * There is **no export endpoint** for any of them: the API answers JSON only,
 * so these screens page and sort server-side and have no download.
 *
 * PAY_SLIP — one row per processed salary: the person, the days, the four
 * money columns.
 *
 * PAY_REGISTER — the statutory register: one employee's whole month in fixed
 * columns (particulars, statutory numbers, bank, pay). Not the pivoted
 * per-head matrix, which is `SALARY.REPORT`.
 *
 * GROSS_SALARY — a RANGE, `from`…`to` as `YYYY-MM`, grouped PER EMPLOYEE —
 * someone who transferred mid-range is one line and `months_processed` says
 * how many months it covers, so `total` counts employees, not processed months.
 *
 * PAID_SALARY — the period's released months, with the date each batch went out.
 *
 * UNPAID_SALARY — its mirror: processed but still outstanding. Reports only —
 * paying is `SALARY.PAYMENTS`.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PF_REPORTS — /user/pf-reports                                (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * PF — the four EPFO sheets. Every one carries `basis`, the rate row the month
 * was priced against, so the screen can print what the figures were computed on
 * rather than restate the statutory defaults.
 *
 * CHALLAN — Form-3A. `wages` here is a DAY COUNT, not money — the money base
 * beside it is `epf_wages`. `rfl`, `wag` and `ee_transfer` are always 0 (no
 * source) and aren't sortable for that reason.
 *
 * STATEMENT — the employer's contribution statement. Its `wages` is the AGREED
 * basic capped at the ceiling, not the challan's prorated `epf_wages`, so the
 * two legitimately print different wages for the same month.
 *
 * NEW_JOINING — the EPFO new-member sheet: the only type that reads POSTINGS
 * rather than payroll, so a joiner is registrable before their first month is
 * processed. `total` counts postings: a re-join is a second line.
 *
 * ECR — the Electronic Challan cum Return, KEYED BY UAN: a PF member without
 * one is absent, so expect a smaller `total` than the challan's for the same
 * filter. `refund` is always 0 and isn't sortable.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ESIC_REPORTS — /user/esic-reports                            (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * ESIC — both types carry `header`, the establishment and the rates in force.
 *
 * STATEMENT — IP number, contributing days, the ESIC wage base and both
 * contributions.
 *
 * CHALLAN — the portal's own challan columns, DELIBERATELY WITHOUT the
 * contributions: a challan declares the wage and the days and the portal
 * computes what is owed. `reason_for_zero_wages` is always null (filled in on
 * the portal).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PT_REPORTS — /user/pt-reports                                (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * Professional Tax. `gross_wages` is the month's WHOLE gross — PT is assessed
 * on the gross, unlike ESIC's per-head base — and `pt_amount` is the stored
 * figure, never recomputed: re-walking the slabs today would return a different
 * one for anyone who has since had a birthday.
 *
 * `header` carries no rates (there is no single PT rate to print) — it carries
 * the establishment and the branch's EC / RC numbers instead.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ATTENDANCE — the company's day, read top-down
 * ───────────────────────────────────────────────────────────────────────────
 * GET /user/attendance/groups
 *   ?company_id=5 &date=2026-08-11 &search=rmc &limit=12 &offset=0
 * ←  { "date": "2026-08-11", "today": "2026-08-11",
 *      "group_by": "department" | "designation",
 *      "totals": { "total": 35242, "present": 0, "absent": 35242,
 *                  "attendance_rate": 0 },
 *      "items": [ { "id": 4, "name": "RMC WARD NO 17, RAJKOT", "code": null,
 *                   "total": 72, "present": 0, "absent": 72,
 *                   "attendance_rate": 0 } ],
 *      "total": 41 }
 * Notes: `group_by` is the SERVER's answer, never a parameter — a company with
 * departments is carded by department, one with none by designation, and the
 * ids in `items` belong to THAT level. Omit `date` for the day the server is
 * in: the business day is bucketed in its attendance timezone, so a client that
 * computed "today" would ask for the wrong day either side of midnight; the
 * response echoes both the day reported on and the server's own. `search`
 * matches the GROUP name and a department code — never an employee — and
 * narrows `items`/`total` only: `totals` is the COMPANY's day and must not move
 * while somebody types. The cards therefore sum to at most `totals.total`, and
 * the gap is exactly the employees with no posting at that level. `absent`
 * means DID NOT PUNCH and nothing more — leave, holidays and weekly offs are
 * three registers this read does not consult.
 *
 * GET /user/attendance/groups/employees
 *   ?company_id=5 &department_id=4 &date=… &status=absent &term=kaur
 *   &limit=20 &offset=0
 * ←  { "date": …, "today": …, "group_by": …,
 *      "group": <same shape as an `items` card>,
 *      "totals": { … },
 *      "items": [ { "employee_id": 91, "prefix": "Mr.", "name": "Ajay Hans",
 *                   "employee_full_name": "Mr. Ajay Hans", "code": "0063687",
 *                   "photo": "employees/…jpg", "status": "present" | "absent",
 *                   "attendance_id": 12 | null, "day_status": "leave" | null,
 *                   "check_in": "09:04", "check_out": "", "total_hour": "",
 *                   "check_in_at": … , "check_out_at": … } ],
 *      "total": 407 }
 * Notes: send EXACTLY ONE of `department_id` / `designation_id`, matching the
 * `group_by` the card list answered with — both, neither or the wrong one is a
 * 400/404. `company_id` is checked, not filtered: a neighbouring company's group
 * is a 404, never an empty list a client would render as "everyone absent".
 * `status` narrows the LIST only — `total` counts that filtered side while
 * `totals`/`group` always cover the whole group's day. Branch each row on
 * `status`: an absent row carries `""` for the three time fields, meaning
 * nothing on record. `total_hour` is the stored rollup, so it counts CLOSED
 * sessions only and reads low while somebody is still checked in. `photo` is an
 * object KEY, not a url.
 *
 * GET /user/attendance/employee-detail
 *   ?company_id=5 &employee_id=91 &year=2026 &month=8 [&department_id=4]
 * ←  { "data": { "month": "2026-08", "employee_id": 91, "today": …,
 *                "weekly_off": "Sunday", "geo_fence": [ … ] | null,
 *                "list": [ { "shift_date": "2026-08-03",
 *                            "status": "present" | "half_day" | "absent" |
 *                                      "leave" | "holiday" | "weekly_off" |
 *                                      "future",
 *                            "check_in": "09:04:11", "check_out": "",
 *                            "total_hour": "", "total_time": { "display": … },
 *                            "weekly_off": false, "holiday_name": null,
 *                            "leave_type": null,
 *                            "log": [ { "id": 7, "event_type": "check_in",
 *                                       "time": "09:04", "captured_image": …,
 *                                       "captured_image_url": …, "latitude": …,
 *                                       "longitude": …, "device": … } ],
 *                            "geo_locations": [ … ] } ],
 *                "counts": { "present": 12, "half_day": 0, "absent": 8,
 *                            "leave": 1, "holiday": 1, "weekly_off": 4,
 *                            "future": 5, "elapsed": 26, "working": 22 } } }
 * Notes: the one read in this feature that wraps its answer in `data` — it is
 * the same payload `POST /user/employees/:id/attendance/view` returns, rather
 * than a shape written for this screen. `year` and `month` go up as separate
 * numbers and are joined server-side into the one `YYYY-MM` every month read
 * takes, so a figure here can never disagree with the employee record's. There
 * is an entry for EVERY day of the month. Branch the badge on `status`, never
 * on an empty `check_in`: a blank day may be a weekly off, a holiday or an
 * approved leave, and only the server holds all three registers — which is what
 * makes this the screen that explains an "absent" the group list could only
 * count. `company_id` (and `department_id`, when sent) are asserted against the
 * employee's posting: an employee outside them is a 404, never an empty month.
 * Times are `HH:MM:SS` in the SERVER's attendance timezone, so a night shift is
 * not shifted by the reviewer's browser.
 * Code: `features/hr/attendance/api/attendance-api.ts`
 * Schema: `attendanceGroupsResponseSchema`,
 *         `attendanceGroupEmployeesResponseSchema`,
 *         `attendanceMonthResponseSchema` (`features/hr/attendance/schemas.ts`)
 *
 * ───────────────────────────────────────────────────────────────────────────
 * UPLOADS — /user/uploads/*                                    (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * Presigned PUT handshakes. Each answers `{ upload_url, key }`: PUT the file
 * straight at `upload_url` with the same `Content-Type` that was presigned,
 * then send `key` on the record. No file ever travels through the API, and no
 * DB row is touched here — an abandoned upload just leaves a stray object.
 *
 * COMPANY_LOGO — signs a PUT for a JPG/PNG/WebP. The bytes go straight to
 * storage and the returned `key` is what `logo` holds on the company.
 *
 * SALARY_IMPORT — the salary import workbook: `.xlsx` or `.csv`, signed for
 * those two only.
 *
 * SALARY_PAYMENT_DOCUMENT — one proof document for a salary payment batch:
 * signs a PUT for a JPEG/PNG/WebP or PDF. Called ONCE PER FILE (each PUT is
 * signed for its own content type), up to the ten a batch accepts, and the
 * returned `key` goes in the batch's `documents` array alongside the
 * `file_name` to label it by — the key keeps only a slug of the name, so it
 * can't be recovered from it.
 *
 * SUPPORT_ATTACHMENT — a file on an employee-support reply: a corrected
 * payslip, a form, a screenshot. Signs a PUT for a JPEG/PNG/WebP or PDF, and
 * the returned `key` travels as `attachment_url` on the message. The
 * employee's own presign writes into the SAME prefix: both ends of one thread
 * share it.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * BANKS · STATES · DISTRICTS — read-only lookups                (bearer)
 * ───────────────────────────────────────────────────────────────────────────
 * All three masters are maintained by the super admin — LIST + GET only.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * TYPICAL SIGN-IN FLOW
 * ───────────────────────────────────────────────────────────────────────────
 * 1. LOGIN                        → store tokens + user
 * 2. user.company_id == null ?    → ME.COMPANIES, show the select gate
 * 3. AUTH.SELECT_COMPANY          → then REFRESH_TOKEN, invalidate queries
 * 4. background scheduler         → REFRESH_TOKEN before expiry (`lib/auth-refresh.ts`)
 * 5. any 401                      → REFRESH_TOKEN once, retry; else LOGOUT locally
 */

export {}
