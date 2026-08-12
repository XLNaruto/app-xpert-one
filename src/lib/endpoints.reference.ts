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
 *      "company_ids": [ 5 ],                // empty on GLOBAL → every company
 *      "talk_enabled": false, "talk_access": [ { "company_id": 5,
 *                                                "department_id": null } ],
 *      "access": { "web": true, "app": false, "talk": false, "attendance": true }
 *    }
 * Notes: `permission_codes` is the EXACT set every route policy checks — the
 * role's list plus the default-granted codes that have no checkbox (for an
 * owner, the subscription's plan permissions narrowed to the web panel). A
 * screen missing from it answers 403, which is why the client uses it to hide
 * the menu entry and block the route up front. The answer follows the token's
 * login source: a WEB token gets the web panel, an APP token only the
 * Supervisor app's two screens. Read once per session and per company switch.
 * Code: `features/permissions/api/permissions-api.ts` → `fetchMyRole`,
 *       `features/permissions/api/use-permissions.ts`,
 *       `features/permissions/lib/route-guard.ts`
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
 * TYPICAL SIGN-IN FLOW
 * ───────────────────────────────────────────────────────────────────────────
 * 1. LOGIN                        → store tokens + user
 * 2. user.company_id == null ?    → ME.COMPANIES, show the select gate
 * 3. AUTH.SELECT_COMPANY          → then REFRESH_TOKEN, invalidate queries
 * 4. background scheduler         → REFRESH_TOKEN before expiry (`lib/auth-refresh.ts`)
 * 5. any 401                      → REFRESH_TOKEN once, retry; else LOGOUT locally
 */

export {}
