# Leave — User (Back Office) Panel

Frontend integration guide for `/user` leave screens: the register, the add/edit form,
the approve/reject queue, the balance card, and the two paid-allowance grids.

Every path below is prefixed `/user`. All requests need
`Authorization: Bearer <access token>`. Request keys and response fields are
`snake_case`.

---

## 1. The one rule you must build the UI around

**The employee (or the desk) picks a leave TYPE. Nobody picks paid or unpaid.**

Each leave type has its own yearly **paid allowance**. Days come out of that allowance
while it lasts; every day past it is **unpaid**, without limit.

```
Casual Leave, 12 allowed, 10 already used
    │
    ├── apply for 5 days
    │
    ├── days 1–2  → PAID    (the allowance had 2 left)
    └── days 3–5  → UNPAID  (past the allowance)
```

Three consequences the UI has to reflect:

1. **There is no `pay_type` field to send.** Not on the employee's form, not on the
   back office's. If you send one it is ignored — the server decides.
2. **A request is never refused for want of allowance.** Running out does not block the
   application, it just stops paying for it. Never show "not enough leave balance" as a
   blocking error.
3. **One request can become TWO rows** — a paid one and an unpaid one — sharing an
   `application_ref`. They are approved, rejected and deleted **together**.

**Allowances do not pool.** Casual leave never eats into the sick allowance. So a
headline "6 days available" can mean six sick days and zero casual ones. Always read
the per-type line before telling the user what they can take.

---

## 2. Endpoints

| # | Method & path | What it is |
|---|---|---|
| 1 | `GET /user/leave-types` | The company's leave catalog → the Leave Type dropdown (needs `company_id`) |
| 2 | `POST /user/employee-leaves` | Record a leave ("+ Add Leave") |
| 3 | `GET /user/employee-leaves` | The register / queue, paginated |
| 4 | `GET /user/employee-leaves/:id` | One row, for the edit dialog |
| 5 | `PATCH /user/employee-leaves/:id` | Edit |
| 6 | `PATCH /user/employee-leaves/:id/status` | Approve / Reject |
| 7 | `DELETE /user/employee-leaves/:id` | Delete |
| 8 | `GET /user/employee-leaves/balance` | Balance card for one employee |
| 9 | `POST /user/uploads/leave-attachment` | Presigned PUT for the proof file |
| 10 | `GET /user/employees/:id/leave-quotas` | An employee's paid-allowance grid |
| 11 | `PUT /user/employees/:id/leave-quotas` | Save that grid |
| 12 | `GET /user/designations/:id/leave-quotas` | A designation's paid-allowance grid |
| 13 | `PUT /user/designations/:id/leave-quotas` | Save that grid |

### Permissions

| Action | Code |
|---|---|
| List the register | `leaves:list` |
| Read a row, read the balance, read the employee grid | `leaves:read` |
| Record a leave | `leaves:create` |
| Edit, Approve / Reject, save the employee grid | `leaves:update` |
| Delete | `leaves:delete` |
| Read / save the **designation** grid | `designations:read` / `designations:update` |

Hide the button when the code is absent; a call without it answers `403`.

---

## 3. Record a leave — `POST /user/employee-leaves`

### Request

| Field | Type | Required | Rules |
|---|---|---|---|
| `employee_id` | int > 0 | **yes** | |
| `leave_type_id` | int > 0 | **yes** | must be a type of the employee's own company |
| `from_date` | `YYYY-MM-DD` | **yes** | must be **tomorrow or later** (IST business day) |
| `to_date` | `YYYY-MM-DD` | **yes** | `>= from_date` |
| `duration` | `FULL_DAY` \| `HALF_DAY` | no (default `FULL_DAY`) | |
| `from_time` | `HH:MM` or `HH:MM:SS` | only for `HALF_DAY` | 24-hour |
| `to_time` | `HH:MM` or `HH:MM:SS` | only for `HALF_DAY` | must be **after** `from_time` |
| `leave_reason` | string ≤ 2000 | no | |
| `attachment` | string ≤ 500 | no | the `key` from endpoint 9, never a file |
| `status` | `PENDING` \| `APPROVED` \| `REJECTED` | no (default `APPROVED`) | the desk recording a leave *is* the approval |

**No `pay_type`.** See §1.

```json
POST /user/employee-leaves
{
  "employee_id": 13,
  "leave_type_id": 17,
  "from_date": "2026-11-02",
  "to_date": "2026-11-06",
  "duration": "FULL_DAY",
  "leave_reason": "Viral fever",
  "status": "APPROVED"
}
```

### Response `201` — the APPLICATION, not a row

```json
{
  "application_ref": "3decfa12-8b41-4e0a-9c6d-2f7a1b5e93c4",
  "from_date": "2026-11-02",
  "to_date": "2026-11-06",
  "status": "APPROVED",
  "paid_days": 2,
  "unpaid_days": 3,
  "split": true,
  "rows": [
    {
      "id": 68, "application_ref": "3decfa12-…",
      "employee_id": 13, "employee_name": "Turbo emp", "employee_code": "emp-0000001",
      "company_id": 10,
      "from_date": "2026-11-02", "to_date": "2026-11-03",
      "duration": "FULL_DAY", "from_time": null, "to_time": null,
      "pay_type": "PAID",
      "leave_type_id": 17, "leave_type": "Sick Leave", "leave_type_name": "Sick Leave",
      "leave_reason": "Viral fever", "attachment": null,
      "status": "APPROVED", "status_remark": null,
      "status_at": "2026-08-22T12:00:00.000Z",
      "created_at": "2026-08-22T12:00:00.000Z"
    },
    {
      "id": 69, "application_ref": "3decfa12-…",
      "from_date": "2026-11-04", "to_date": "2026-11-06",
      "pay_type": "UNPAID",
      "leave_type_id": 17, "leave_type": "Sick Leave",
      "status": "APPROVED"
    }
  ]
}
```

**How to display it.** Show one confirmation, not two:

> Sick Leave, 2 Nov – 6 Nov 2026 — **2 days paid, 3 days unpaid**

When `split: true`, say so explicitly. The desk needs to know part of what it just
recorded is unpaid, because payroll will read it that way.

`leave_type` is a **snapshot** of the name at the time of filing; `leave_type_name` is
the catalog's current name (`null` if the type was deleted). Render `leave_type`.

---

## 4. The register — `GET /user/employee-leaves`

All query params optional:

| Param | Values |
|---|---|
| `company_id`, `employee_id`, `leave_type_id` | int |
| `pay_type` | `PAID` \| `UNPAID` |
| `duration` | `FULL_DAY` \| `HALF_DAY` |
| `status` | `PENDING` \| `APPROVED` \| `REJECTED` |
| `pending_with_me` | `true` → only what *you* are the approver for (implies `PENDING`) |
| `search` | 1–100 chars: employee name/code, reason, leave type |
| `from_date`, `to_date` | `YYYY-MM-DD` — an **overlap** window, not an exact match |
| `sort` | `employee_name` `from_date` `to_date` `from_time` `to_time` `pay_type` `leave_type` `duration` `status` |
| `sort_by` | `asc` \| `desc` |
| `limit` | 1–100, default 20 |
| `offset` | ≥ 0, default 0 |

```json
{
  "items": [
    {
      "id": 68,
      "application_ref": "3decfa12-…",
      "employee_id": 13, "employee_name": "Turbo emp", "employee_code": "emp-0000001",
      "company_id": 10,
      "from_date": "2026-11-02", "to_date": "2026-11-03",
      "duration": "FULL_DAY", "from_time": null, "to_time": null,
      "pay_type": "PAID",
      "leave_type_id": 17, "leave_type": "Sick Leave", "leave_type_name": "Sick Leave",
      "leave_reason": "Viral fever", "attachment": null,
      "status": "PENDING", "status_remark": null, "status_at": null,
      "pending_with_role": "HR", "pending_with_owner": false, "can_decide": true,
      "created_at": "2026-08-22T12:00:00.000Z", "created_by": "user:1",
      "created_by_name": "Admin User",
      "updated_at": "2026-08-22T12:00:00.000Z", "updated_by": null, "updated_by_name": null
    }
  ],
  "total": 7
}
```

### ⚠ The list is one row per ROW, not per application

A split request appears as **two entries**. **Group by `application_ref`** so it renders
as one line:

> Sick Leave · 2 Nov – 6 Nov · 2 paid + 3 unpaid · PENDING

The approval block is per row but identical across a group — read it off the first.

- `pending_with_role` — the hierarchy level holding it (`null` once decided)
- `pending_with_owner` — it fell through to the account owner
- `can_decide` — whether **you** may press the buttons. Draw Approve/Reject only when
  `true`; all three are `false`/`null` on a decided row.

---

## 5. Edit — `PATCH /user/employee-leaves/:id`

Every field optional. **Two different behaviours, and the UI should treat them as two
different actions:**

| Patch contains | Status allowed | Effect |
|---|---|---|
| only `leave_reason` and/or `attachment` | any | written to every row of the application; `id`s unchanged |
| any of `leave_type_id`, `from_date`, `to_date`, `duration` | **`PENDING` only** | re-runs the split; **rows are rewritten so their `id`s CHANGE** (`application_ref` stays) |

```json
PATCH /user/employee-leaves/68
{ "to_date": "2026-11-04" }
```

Response is the same application object as §3. **Re-bind from it** — do not assume the
`id` you sent still exists.

Trying to move the dates of a decided application:

```json
409/400 → { "message": "A approved leave cannot have its dates changed — remove it and file again" }
```

So: on a decided row, disable the type/date/duration inputs and leave only reason and
attachment editable.

---

## 6. Approve / Reject — `PATCH /user/employee-leaves/:id/status`

```json
{ "status": "APPROVED", "remark": "Approved by HR" }
```

| Field | Rules |
|---|---|
| `status` | `APPROVED` \| `REJECTED` — `PENDING` is not accepted |
| `remark` | ≤ 2000. **Required when `REJECTED`** — it is all the employee is told |

**Frontend validation:** make the remark box mandatory the moment Reject is selected.
Empty → `400 A rejection must carry a remark — the employee is told it`.

Response is the application object, with **every row** decided. Send any one row's id —
the whole group moves, and the employee gets **one** notification covering the full
range.

Other errors:
- `400 Leave is already approved` — decided once, never twice. Refresh the row.
- `403 This leave is with HR (level 2) of the approval hierarchy` — not your queue.
  This is why you check `can_decide` before drawing the button.

---

## 7. Delete — `DELETE /user/employee-leaves/:id`

`204`, no body. **Deletes the whole application** — both halves of a split. Warn
accordingly when `split: true`:

> This will remove all 5 days (2 paid, 3 unpaid).

---

## 8. Balance card — `GET /user/employee-leaves/balance`

| Param | Required | Notes |
|---|---|---|
| `employee_id` | **yes** | |
| `year` | no | 2000–2100, defaults to the current calendar year |

```json
{
  "year": 2026,
  "from_date": "2026-01-01",
  "to_date": "2026-12-31",
  "paid":   { "total": 18, "used": 19.5, "pending": 16, "available": 0.5, "overflow": 18 },
  "unpaid": { "used": 3.5, "pending": 3.5, "effective": 25 },
  "items": [
    { "leave_type_id": 16, "short_code": "CL", "leave_type": "Casual Leave",
      "pay_type": "PAID", "total": 12, "quota_source": "DESIGNATION",
      "used": 8, "pending": 14, "available": 0, "overflow": 10 },
    { "leave_type_id": 17, "short_code": "SL", "leave_type": "Sick Leave",
      "pay_type": "PAID", "total": 6, "quota_source": "DESIGNATION",
      "used": 3.5, "pending": 2, "available": 0.5, "overflow": 0 },
    { "leave_type_id": 18, "short_code": "PL", "leave_type": "Privilege Leave",
      "pay_type": "PAID", "total": 0, "quota_source": "NONE",
      "used": 7.5, "pending": 0, "available": 0, "overflow": 7.5 },
    { "leave_type_id": 20, "short_code": "LWP", "leave_type": "Leave Without Pay",
      "pay_type": "UNPAID", "total": 0, "quota_source": "NONE",
      "used": 3.5, "pending": 3.5, "available": null, "overflow": 0 }
  ]
}
```

### Reading it

**`items` is the real answer.** Per leave type:

- `total` — that type's yearly paid allowance
- `used` — already APPROVED · `pending` — awaiting a decision (already reduces what's free)
- `available` = `max(0, total − used − pending)` — **never negative**
- `overflow` = `max(0, used + pending − total)` — days past the allowance, unpaid in effect
- `quota_source` — `EMPLOYEE` (own grant) · `DESIGNATION` (role policy) · `NONE`

**`quota_source: "NONE"` with `total: 0` means NO PAID DAYS of that type — not
"unlimited".** Every day of it is unpaid. Do not render it as uncapped. It also does not
stop the employee applying.

An **UNPAID** type always shows `total: 0`, `available: null`, `overflow: 0`. Render
`available: null` as "Unlimited", never as `0`.

`paid` / `unpaid` are the lines added up, for the headline. Two traps:

- **`paid.available` is a SUM of per-type remainders.** `0.5` above is half a *sick* day
  and nothing else — it does **not** mean any particular type has room.
- `paid.used`/`pending` are summed from each leave row's own snapshot, not from `items`,
  so days under a **deleted** leave type count in the headline but appear in no line.
  `items` can therefore add up to **less** than the headline. Don't assert they match.

`unpaid.effective` = `unpaid.used + unpaid.pending + paid.overflow` — everything the
employee is not being paid for. Use this for payroll-facing summaries; use `overflow`
for the "you've exceeded the allowance" warning.

All numbers can be **fractional** (`0.5` for a half day). Don't render as integers.

---

## 9. Attachment upload — `POST /user/uploads/leave-attachment`

Three steps:

```
1. POST /user/uploads/leave-attachment
   { "content_type": "application/pdf", "file_name": "certificate.pdf" }
   → { "upload_url": "https://…", "key": "acct-6/leave/uuid-certificate.pdf" }

2. PUT <upload_url>  with the file and the SAME Content-Type header

3. Send `key` as `attachment` on the leave call
```

Accepted `content_type`: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
`file_name` optional (it only labels the key; the key stays server-generated).

Nothing is written to the DB at step 1 — an abandoned upload is harmless. To display a
stored attachment, prefix the key with `media_path` from `GET /config`.

---

## 10. The paid-allowance grids

This is where the allowances in §8 come from. Two tiers:

```
employee_leave_quota   (this employee, this type, THIS YEAR)   ← a GRANT
  ↓ no row
designation_leave_quota (their designation, this type)         ← a standing POLICY
  ↓ no row
NONE → no paid days of that type
```

The **designation** grid is the normal home of an allowance — set once, applies to
everyone in the role, no year. The **employee** grid is the per-year exception.

### 10a. `GET /user/designations/:id/leave-quotas`

```json
{
  "designation_id": 13,
  "designation_name": "HR",
  "company_id": 10,
  "items": [
    { "leave_type_id": 16, "short_code": "CL", "leave_type": "Casual Leave",
      "pay_type": "PAID", "annual_paid_leave": 12, "unlimited": false },
    { "leave_type_id": 17, "short_code": "SL", "leave_type": "Sick Leave",
      "pay_type": "PAID", "annual_paid_leave": 6, "unlimited": false },
    { "leave_type_id": 18, "short_code": "PL", "leave_type": "Privilege Leave",
      "pay_type": "PAID", "annual_paid_leave": null, "unlimited": false },
    { "leave_type_id": 20, "short_code": "LWP", "leave_type": "Leave Without Pay",
      "pay_type": "UNPAID", "annual_paid_leave": null, "unlimited": true }
  ]
}
```

- `unlimited: false` → a **PAID** type: editable number cell.
- `unlimited: true` → an **UNPAID** type: **render read-only as "Unlimited"**, no input.
  Unpaid from day one, so there is no allowance to set.
- `annual_paid_leave: null` → empty cell, nothing set at this level.

### 10b. `PUT /user/designations/:id/leave-quotas`

```json
{
  "rows": [
    { "leave_type_id": 16, "annual_paid_leave": 12 },
    { "leave_type_id": 17, "annual_paid_leave": 6 }
  ]
}
```

**WHOLE-LIST REPLACE.** `rows` is the complete grid. A type you leave out has its
allowance **cleared**. Always send every filled cell, never a partial patch.
`{"rows": []}` clears the level.

`annual_paid_leave`: integer `0`–`366`.

**`0` and omitting the row are different.** `0` = "no paid days of this type" (stored).
Omitted = "nothing set here" (falls back to the tier below). Your empty input box must
send **nothing**, not `0`.

Response is the freshly rendered grid — re-bind from it.

### 10c. `GET /user/employees/:id/leave-quotas?year=2026`

Same rows plus the tier below:

```json
{
  "employee_id": 13, "employee_name": "Turbo emp", "employee_code": "emp-0000001",
  "company_id": 10,
  "designation_id": 13, "designation_name": "HR",
  "year": 2026,
  "items": [
    { "leave_type_id": 16, "short_code": "CL", "leave_type": "Casual Leave",
      "pay_type": "PAID", "annual_paid_leave": 15, "unlimited": false,
      "falls_back_to": 12, "fallback_source": "DESIGNATION" },
    { "leave_type_id": 17, "short_code": "SL", "leave_type": "Sick Leave",
      "pay_type": "PAID", "annual_paid_leave": null, "unlimited": false,
      "falls_back_to": 6, "fallback_source": "DESIGNATION" },
    { "leave_type_id": 20, "short_code": "LWP", "leave_type": "Leave Without Pay",
      "pay_type": "UNPAID", "annual_paid_leave": null, "unlimited": true,
      "falls_back_to": null, "fallback_source": "NONE" }
  ]
}
```

Render an empty cell with a placeholder showing the inherited number:

> CL `[ 15 ]`  ← own grant, overriding HR's 12
> SL `[    ]`  placeholder "6 (from HR)"

`fallback_source: "NONE"` with `falls_back_to: null` = nothing configured anywhere →
every day of that type is unpaid. `designation_id: null` (no open posting, or one with
no designation) means every row falls back to `NONE`.

### 10d. `PUT /user/employees/:id/leave-quotas?year=2026`

Same body as 10b. Scoped to that year — other years untouched. `{"rows": []}` clears the
whole year. A type left out falls back to the designation.

### Grid save errors (all `400`, nothing written)

| Message | Cause |
|---|---|
| `Unknown leave type for this company: 99` | id from another company |
| `Leave type listed more than once: 16` | duplicate row |
| `These leave types are unpaid and have no paid allowance to set: LWP` | you sent an `unlimited: true` row |

Prevent all three client-side: build rows from the returned `items`, skip
`unlimited: true`, and skip empty cells.

---

## 11. Frontend validation checklist

**Add / Edit form**

- [ ] `leave_type_id` required — populate from `GET /user/leave-types`
- [ ] `from_date` ≥ **tomorrow** (IST). Disable today and earlier in the picker
- [ ] `to_date` ≥ `from_date`
- [ ] `HALF_DAY` → `from_time` and `to_time` both required, `to_time` > `from_time`
- [ ] `HALF_DAY` → **`from_date` must equal `to_date`** (a half day covers one day)
- [ ] `FULL_DAY` → do **not** send the two times
- [ ] `leave_reason` ≤ 2000 chars
- [ ] `attachment` — send the `key`, never the file; `image/jpeg|png|webp` or `application/pdf`
- [ ] **Never** send `pay_type`
- [ ] Do **not** block on "insufficient balance" — running out is allowed, it just means unpaid
- [ ] **Do** warn before submit when the range exceeds that type's `available` (read it from §8)

**Approve / Reject**

- [ ] Draw the buttons only when `can_decide === true`
- [ ] `remark` mandatory when Reject is chosen
- [ ] Disable after one decision (`status !== "PENDING"`)

**Edit restrictions**

- [ ] On a decided application, lock `leave_type_id` / `from_date` / `to_date` / `duration`
- [ ] After a date/type edit, **re-bind from the response** — row `id`s change

**Lists**

- [ ] Group by `application_ref` so a split request is one line
- [ ] Delete / approve warns that it affects the whole application when `split: true`
- [ ] Treat all day counts as fractional

**Grids**

- [ ] Always send the complete `rows` (whole-list replace)
- [ ] `unlimited: true` → read-only "Unlimited", never in the payload
- [ ] `0` ≠ empty. Empty box sends nothing
- [ ] `annual_paid_leave` integer 0–366

**Balance card**

- [ ] `available: null` renders "Unlimited"
- [ ] `quota_source: "NONE"` renders "not configured" / "unpaid", **never "unlimited"**
- [ ] Don't sum `items` and expect `paid` to match

---

## 12. Worked example

Sick Leave allows 6 paid days a year. The employee has used 3.5 and has 2 pending — so
`available: 0.5`. The desk records **5 more sick days**.

The half-day remainder cannot pay for a whole day, so:

```json
{ "paid_days": 0, "unpaid_days": 5, "split": false,
  "rows": [ { "pay_type": "UNPAID", "from_date": "2026-11-02", "to_date": "2026-11-06" } ] }
```

Show: **"Sick Leave, 2–6 Nov — all 5 days unpaid (paid allowance exhausted)."**

Casual Leave is **unaffected** — it has its own 12 and its own remainder. Allowances
never pool.
