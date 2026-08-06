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
 * →  { "email": "jdoe@acme.com", "password": "secret", "source": "WEB" }
 * ←  {
 *      "access_token": "…",
 *      "refresh_token": "…",
 *      "expires_in": 3600,                 // access-token lifetime, seconds
 *      "user": {
 *        "id": 1,
 *        "account_id": 1,
 *        "email": "jdoe@acme.com",
 *        "name": "J Doe",
 *        "role_id": 2 | null,
 *        "company_id": 5 | null,           // active company, or null → must select one
 *        "last_selected_company_id": 5 | null,
 *        "is_owner": false
 *      }
 *    }
 * Notes: one form for everyone — `email` is unique platform-wide, so an account
 * owner and a tenant-created admin sign in identically (there is no `is_owner`
 * flag or company code to send). `source: "WEB"` allows exactly ONE browser
 * session, so signing in again on the web signs the previous browser out, while
 * the user's `APP` sessions on their phones are untouched. It also picks the
 * permission the login is checked against — `web:access` — so a user without
 * panel access gets a 403, not a 401 (owners are exempt on WEB). A wrong
 * password and an unknown address both answer 401.
 * Code: `features/auth/api/auth-api.ts` → `loginRequest`
 * Schema: `loginResponseSchema` (`features/auth/schemas.ts`)
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
 * Notes: the caller's own account context, resolved from the token.
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
 * TYPICAL SIGN-IN FLOW
 * ───────────────────────────────────────────────────────────────────────────
 * 1. LOGIN                        → store tokens + user
 * 2. user.company_id == null ?    → ME.COMPANIES, show the select gate
 * 3. AUTH.SELECT_COMPANY          → then REFRESH_TOKEN, invalidate queries
 * 4. background scheduler         → REFRESH_TOKEN before expiry (`lib/auth-refresh.ts`)
 * 5. any 401                      → REFRESH_TOKEN once, retry; else LOGOUT locally
 */

export {}
