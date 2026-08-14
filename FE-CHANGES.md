# FE Changes — Scope & Access moves to Admin Users, Talk menu restructured

**Status:** API merged, not yet released. Two follow-ups still open (see [Known gaps](#known-gaps)).
**Blast radius:** the Role form, the Admin User form, the role builder's Talk branch, and the sidebar renderer.

Two changes landed together. Read them in order — the second only makes sense after the first.

1. **[The reach moved from the role to the user.](#1-the-reach-moved-from-the-role-to-the-user)** Access level, company access and Talk grants are now properties of the PERSON, not of their role.
2. **[`talk:access` became a menu item instead of a section.](#2-talkaccess-became-a-menu-item)** It is no longer a checkbox in the role builder.

---

## 1. The reach moved from the role to the user

### Why

The Role form used to carry a **Scope & Access** card — access level, the companies the role reaches, and the Talk toggle with its grant rows. Because that lived on the role, two admins with identical permissions over different companies had to be **two separate roles**, with the whole permission matrix re-ticked for each. The role list grew a row per person.

Reach is now stored per user. One "HR Manager" role, ticked once, serves every office — each user carries their own companies and Talk grants.

A role now carries **the permission codes and nothing else**.

### What moves on screen

| Card | Was on | Is now on |
| --- | --- | --- |
| Permissions matrix | Role form | Role form *(unchanged)* |
| **Scope & Access** (access level + companies) | Role form | **Admin User form** |
| **Talk** (toggle + grant rows) | Role form | **Admin User form** |

Delete the Scope & Access card from the Role form and rebuild it on the Admin User form. The card's markup and behaviour are unchanged — only its home and the endpoint it posts to.

> `role_id` still decides the user's **own company** (`company_id`, taken from the role). That is a different thing from the companies they **reach**. Don't conflate the two fields.

### Endpoint changes

#### Roles — fields REMOVED

| Endpoint | Removed |
| --- | --- |
| `POST /user/roles` (body) | `access_level`, `company_ids`, `talk_enabled`, `talk_access` |
| `PATCH /user/roles/:id` (body) | `access_level`, `company_ids`, `talk_enabled`, `talk_access` |
| `GET /user/roles/:id` (response) | `access_level`, `talk_enabled`, `company_ids`, `talk_access` |
| `GET /user/roles` (row) | `access_level`, `talk_enabled` |
| `GET /user/admin-users/assignable-roles` (row) | `access_level`, `talk_enabled` |

Sending a removed key is ignored, not rejected — so a stale FE build fails **silently**, saving a role that grants no reach at all. Grep for these four names in the role form and delete every one.

`RoleResponse` is now exactly:

```jsonc
{ "id", "company_id", "name", "permission_codes", "is_system", "created_at" }
```

#### Admin Users — fields ADDED

**`POST /user/admin-users`** — body gains four **required-shaped** keys:

```jsonc
{
  "access_level": "GLOBAL" | "COMPANY",   // required
  "company_ids": [12, 13],                 // required non-empty when COMPANY; send [] for GLOBAL
  "talk_enabled": false,                   // defaults false
  "talk_access": [                         // required non-empty when talk_enabled is true
    { "company_id": 12, "department_ids": [3, 4] },
    { "company_id": 13, "department_ids": [] }   // empty = the WHOLE company
  ]
}
```

**`PATCH /user/admin-users/:id`** — the same four, all optional. **Any one of them re-validates all four.** Whatever you omit is filled in from what is stored, so you may send just `access_level: "GLOBAL"` and the server clears `company_ids` for you. Sending none of the four leaves the reach untouched.

**`GET /user/admin-users/:id`**, **`POST`**, **`PATCH`** responses now carry the reach, with `company_ids` and `talk_access` **resolved to names** so you never need a second call to label a chip:

```jsonc
{
  "access_level": "COMPANY",
  "talk_enabled": true,
  "company_ids": [ { "id": 12, "company_name": "Liger Infotech" } ],
  "talk_access": [
    {
      "company_id": 12,
      "company_name": "Liger Infotech",
      "departments": [ { "department_id": 3, "department_name": "Support" } ]
    }
  ]
}
```

**`GET /user/admin-users`** (the list) carries **only the two scalars** — `access_level` and `talk_enabled`. The named lists are deliberately absent: resolving them costs two joins per row and no list column shows them. Don't expect `company_ids` on a list row.

### The four validation rules to enforce client-side

The server enforces all of these; mirroring them avoids a round trip.

1. `access_level: "COMPANY"` → `company_ids` must name at least one company. *(400: "Select at least one company for company-specific access")*
2. `talk_enabled: true` → `talk_access` must have at least one entry. *(400: "Select at least one Talk company when Talk access is enabled")*
3. Every department in a Talk entry must belong to the company named alongside it. *(400)*
4. Any company or department not belonging to this account → **404**.

**Normalisation you can rely on:** switching to `GLOBAL` stores `company_ids` empty; turning `talk_enabled` off stores `talk_access` empty. The server forces the ignored half empty, so a hidden section that keeps its stale contents does no harm — but don't depend on that to hide a bug.

### Reading the two empty states correctly

| Field | Empty means |
| --- | --- |
| `company_ids: []` with `access_level: "GLOBAL"` | **every company**, present and future — never "none" |
| `company_ids: []` with `access_level: "COMPANY"` | genuinely none (only reachable on legacy rows) |
| `departments: []` on a Talk entry | the **whole company**, every department — never "none" |

Render "All companies" for the first, not an empty chip list.

### Timing — no re-login needed

Reach is read live from the row on every request. A narrowed user is narrowed **immediately**; no session is cleared and no re-login is required. (Contrast: a **role** or **password** change does end every session — `session_revoked: true` on the response.)

---

## 2. `talk:access` became a menu item

### Why

`talk:access` was doing two jobs: the Talk **section's** own `View` in the role builder, *and* "may this person chat". Ticking it on a role put the Talk menu in someone's sidebar while their Talk toggle said they couldn't chat — one `GET /user/my-role` answering both ways.

It is now the **`Open Talk`** menu item, sitting beside the two admin screens, exactly as the sidebar draws them.

### The new tree shape

```
Access
└── Talk                    ← HEADING — no actions of its own
    ├── Open Talk           talk:access            ← no checkbox; from the user's Talk toggle
    ├── Monitoring          talk-monitoring:*      ← role checkbox
    └── Credential          talk-credentials:*     ← role checkbox
```

### Role builder — `GET /user/roles/assignable-permissions`

| | Before | After |
| --- | --- | --- |
| Talk node count | **0/8** | **0/7** |
| Talk row's `View` button | present | **gone** |
| `Open Talk` child | — | **absent from this endpoint** |
| Monitoring / Credential | 0/2, 0/5 | unchanged |

`talk:access` is now filtered out of the assignable set entirely — the same treatment `roles:*` already gets. It can never be ticked onto a role.

**Two renderer assumptions this breaks:**

- **A section always has an `actions` array.** `Talk` now has none. It joins `Overview` as a bare heading — render the caption, no checkbox, and recurse into `children`. Any code doing `node.actions.map(...)` without a guard will throw here.
- **A node's count equals its own actions plus its children's.** Still true — but Talk's own contribution is now zero.

### Sidebar — `GET /user/my-role`

`modules` is the same tree pruned to held codes, so the Talk branch renders per code:

| User holds | Sidebar shows |
| --- | --- |
| nothing Talk-related | *no Talk section at all* |
| `talk:access` only | Talk → **Open Talk** |
| `talk-monitoring:*` only | Talk → Monitoring |
| `talk:access` + both admin codes | Talk → **Open Talk**, Monitoring, Credential |

`Open Talk` is an external link out to the Talk app. `access.talk` in the same response is still the boolean shortcut for "may this person chat" — use whichever fits.

### Admin plan matrix — unchanged

The super-admin's entitlement screen (`/admin/organizations/:id/permissions`) still offers all three Talk children including `Open Talk`. The platform sells Talk on the subscription; only the **tenant's** role builder loses the checkbox.

---

## `GET /user/my-role` — shape unchanged, semantics changed

No field was added or removed. But:

- `access_level`, `company_ids`, `talk_enabled`, `talk_access` now come from the **user's** row, not their role's.
- `company_ids` / `talk_access` are named exactly as `GET /user/admin-users/:id` returns them — **one renderer draws both screens**. If you built a separate mapper for each, collapse them.
- `modules` reflects the new Talk tree (see above).

An **account owner** (`role_id` null, `is_owner` true) always reports `access_level: "GLOBAL"` with empty lists — they reach every company by construction.

---

## Known gaps

Two follow-ups are **not yet built**. Plan around them:

1. **A non-owner cannot currently obtain `talk:access` at all.** The role can no longer grant it, and nothing yet reads `users.talk_enabled` to mint it into the token. Until the `loadRole` derivation lands, `Open Talk` is **owner-only**. The Talk toggle on the Admin User form saves correctly and returns correctly — it just doesn't yet produce the code.
2. **Flipping the Talk toggle won't take effect until the user's next login**, once (1) lands, because the code will ride in the access token. Session-clearing on toggle is the second follow-up.

Everything in sections 1 and 2 above is safe to build against today.

---

## Heads-up: a third change landed on the same form

Separate work, not part of the two changes above, but it touches the **same Admin User form** so you'll hit it in the same sprint:

- `POST /user/admin-users` gained a **required `employee_id`** — the user is picked off `GET /user/employees/directory` rather than typed in. The employee must belong to the same company as `role_id`, and one employee may hold only one login (**409** otherwise).
- `PATCH /user/admin-users/:id` gained an optional `employee_id`; there's no way to clear it.
- `employee_id` is on the response objects too.

Confirm the details with whoever built it — it isn't covered by this document.

## Migration note

`20260819000000_move_access_scope_to_user` backfills every existing user from the role they point at, so **no reach is lost**. Users whose role was `GLOBAL` stay `GLOBAL`; users of a `COMPANY` role inherit that role's exact company and Talk lists. Account owners are set to `GLOBAL`.

Where two users shared one role, both inherit the same reach — and can now be edited apart, which is the point of the change.
