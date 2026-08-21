================================================================================
MAAM CHANGES — BACKEND WORK DONE, AND WHAT THE FRONTEND MUST DO
================================================================================

Four pieces of work landed on the API. This file says, for each one, what
changed on the backend, why, and exactly what the frontend has to change.

  1. Shift Rotation module REMOVED
  2. Employee Experience — verification block, contact email, CTC type
  3. Hierarchy Management -> Leave (leave approval chain)
  4. Shifts get an effective_date + update history, and Week-Off gets a
     "any N days a week" option

Conventions that have not changed:
  - Every request field and every response field on the wire is snake_case.
  - All routes below are under the /user audience prefix.
  - Dates on the wire are YYYY-MM-DD. Times are 24-hour HH:MM.

--------------------------------------------------------------------------------
BEFORE YOU START: FIVE MIGRATIONS ARE PENDING
--------------------------------------------------------------------------------

None of the database migrations have been run yet. Nothing below works against
a database until they are applied:

  20260902000000_drop_shift_rotations
  20260903000000_employee_experience_verification
  20260904000000_leave_approval_hierarchy
  20260905000000_shift_versions
  20260906000000_weekoff_flexible

Coordinate the deploy: the API and the DB must move together, and 20260905
drops columns from `shifts` after copying them into a new table, so take a
snapshot before it runs.


================================================================================
1. SHIFT ROTATION MODULE — REMOVED ENTIRELY
================================================================================

WHAT THE BACKEND DID
--------------------
The whole Shift Rotation feature is gone: the module, the routes, the domain
types, the repository, the two tables (`shift_rotations`,
`shift_rotation_details`) and the `rotation_id` column on the employee shift
assignment.

WHAT THE FRONTEND MUST DO
-------------------------

(a) DELETE the Shift Rotations screen and its sidebar entry.
    The menu node lived at Master Data Setup -> HR Setup -> Shift Rotations.
    It is no longer in the permission tree, so if your sidebar is rendered
    from `GET /user/my-role` it will disappear on its own — but any hardcoded
    route, link or lazy-loaded page must be removed by hand.

(b) THESE ENDPOINTS ARE GONE (they will 404):
      GET    /user/shift-rotations
      POST   /user/shift-rotations
      GET    /user/shift-rotations/:id
      PATCH  /user/shift-rotations/:id
      DELETE /user/shift-rotations/:id

(c) THESE PERMISSION CODES NO LONGER EXIST — remove every check on them:
      shift-rotations:list
      shift-rotations:read
      shift-rotations:create
      shift-rotations:update
      shift-rotations:delete

(d) EMPLOYEE SHIFT ASSIGNMENT — the rotation option is gone.

    POST /user/employees/:id/shifts
      REMOVED from the request body: `rotation_id`
      The body is now just:
        { "shift_id": 12 | null, "effective_date": "2026-09-01" }

      IMPORTANT SEMANTIC CHANGE. Ending an assignment used to mean "send
      neither shift_id nor rotation_id". It now means "send no shift_id"
      (omit it, or send null). It still says "back to the department or
      company default from this date on", and the timeline is still
      append-only — you never delete a row to revert.

    GET /user/employees/:id/shifts   (the assignment timeline)
      REMOVED from each row: `rotation_id`, `rotation_name`

    Remove the Shift/Rotation toggle from the assignment dialog. It is now a
    single shift picker plus a date.

(e) THE RESOLUTION `source` ENUM LOST A VALUE.

    Anywhere you render "where did this shift come from", the enum is now:
      "roster" | "assignment" | "department" | "company"      (was 5 values)

    `"rotation"` will never be returned again. Affected fields:
      GET /user/employees/:id/shift          ->  `source`
      GET /user/attendance/...               ->  `shift_source`
      GET /employee/me                       ->  `shift_source`
      the break panel                        ->  `shift_source`

    If you have a switch/map on these values, drop the rotation branch.

(f) THE ROSTER `source_type` ENUM LOST A VALUE.
      "MANUAL" | "POLICY"                                     (was 3 values)
    `"ROTATION"` is gone — it was reserved for a rotation generator that can
    no longer exist.

(g) The shift delete 409 message changed wording (no longer mentions a
    rotation). If you match on the message text, stop — match on the status.


================================================================================
2. EMPLOYEE EXPERIENCE — VERIFICATION, CONTACT EMAIL, CTC TYPE
================================================================================
Wizard step 5b (Experience Details).

WHAT THE BACKEND DID
--------------------
Five new columns on `employee_experience`:
  contact_email        the referee's email, beside the name and number
  ctc_type             MONTHLY | YEARLY — what `salary` is quoted for
  is_verified          did somebody in HR actually ring the referee
  verified_by          the users.id who vouched for the claim
  verification_review  what the referee said

A database CHECK ties the last three into ONE statement:
  verified   => verified_by is required, verification_review optional
  unverified => both MUST be null
So a remark nobody signed, or a verifier on a row that reads as unverified, is
impossible.

WHAT THE FRONTEND MUST DO
-------------------------

(a) NEW REQUEST FIELDS on
      POST  /user/employees/:id/experiences
      PATCH /user/employees/:id/experiences/:experience_id

      contact_email        string, valid email, max 255, nullable, optional
      ctc_type             "MONTHLY" | "YEARLY", nullable, optional
      is_verified          boolean, optional
      verification_review  string, max 2000, nullable, optional

    *** DO NOT SEND `verified_by`. It is NOT accepted. ***
    The API stamps the LOGGED-IN user automatically whenever
    `is_verified: true` arrives. This is deliberate: nobody can attribute a
    verification to a colleague. If you send it, it is ignored.

(b) NEW RESPONSE FIELDS on every experience response:
      contact_email        string | null
      ctc_type             "MONTHLY" | "YEARLY" | null
      is_verified          boolean
      verified_by          number | null      (a users.id)
      verification_review  string | null

    LIST ROWS ONLY (GET /user/employees/:id/experiences) additionally carry:
      verified_by_name     string | null      (the verifier resolved to a name)

    Render the name on the list; the single-row GET keeps the shape it had
    plus the five fields above, with no name.

(c) UI RULES YOU MUST ENFORCE, or you will get a 400:

    CREATE:
      - Sending `verification_review` without `is_verified: true` is a 400.
        Keep the remark field disabled until the Verified switch is on.

    PATCH — the verification block moves as a UNIT:
      - `is_verified: true`   -> (re-)stamps YOU as the verifier. If you send
                                 no remark the stored one is kept.
      - `is_verified: false`  -> clears BOTH the verifier and the remark.
                                 Sending a non-null remark alongside it is a
                                 400 (it is a contradiction, not a partial
                                 instruction).
      - `is_verified` OMITTED -> you may edit `verification_review` alone, but
                                 ONLY on a row that is already verified.
                                 Otherwise 400.

    Suggested form behaviour: a "Verified" switch; turning it on reveals the
    remark textarea; turning it off greys out and clears the remark. Show
    `verified_by_name` and the audit timestamp as read-only text once verified.

(d) `ctc_type` belongs next to the existing `salary` field. Label it something
    like "Salary is" / "CTC Type" with the two options. It is nullable — rows
    entered before this change do not say, so render a blank rather than
    defaulting to a guess.


================================================================================
3. HIERARCHY MANAGEMENT -> LEAVE (THE LEAVE APPROVAL CHAIN)
================================================================================

WHAT THE BACKEND DID
--------------------
The account owner authors ONE ordered chain of ROLE NAMES — for example
HR -> Manager -> Team Leader — and EVERY company of the account follows it.
There is nothing to set up per company; that is the whole point.

For a given employee's leave, the approver is the FIRST level in the chain
that has a live user who can REACH that employee's company. If no level has
one, the leave falls to the ACCOUNT OWNER, who is the chain's implicit last
link.

Why role NAMES and not role ids: roles are company-scoped, so one account
legitimately holds three separate "HR Manager" rows, one per company. An
account-level chain naming an id would route only one company's leave. The
name is the only thing those rows share.

Why "reach" and not the role's own company: one GLOBAL "HR" user covers all
ten companies without a role being authored in each. An account that runs a
separate HR per site is served by the same rule, because each of those users
reaches only their own site.

*** THE EMPTY CHAIN IS THE OFF SWITCH. *** An account that has configured
nothing behaves exactly as it did before this feature existed: anyone holding
`leaves:update` can decide any leave. Routing begins only when the owner saves
a chain.

NEW PERMISSION CODES
--------------------
  hierarchy:read                  see the Hierarchy Management menu
  leave-approval-chain:read       view the chain          (grantable to a role)
  leave-approval-chain:update     set the chain           (OWNER ONLY)

`leave-approval-chain:update` is NOT offered by the role builder — same
treatment as `roles:*`. Whoever edits the chain chooses who approves leave, so
a role holding it could route every application in the account to itself. Only
the account owner gets it.

NOTE FOR THE PLATFORM/ADMIN SIDE: because an owner's permissions are their
subscription's plan_permissions, these three codes must be ticked onto each
account's subscription (PATCH /admin/organizations/:id/permissions) before its
owner can reach the screen. Nothing is granted by default.

NEW ENDPOINTS
-------------

  GET /user/leave-approval-chain
  Response:
  {
    "levels": [
      { "level": 1, "role_name": "HR",          "user_count": 3, "companies_covered": 4 },
      { "level": 2, "role_name": "Manager",     "user_count": 1, "companies_covered": 1 },
      { "level": 3, "role_name": "Team Leader", "user_count": 0, "companies_covered": 0 }
    ],
    "company_count": 6,
    "companies_with_owner": [ { "id": 9, "name": "Surat Unit" } ]
  }

  Render `user_count: 0` as a WARNING on that row — it is a dead link the
  chain silently skips. `companies_covered` short of `company_count` is not an
  error; that is why there is a level below. `companies_with_owner` names the
  companies whose leave waits on the owner personally.

  GET /user/leave-approval-chain/roles
  Response: { "role_names": ["Accountant", "HR", "Manager", "Team Leader"] }
  Distinct role names across the whole account — the picker's options.

  PUT /user/leave-approval-chain
  Body:  { "role_names": ["HR", "Manager", "Team Leader"] }
  Response: the same shape as the GET above.

  THE ARRAY ORDER IS THE ORDER OF AUTHORITY. Index 0 decides; index 1 decides
  when index 0 has nobody who reaches the company.
  Sending [] CLEARS the chain and switches routing off.
  A role may appear only once (400 otherwise).
  Each name must be a role that exists somewhere in the account (400 naming
  the offenders otherwise) — a typo would silently never match and route the
  leave one authority too high with no error anywhere.

  UI: a drag-to-reorder list built from /roles, plus Save. Whole list every
  time — there is no per-level endpoint, because inserting a level renumbers
  everything below it.

CHANGES TO THE EXISTING LEAVE SCREENS
-------------------------------------

(a) EVERY LEAVE ROW now carries an approval block:

      pending_with_role   string | null   the chain level holding it, e.g. "HR"
      pending_with_owner  boolean         it has fallen through to the owner
      can_decide          boolean         may YOU press Approve / Reject

    All three are null/false on an already-decided row — there is no decision
    left to own, and drawing a button there would produce a 400.

    Read them as one statement, not three flags. `can_decide` describes YOU;
    the other two describe the ROW. An owner sees `can_decide: true` on a row
    that says `pending_with_role: "HR"`, because the owner decides anything.

    *** DRIVE THE APPROVE / REJECT BUTTONS OFF `can_decide`. *** Do not infer
    it from the permission code any more — `leaves:update` now only says you
    may work a leave desk, not that this particular application is yours.

    Present on:
      GET /user/employee-leaves          (list rows, alongside the audit block)
      GET /user/employee-leaves/:id      (the detail screen — this is new here)

(b) NEW QUERY PARAM on GET /user/employee-leaves:

      pending_with_me=true

    Your own queue. Implies status=PENDING. For an approver it is the
    companies where you are the level that answered. FOR THE OWNER it is the
    FALL-THROUGH — the companies no level covers, i.e. the ones only they can
    clear. Add it as a tab beside the existing status tabs.

    VISIBILITY IS NOT ROUTING. The plain list is unchanged: the owner goes on
    seeing every company's rows whether or not any hierarchy user can. The
    hierarchy decides who may APPROVE, never who may LOOK.

(c) PATCH /user/employee-leaves/:id/status — two changes:

    - `remark` is now REQUIRED when `status: "REJECTED"`. A rejection with no
      reason leaves the employee nothing to act on. Make the field mandatory
      in the reject dialog; a blank one is a 400.

    - A 403 is now possible even with `leaves:update`, when the leave is on
      somebody else's level. The message names that level, e.g.
        "This leave is with HR (level 1) of the approval hierarchy"
        "This leave is with the account owner — no level of the approval
         hierarchy covers this company"
      Surface the message; it tells the user who to chase.


================================================================================
4a. SHIFTS — EFFECTIVE DATE AND UPDATE HISTORY
================================================================================

WHAT THE BACKEND DID
--------------------
A shift is now a TIMELINE. `shifts` keeps the identity (company, name,
status); every RULE — the times, break, concession, grace, day-length
thresholds, both penalties, the week-off policy — lives on dated versions.

THE PROBLEM THIS FIXES. Editing a shift used to overwrite it. A company moving
General from 09:00-18:00 to 08:00-17:00 did not just change tomorrow, it
changed LAST MONTH: every closed attendance day re-resolved against the new
times, so a punch at 08:50 that had been fifty minutes early became ten
minutes late, and a payslip recomputed after the edit disagreed with the one
already paid.

Now an edit WRITES A NEW VERSION from a date you name. Days before it go on
resolving against the version that was in force when they happened. The
attendance engine reads the shift AS OF the day it is stamping.

Which version answers a day: the greatest effective_date <= that day; and if
the day precedes every version, the earliest one (so history older than the
shift itself still resolves).

WHAT THE FRONTEND MUST DO
-------------------------

(a) POST /user/shifts — `effective_date` is now REQUIRED.
      "effective_date": "2026-09-01"
    Add a date field to the create form. It is the day these timings start
    applying and it opens the shift's timeline.

(b) PATCH /user/shifts/:id — `effective_date` is optional but you should
    ALWAYS SEND IT when the timings change.

      WITH a date     -> writes a NEW version from that day. History is kept.
                         This is what the user means by "change the shift".
      WITHOUT a date  -> AMENDS the version currently in force, rewriting
                         history with it. Only correct for fixing a typo in
                         timings nobody has worked yet.

      Re-sending a date that already has a version amends that version rather
      than stacking a second rule set on the same day.

      `name` and `status` are NOT versioned. They apply at once, whatever date
      accompanies them. A patch that touches only name/status writes no
      version at all.

    SUGGESTED UI: in the edit dialog, put "These timings apply from
    [date picker]" above the time fields, defaulting to today. If the user
    only edits the name, do not send a date.

    The response is the shift AS OF the date just written, so it shows what
    was saved rather than today's still-current timings. If you future-date a
    change, the row in your list will still show the OLD timings until that
    date arrives — that is correct, not a bug.

(c) NEW RESPONSE FIELDS on every shift response (get, list, create, update):

      version_id      number     which version these timings are
      effective_date  string     the day that version took effect

    The same shift id legitimately reports different timings for different
    days. Show `effective_date` on the shift detail screen.

(d) NEW ENDPOINT — THE UPDATE HISTORY (the screen Maam asked for):

      GET /user/shifts/:id/history

      {
        "items": [
          {
            "id": 41,
            "shift_id": 7,
            "effective_date": "2026-09-01",
            "start_time": "08:00",
            "end_time": "17:00",
            "is_night_shift": false,
            "break_minutes": 60,
            "is_late_break_penalty_applicable": false,
            "concession_minutes": 15,
            "is_late_check_in_penalty_applicable": false,
            "late_check_in_penalty_type": null,
            "late_check_in_penalty_value": null,
            "early_exit_grace_minutes": 0,
            "min_full_day_hours": 8,
            "min_half_day_hours": 4,
            "weekoff_policy_id": 3,
            "is_current": true,
            "created_at": "...", "created_by": "...", "created_by_name": "Rita",
            "updated_at": "...", "updated_by": "...", "updated_by_name": null
          },
          { ... the 09:00-18:00 version, effective_date "2026-01-01",
                is_current: false ... }
        ],
        "total": 2
      }

      Newest first. EXACTLY ONE row carries `is_current: true` — the version
      in force TODAY, which is NOT always the top row, because a change can be
      dated in the future. Badge that row "Current" and any row with a future
      `effective_date` "Scheduled".

      Only the versioned rules appear. `name` and `status` are absent on
      purpose: repeating today's name on every historical row would suggest
      the shift had always been called that.

      Gated on `shifts:read` — no new permission code.

      SUGGESTED UI: a "History" tab or a clock icon on the shift row, opening
      a timeline table: Effective From | Timings | Break | Concession |
      Changed By | Changed On. This is what answers "why was this employee
      marked late on 12 August?".


================================================================================
4b. WEEK-OFF — "ANY N DAYS A WEEK" (no weekday named)
================================================================================

WHAT THE BACKEND DID
--------------------
A week-off policy could only ever name WEEKDAYS. That covers an office and
cannot describe a shop, a warehouse or a hospital, where the business runs
seven days and each person takes one day off whenever the rota allows. Under
the old model those employees were absent on the day they rested and present
on the Sunday they worked — wrong twice.

`weekoff_policies` now has two shapes, chosen with `off_type`:

  FIXED     (default, and what every existing policy is)
            names the weekdays in `days`, exactly as before.
            `weekly_off_days` is null.

  FLEXIBLE  names a COUNT: `weekly_off_days` days off a week, ANY days.
            `days` MUST be empty — a named day would contradict the count.

WHAT THE FRONTEND MUST DO
-------------------------

(a) NEW REQUEST FIELDS on
      POST  /user/weekoff-policies
      PATCH /user/weekoff-policies/:id

      off_type         "FIXED" | "FLEXIBLE", optional, defaults to FIXED
      weekly_off_days  integer 1-6, nullable, optional

    RULES (400 otherwise):
      FLEXIBLE  requires `weekly_off_days` and requires `days` to be []
      FIXED     must NOT carry `weekly_off_days`

    On PATCH, switching `off_type` to FLEXIBLE CLEARS any weekday rules the
    policy still had. Switching back to FIXED means you must send the rules,
    or the policy says nothing at all.

(b) NEW RESPONSE FIELDS on every week-off policy response:
      off_type         "FIXED" | "FLEXIBLE"
      weekly_off_days  number | null
    `days` is always [] for a FLEXIBLE policy.

(c) SUGGESTED UI: a radio at the top of the policy form —
      ( ) Fixed days     -> shows the existing weekday grid
      ( ) Any days       -> shows a single number input,
                            "employees may take [1] day(s) off per week"
    Hide the weekday grid entirely in the second mode.

(d) *** THE PART THAT WILL SURPRISE YOU. ***

    Under a FLEXIBLE policy NOTHING IS OFF IN ADVANCE. That is the point — the
    employee has not taken their day yet, and badging a Sunday they then work
    would be wrong.

    So:
      - `is_week_off` is FALSE for every day of a flexible policy, on
        /user/employees/:id/shift, on /employee/me, on the today card and on
        the attendance register. DO NOT render a week-off badge from it in
        advance, and do not treat false as "must work".
      - The days are credited AFTERWARDS, on the attendance month grid. The
        first `weekly_off_days` days of each week (MONDAY to SUNDAY) that the
        employee did not work come back with `status: "weekly_off"`; only the
        days beyond that are `"absent"`. Days already accounted for — a
        holiday, an approved leave, a future day — are never spent on the
        allowance, and a day the employee worked is never retrospectively a
        day off.
      - A week clipped by the edge of the month grid is judged on the days the
        grid contains. A week split across two months will therefore be judged
        in each half separately. This is deliberate; the alternative credits
        the same week twice.

(e) NEW FIELD in the resolved-shift block (wherever `shift_source` and
    `weekoff_days` already appear — /user/employees/:id/shift, /employee/me,
    the attendance views, the break panel):

      weekoff_flexible_days   number | null

    When it is SET, `weekoff_days` is empty and `is_week_off` is false, and
    NEITHER means "nothing is off". Use it to render the right caption, e.g.
    "Any 1 day off per week" instead of an empty weekday list.

    When it is NULL, read `weekoff_days` and `is_week_off` exactly as before.


================================================================================
QUICK CHECKLIST FOR THE FE TEAM
================================================================================

REMOVE
  [ ] Shift Rotations screen, route, sidebar entry, API client, types
  [ ] `rotation_id` / `rotation_name` from the employee shift assignment
  [ ] "rotation" from the shift `source` / `shift_source` enums
  [ ] "ROTATION" from the roster `source_type` enum
  [ ] the five shift-rotations:* permission checks

ADD — Employee Experience (step 5b)
  [ ] contact_email field
  [ ] ctc_type select (MONTHLY / YEARLY) next to salary
  [ ] Verified switch + remark textarea, with the enable/clear rules above
  [ ] verified_by_name shown read-only on the list
  [ ] never send verified_by

ADD — Hierarchy Management
  [ ] new sidebar section: Administration -> Hierarchy Management -> Leave
  [ ] the chain screen: ordered role list, drag to reorder, whole-list PUT
  [ ] coverage warnings (user_count 0, companies_with_owner)
  [ ] approval block on leave rows; buttons driven by can_decide
  [ ] "Pending with me" tab (pending_with_me=true)
  [ ] remark REQUIRED on reject
  [ ] surface the 403 message when the leave is on another level

ADD — Shifts
  [ ] effective_date on the create form (required)
  [ ] "These timings apply from" on the edit form
  [ ] version_id / effective_date shown on the detail screen
  [ ] History tab -> GET /user/shifts/:id/history, with Current / Scheduled
      badges driven by is_current and the date

ADD — Week-Off
  [ ] Fixed / Any-days radio, with the count input
  [ ] off_type + weekly_off_days sent and displayed
  [ ] flexible caption from weekoff_flexible_days
  [ ] stop treating is_week_off:false as "must work" under a flexible policy

================================================================================
