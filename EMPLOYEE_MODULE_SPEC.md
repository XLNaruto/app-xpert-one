# Employee Module — Implementation Spec (9 Tabs)

Portable specification extracted from `src/pages/humanResource/employee`.
Use this document to re-implement the same Employee Add/Edit wizard in another project.

---

## 0. Module Overview

### 0.1 Files → Responsibility

| File | Role |
|---|---|
| `AddEmployee.tsx` | Wizard shell: 9 tabs, progress, lock/unlock, save-flow routing |
| `basicDetail/AddBasicDetail.tsx` | Tab 1 container (5 sections + photo) |
| `basicDetail/AddPersionlaDetail.tsx` | Tab 1 → Personal section |
| `../../supervisor/AddAddressDetail.tsx` | Tab 1 → Address section (shared component) |
| `basicDetail/AddContactDetail.tsx` | Tab 1 → Contact section |
| `basicDetail/AddServiceDetail.tsx` | Tab 1 → Service + Leaving section |
| `basicDetail/AddOtherDetail.tsx` | Tab 1 → Health section |
| `KycDetail.tsx/AddKycDetail.tsx` | Tab 2 |
| `wageStructure/AddWageStructure.tsx` | Tab 3 (read-only view) |
| `family/AddFamily.tsx` | Tab 4 (repeatable rows) |
| `education/AddEducation.tsx` | Tab 5 (2 repeatable lists) |
| `document/AddDocument.tsx` | Tab 6 (repeatable + file upload) |
| `assets/AddAssets.tsx` | Tab 7 (repeatable rows) |
| `departmentTransferHistory/*` | Tab 8 (table + 4 modals) |
| `leaveManagement.tsx/AddLeaveManagment.tsx` | Tab 9 (form + history table) |
| `EmployeeDetail.tsx` | Read-only 360° view page (separate route) |
| `ViewEmployee.tsx` | Employee list page (entry point) |
| `appointmentLetter/*` | Appointment letter print/PDF (separate route) |

### 0.2 Shared Dependencies To Port

```
@/utils/useRHFForm            → Formik-compatible wrapper over react-hook-form + Yup
@/utils/RHFFormContext        → RHFFormProvider (needed by all Formik*/ReactSelect fields)
@/utils/reusableInput         → InputField, SelectField, TextareaField, CombinedInputField,
                                ReactSelectField, SwitchInput, MiniToggle, ToggleCard,
                                FileUploadField, isKeyAllowed, sanitizePaste
@/utils/FormikReactSelect     → FormikReactSelect (single async/static select)
@/utils/FormikReactMultiSelect→ FormikReactMultiSelect (infinite-scroll select)
@/utils/CheckedInputField     → CheckedInputField + DuplicateCheckProvider (duplicate popup)
@/utils/masterAsyncSelects    → CountryAsyncSelect, StateAsyncSelect, CityAsyncSelect
@/utils/ApiHelper             → postData(url, payload, apiHeader(isMultipart))
@/utils/Reusable              → encrypt, decrypt, getEncodedCookie, DeleteSweetAlert, formateForTable
@/utils/generateId            → row key generator for repeatable lists
@/data/masterList             → getMasterList(type, params, term, staleSeconds)
@/data/data                   → all static option arrays (see §0.4)
@/store/useLoaderStore        → useSelectedCompany()
@/hooks/useMenuIdPermissions  → { canEdit }
@tanstack/react-query, react-router, yup, dayjs(+customParseFormat), sonner(toast),
lucide-react, smooth-scroll-into-view-if-needed, mammoth (docx preview)
```

### 0.3 API Endpoint Inventory

| Endpoint | Used by |
|---|---|
| `employee/getEmployeeById` | shell, detail view |
| `employee/getCompletedSteps` | shell (progress + tab locks) |
| `employee/saveEmployeeDetail` | Tab 1 (**multipart/FormData**) |
| `employee/saveKycDetail` | Tab 2 |
| `employee/getWageStructure` | Tab 3, Tab 8 modal |
| `employee/getFamilyDetail` / `saveFamilyDetail` | Tab 4 |
| `employee/getEducationExperienceDetail` / `saveEducationExperienceDetail` | Tab 5 |
| `employee/getDocumentDetail` / `saveDocumentDetail` | Tab 6 (JSON) |
| `employee/uploadEmployeeDocument` | Tab 6 (**multipart**, per-file) |
| `common/removeFile` | Tab 6 (delete replaced file) |
| `employee/getAssetDetail` / `saveAssetDetail` | Tab 7 |
| `employee/getEmployeeService` | Tab 8 table |
| `employee/saveEmployeeService` | Tab 8 add/edit/transfer |
| `employee/leaveEmployeeService` | Tab 8 leaving modal |
| `employee/compareDepartmentSalaryComponents` | Tab 8 dept-change comparison |
| `employee/getLeaveDetail` / `saveLeaveDetail` | Tab 9 |
| `employee/checkDataExistence` | duplicate check (Tabs 1 & 2) |
| `master/designation/list`, `master/center/list` | infinite-scroll selects |
| `getMasterList('<type>')` | branch, department, block, bank, board, documentType, document, assets, leaveType, company, center, pfRate, esic, ptRate |
| `reports/salary/gross` | gross salary widget |

### 0.4 Static Option Sets (`@/data/data.ts`)

```ts
PREFIX_OPTIONS        = Mr | Mrs | Ms | Dr                       // default 'Mr'
GENDER (inline)       = Male | Female | Transgender | Not Specified
MARTIAL_STATUS_OPTIONS= Married | UnMarried | Divorced | Widow | Widower | Not Specified
RELATION_OPTIONS      = Father | Husband | Mother | Brother | Sister | Spouse | Son | Daughter | Guardian
NATIONALITY (inline)  = ['INDIAN']                               // default 'INDIAN'
BLOOD_GROUP_OPTIONS   = Not Specified | A+ | B+ | AB+ | O+ | A- | B- | AB- | O-   // default 'Not Specified'
HEIGHT_UNIT_OPTIONS   = CM | Inch | Feet                         // default 'CM'; weight unit fixed 'Kg'
GRADE_OPTIONS         = SKILLED | HIGH-SKILLED | SEMI-SKILLED | UN-SKILLED | FIXED-SALARY
EMPLOYMENT_TYPE_OPTIONS = Permanent | Contractual
SOURCE_TYPE_OPTIONS   = In House | Out House
CONTRACT_TYPE_OPTIONS = YEAR | MONTH | DAY
SALARY_TYPE_OPTIONS   = Daily | Monthly (label "Fix (Monthly)")
WEEKLY_OFF_OPTIONS    = Sunday…Saturday | None
LEAVE_TYPE_OPTIONS    = Functional/Ritual | Casual (CL) | Sick (SL) | Privilege (PL) | Marriage | Maternity | Paternity
ASSET_STATUS_OPTIONS  = ASSIGNED | RETURNED | LOST                // default 'ASSIGNED'
DEFAULT_COUNTRY_ID    = India id (address default)
```

### 0.5 Global Conventions (apply to every tab)

1. **Date format** — UI/state always `DD/MM/YYYY`; API always `YYYY-MM-DD`. Every tab defines
   `formatDateForApi()` (parse both formats, output ISO) and `toDisplayDate()` (ISO → display).
2. **Response check** — success only when `String(res.status)==='200' && String(res.data.status)==='200'`.
   Else `toast.error(res.data.message || 'Something went wrong')`.
3. **Booleans** — API sends `'Yes'/'No'`; forms hold real booleans. Convert both ways
   (`toBool = v => v===true || v==='Yes' || v==='true'`).
4. **Three save buttons on every editable tab**
   - `Save/Update <Tab>` → save, then advance to next tab (`onSaveSuccess`)
   - `Save & Close` (emerald) → save, then redirect to employee list (`onSaveAndClose`)
   - `Save & Add New` (violet) → save, then reset whole wizard to blank Tab 1 (`onSaveAndAddNew`)
   - plus `Cancel` (goBack → previous tab, or list if on Tab 1)
   Button labels flip to `Update…` when the tab is already completed / employee exists.
5. **Repeatable-list pattern** (Tabs 4, 5, 6, 7) — parent holds `string[]` of `generateId()` keys;
   each row is its own child form exposing `{ validate(), getValues() }` via
   `forwardRef + useImperativeHandle`. Parent's `handleSaveAll()` awaits every row's `validate()`,
   aborts if any fails, then posts one array payload. Row delete requires `DeleteSweetAlert`
   confirmation and is blocked when only one row remains. Existing rows carry their PK
   (`employeefamilyId` / `employeeeducationId` / `employeeexperienceId` / `employeedocumentId` /
   `employeeassetId`) and it is included in the payload only when present (upsert semantics).
6. **Company switch guard** — if the header company popup changes `selectedCompany` mid-form,
   the whole form is abandoned: `navigate('/employee', { replace:true, state:null })`.
7. **Record lock** — `getEmployeeById → isEditable === false` forces every tab to view-only
   (no editable field, no save button; `Close` replaces `Cancel`).

---

## 1. Wizard Shell (`AddEmployee.tsx`)

### 1.1 Tab definition (order matters)

```ts
const STEPS = [
  { value: 'basicdetail', label: 'Basic Detail' },
  { value: 'kyc',         label: 'KYC Detail' },
  { value: 'wage',        label: 'Wage Structure' },
  { value: 'family',      label: 'Family Detail' },
  { value: 'Education',   label: 'Education / Experience' },   // note capital E
  { value: 'documents',   label: 'Documents' },
  { value: 'assets',      label: 'Assets' },
  { value: 'department',  label: 'Employee Transfer History' },
  { value: 'leaving',     label: 'Leave Management' },
];
```

### 1.2 Progress ring

Only 7 tabs count toward completion (`department` and `leaving` are excluded):

```ts
PROGRESS_STEPS = ['basicdetail','kyc','wage','family','Education','documents','assets']  // total 7
COMPLETED_STEPS_KEY_MAP = {
  basicdetail: 'basicDetail',   kyc: 'kycDetail',    wage: 'wageStructure',
  family: 'familyDetail',       Education: 'educationAndExperienceDetail',
  documents: 'documentDetail',  assets: 'assets',
}
```

`employee/getCompletedSteps { employeeId }` → `Record<string, boolean>`.
`progress% = completedCount / 7 * 100`. Invalidate this query after **every** tab save.

### 1.3 Tab accessibility rules

- Tab index 0 (`basicdetail`) is **always** accessible.
- New employee (no `employeeId`) → every other tab locked.
- Once `completedSteps.basicDetail === true` → **all** other tabs unlock (including 8 & 9).
- While `completedSteps` is loading → permissive (don't lock).
- Blocked click → `toast.warning('Please complete "Basic Detail" before accessing other tabs.')`.
- Tab icon state: 🔒 locked (`Lock`, 40% opacity) / ✅ done (`CheckCircle2` emerald) / 🕐 pending (`Clock` amber).

### 1.4 Three entry modes

| Mode | Trigger | Behaviour |
|---|---|---|
| **Add** | `/employeeadd` (no state) | blank Tab 1, others locked |
| **Edit** | list Edit → `navigate('/employeeadd?employeeId=<encrypted>')` | all tabs editable |
| **Add-detail** | list → `state:{ employeeId, addDetailOnly:true }` | already-completed tabs become view-only; only incomplete tabs are editable (title: "Add Employee Detail") |
| **View-only** | `state:{ viewOnly:true }` or `isEditable===false` | everything read-only |

`isTabViewOnly(tab) = isViewOnly || (isAddDetailMode && completedSteps[apiKey])`.
Tabs 4–6 additionally receive split rights: `canEdit` (edit existing rows) vs
`canAdd` (add new rows) so a completed tab can still accept *new* entries in add-detail mode.

### 1.5 State & URL plumbing (important edge-cases to replicate)

- `employeeId` is kept in the URL **encrypted** (`encrypt()` + `encodeURIComponent`) so refresh
  and link-sharing work; active tab is kept as `?tab=<value>`.
- Only visited tabs are mounted (`mountedTabs: Set<string>`, `forceMount` + `data-[state=inactive]:hidden`)
  so hidden tabs never fire their loaders during the initial fetch.
- `isDataReady` gate shows a full-card spinner until fetched data has actually been written into
  `location.state` (`__loaded` flag) — otherwise tabs mount one cycle too early with empty state.
- `isClosingRef` guards against the post-save refetch resurrecting a pending "& Close" redirect.
- `employeeserviceId` may arrive as `employeeserviceId` / `employeeServiceId` / nested under `data`
  or `serviceDetail` → normalize with a single helper.
- Tab 1 save → sets `employeeId` + `employeeserviceId` → merges into router state → jumps to `kyc`.
- Save & Add New → `removeQueries(['employee-by-id'])`, clear ids, reset `mountedTabs`,
  bump a `tabsResetKey` on `<Tabs>` to force remount, `navigate('/employeeadd?tab=basicdetail', {state:null})`.

### 1.6 Next-tab routing after save

`basicdetail → kyc → wage → family → Education → documents → assets → department`;
`leaving` save → close the form.

### 1.7 Responsive nav

- `< lg`: progress bar + `‹ [select] ›` + dot indicators (locked options show 🔒 and are disabled).
- `≥ lg`: horizontal scrollable `TabsList` (auto-scrolls active tab into view) + `x/7 completed` + `%`.

---

## 2. TAB 1 — Basic Detail

**Component:** `basicDetail/AddBasicDetail.tsx` · **API:** `employee/saveEmployeeDetail` (**FormData**)
**Sections:** Photo · Personal · Address · Contact · Service · Health · Remark

### 2.1 Profile Photo (static, optional)

- Click empty box → file picker; click filled box → preview modal with "Change Photo".
- `accept=".jpg,.jpeg,.png"`; **double validation**: extension whitelist **and**
  magic-byte sniff (JPEG `FF D8 FF`, PNG `89 50 4E 47`) via `FileReader` on `file.slice(0,4)`.
  Failure → toast + clear the input.
- Preview uses `URL.createObjectURL` with revoke-on-replace/unmount (no leaks).
- Server URLs get a cache-buster `?_pv=<mountTimestamp>` so an updated photo at the same path
  is not served stale from the browser cache.
- Only appended to FormData when `values.photo instanceof File`.

### 2.2 Personal Details

| Field | Control | Required | Validation |
|---|---|---|---|
| `title` (prefix) | select, `PREFIX_OPTIONS`, combined-left of name, `w-24` | – | default `Mr` |
| `name` | text (combined-right) | ✅ | trim, min 2, `/^(?=.*[a-zA-Z])[a-zA-Z0-9\s]+$/` |
| `gender` | select (inline options) | ✅ | required |
| `dob` | date | ✅ | valid date **and** age ≥ 18 (`dayjs().diff(dob,'year') >= 18`) |
| `maritalStatus` | select, `MARTIAL_STATUS_OPTIONS` | ✅ | required |
| `relation` | select, `RELATION_OPTIONS`, combined-left, `w-28` | ✅ | required |
| `relativeName` | text (combined-right) | ✅ | trim, min 2, name regex |

**Conditional:** if `relation === 'Husband'` and `maritalStatus` is empty or `UnMarried`
→ auto-set `maritalStatus = 'Married'`.

### 2.3 Address Details (shared `AddAddressDetail`)

Two blocks — **Current** and **Permanent** — each with:

| Field | Control | Required |
|---|---|---|
| `{prefix}Address1/2/3` | textarea ×3 (`rows=2`, `col-span-2`), key-filtered + paste-sanitized | Line 1 required for **current** only |
| `country` / `permanentCountry` | `CountryAsyncSelect` (lazy) | optional, defaults `DEFAULT_COUNTRY_ID` |
| `state` / `permanentState` | `StateAsyncSelect` (needs countryId) | optional, disabled until country |
| `city` / `permanentCity` | `CityAsyncSelect` (needs stateId) | optional, disabled until state |
| `pincode` / `permanentPincode` | text | optional, `/^[0-9]{6}$/` when filled |
| `nationality` | select `['INDIAN']` (current block only) | ✅ |

**Cascade:** choosing country clears state+city; choosing state clears city.
**Conditional — "Same as current" checkbox (`sameAsCurrent`)**
- checked → the entire Permanent block is **hidden** and all permanent fields are copied
  from current (and kept in sync while checked);
- unchecked → permanent fields are cleared;
- on edit load it is **auto-checked** when `currentAddress1 === permanentAddress1 && currentPinCode === permanentPinCode`.

### 2.4 Contact Details

| Field | Control | Required | Validation |
|---|---|---|---|
| `mobile1` | **CheckedInputField** (`checkField:'mobileNumber1'`) | ✅ | `/^[6-9]\d{9}$/` + duplicate check |
| `mobile2` | text | – | same regex when filled |
| `landline` | text | – | `/^[0-9]{6,12}$/` when filled |
| `email` | email | – | valid email, lowercased/trimmed |

### 2.5 Service Details

> All service fields are **disabled when `isEditMode`** (existing employee) — they are only
> captured at creation. Changes afterwards go through **Tab 8 (Transfer History)**.
> Their Yup rules are likewise only added when `!isEditMode`.

| Field | Control | Required (add mode) | Source / notes |
|---|---|---|---|
| `branchId` | `ReactSelectField` | ✅ | `getMasterList('branch',{companyId})` |
| `departmentId` | `ReactSelectField` | ✅ | `getMasterList('department',{branchId})`; **auto-selects when exactly 1 result** |
| `block` | `ReactSelectField`, clearable | – | `getMasterList('block',{companyId,branchId})` |
| `center` | `FormikReactMultiSelect` single, searchable, **infinite scroll** (20/page, 400 ms debounce) | ✅ | `master/center/list` filtered by companyId + departmentId + blockId |
| `designation` | `FormikReactMultiSelect` single, searchable, **infinite scroll** (20/page) | ✅ | `master/designation/list` filtered by departmentId; disabled until department chosen (placeholder "Select department first") |
| — read-only card | display | – | shows `basicPay` and `workingDays` pulled from the chosen designation |
| `sourceType` | select `SOURCE_TYPE_OPTIONS` | – | |
| `grade` | select `GRADE_OPTIONS` | ✅ | |
| `employmentType` | select `EMPLOYMENT_TYPE_OPTIONS` | ✅ | |
| `contractPeriod` | number (combined-left) | conditional | required when `employmentType !== 'Permanent'` |
| `contractPeriodType` | select `CONTRACT_TYPE_OPTIONS` (combined-right) | conditional | same condition |
| `joiningDate` | date | ✅ | |
| `confirmationDate` | date | ✅ | must be **≥ joiningDate**; auto-filled with joiningDate when empty; re-validated whenever joiningDate changes |
| `renewalDate` | date | conditional | required when `employmentType !== 'Permanent'`; **auto-computed** = joiningDate + contractPeriod(period type) − 1 day |
| `policeVerified` | switch | – | sent as `'Yes'/'No'` |
| `stampAgreement` | switch | – | sent as `'Yes'/'No'` |

**Cascade / side-effects**
- company change → clear `branchId, departmentId, center, block, designation`
- `branchId` change → refetch departments (+auto-select single)
- `departmentId` change → clear `designation` and its selected option
- designation select → copies `salaryType, basicPay, workingDays, wagesPerDay` into the form
  (cleared to `Monthly/0/0/0` on deselect)
- edit mode → seed the selected designation/center option from the list once it loads
  (so the label renders even though the option isn't on page 1)

**Leaving Details sub-section** (always editable, even in edit mode)
`leavingDate` (date, optional) · `leavingReason` (text, optional)

### 2.6 Health Details (all optional)

`bloodGroup` select · `height` number + `heightUnit` select (`CM/Inch/Feet`) ·
`weight` number + fixed `Kg` suffix · `disability` switch.
Validation: height/weight `/^[0-9]+(\.[0-9]+)?$/` when filled.

### 2.7 Remark

`remark` textarea (`rows=3`, optional) — sent as `remarks`. Editable regardless of add/edit rights.

### 2.8 Submit behaviour

- Payload is **FormData**; `employeeId` appended only when editing; service-detail keys and
  leaving keys appended only when `!isEditMode`.
- Field-name mapping (form → API):
  `title→prefix`, `dob→birthDate`, `country/state/city/pincode→currentCountryId/currentStateId/currentCityId/currentPinCode`,
  `permanentCountry/State/City/Pincode→permanent*Id/permanentPinCode`,
  `mobile1/mobile2/landline→mobileNumber1/mobileNumber2/landlineNumber`,
  `center→centerId`, `block→blockId`, `designation→designationId`,
  `confirmationDate→confirmDate`, `remark→remarks`.
- **Scroll-to-first-error**: on invalid submit, walk `FIELD_ORDER`, find the first errored field,
  `smoothScrollIntoView(block:'center')` on `#<name>` or `[data-field-name="<name>"]`, then focus it.

  ```ts
  FIELD_ORDER = ['name','gender','dob','maritalStatus','relation','relativeName',
    'currentAddress1','nationality','mobile1','mobile2','landline','email',
    'branchId','departmentId','center','designation','grade',
    'employmentType','contractPeriod','contractPeriodType',
    'joiningDate','confirmationDate','renewalDate'];
  ```
- On success: invalidate `['employee-list']` + `['employee-by-id']`, read
  `employeeId` / `employeeserviceId` out of the (deeply nested) response, then run the
  next/close/addNew branch selected by `saveActionRef`.

### 2.9 🔔 Modal — Duplicate Data Check (`CheckedInputField` + `DuplicateCheckProvider`)

Wrap the whole tab in `<DuplicateCheckProvider currentEmployeeName={values.name}>`.
Each `CheckedInputField`:

1. debounces the typed value, skips repeats (`lastCheckedRef`);
2. `POST employee/checkDataExistence { [checkField||name]: value, employeeId? }`
   (`employeeId` sent **only in edit mode**, so the server excludes the record itself);
3. duplicates found → the field turns red with a "`<label>` already registered" hint and the
   entry is **reported to the provider**;
4. the provider merges reports from *all* fields into **one consolidated dialog** listing, per field:
   the field label badge, the duplicate value, and a card per matching employee showing
   **Name, Employee Code, Company, Department, Dept. Code**;
5. clearing/changing the field removes its entry from the dialog.

Fields wired to it — Tab 1: `mobile1`. Tab 2: `pfNumber`, `uanNumber`, `esicNumber`,
`aadharNumber`, `panNumber`, `epicNumber`, `drivingLicenceNumber`, `passportNumber`.
**It is a warning, not a blocker** — save is still allowed.

### 2.10 🔔 Modal — Photo Preview

Full-screen backdrop, square preview, close ✕, and a "Change Photo" button re-opening the picker.

---

## 3. TAB 2 — KYC Detail

**Component:** `KycDetail.tsx/AddKycDetail.tsx` · **API:** `employee/saveKycDetail` (JSON)
5 sections in a 4-column grid; each section header spans the full row.

### PF & Statutory Details
| Field | Control | Req | Validation |
|---|---|---|---|
| `pfNumber` | CheckedInput | – | – |
| `uanNumber` | CheckedInput | – | – |
| `esicNumber` | CheckedInput | – | – |

### Bank Details
| Field | Control | Req | Validation |
|---|---|---|---|
| `bankId` | `FormikReactSelect`, clearable | ✅ | required — options from `getMasterList('bank')` |
| `bankAccountNumber` | text | ✅ | `/^\d{9,18}$/` |
| `bankBranchName` | text | – | – |
| `ifscCode` | text | ✅ | required (no format regex) |

### Identity Documents
| Field | Control | Req | Validation |
|---|---|---|---|
| `aadharNumber` | CheckedInput | ✅ | `/^\d{12}$/` |
| `nameAsPerAadhar` | text | ✅ | required |
| `panNumber` | CheckedInput | – | `/^[A-Z]{5}\d{4}[A-Z]$/` when filled |
| `epicNumber` (Voter ID) | CheckedInput | – | – |
| `rationCardNumber` | text | – | – |

### Driving Licence
`drivingLicenceNumber` CheckedInput (optional) · `drivingLicenceExpiryDate` date (optional)

### Passport Details
`passportNumber` CheckedInput (optional) · `passportValidFrom` date · `passportValidTo` date
(both optional; **no cross-date rule is enforced** — add one if required)

**Submit:** all values spread as-is; the 3 dates converted to `YYYY-MM-DD` or `null`;
`employeeId` attached from a ref that always holds the freshest id.
`validateOnChange:false`, `validateOnBlur:true`.

---

## 4. TAB 3 — Wage Structure

**Component:** `wageStructure/AddWageStructure.tsx` · **Load:** `employee/getWageStructure { employeeserviceId }`

> ⚠️ **Currently a read-only screen.** `readOnlyWageDetails = true` disables every control, and the
> only action is a **Next** button (`onSaveSuccess()`); the form's `onSubmit` builds a payload but
> never posts it. Values are inherited from the department/designation and are edited through
> **Tab 8 → Transfer/Edit modal**. Keep the payload builder — flip the flag and add the save
> mutation if the new project needs it editable.

### 4.1 Act toggle cards (`ToggleCard`, 3-col grid)
`pfActApplicable` (primary) · `esicActApplicable` (emerald) · `ptActApplicable` (violet) ·
`lwfActApplicable` (amber, **hard-disabled**) · `overtimeApplicable` (rose).
Server may also send per-act permission flags: `canEditPfAct`, `canEditEsicAct`, `canEditPtAct`,
`canEditLwfAct`, `canEditOvertimeAct`.

### 4.2 Conditional blocks

| Shown when | Fields |
|---|---|
| `pfActApplicable` | `pfStartDate` (date), `pfDeductionPercentage` (number, **required**, 0–100), `employeePfContributionOnWageLimit` (MiniToggle), `employerPfContributionOnWageLimit` (MiniToggle) |
| ↳ nested: `epsApplicable` (MiniToggle inside the PF card) | `epsStartDate` (date, **required** when EPS on — tooltip "Date of employee completion of 58 years"), `defferedPensionApplicable` (MiniToggle) |
| ↳ nested: `defferedPensionApplicable` | `defferedPensionAllowedUptoMaxAge` (number, 0–100) |
| `esicActApplicable` | `esicStartDate` (date, optional) |
| `overtimeApplicable` | *(commented out in code)* `pfApplicableOnOvertime`, `ptApplicableOnOvertime`, `esicApplicableOnOvertime` |
| `disability` (MiniToggle, always visible) | `disabilityStartDate` (date, **required** when on) |

Always visible: `employeeWeeklyOff` (`FormikReactSelect`, `WEEKLY_OFF_OPTIONS`, clearable) —
labelled *display only, not sent to server* (though the payload builder does include it).

### 4.3 Salary section (conditional on `salaryType`)

- `salaryType` select (`Daily` / `Monthly`).
- `Daily` → show `wagesPerDay` (number) + a computed read-only tile
  `Basic Pay (Monthly) = wagesPerDay × 26`.
- otherwise → show `basicPay` (number) + computed tile `Wage Per Day = basicPay ÷ 26`.
- `STANDARD_WORKING_DAYS = 26`. Payload stores **both** derived values.

### 4.4 Sticky formula reference bar

Rendered only when at least one of PF/ESIC/PT/LWF is applicable; sticky at `top-29px`,
shows a card per active act with its formula and a "N rules" badge:

```
PF   : EPFWages × Deduction(<pct>%) / 100      (EPFWages = min(basicPay, wageCeilingLimit) when
                                                employeePfContributionOnWageLimit else basicPay)
ESIC : ESI_WAGE × EmployeeESICRate(%) / 100    (0 when basicPay > esic wageCeilingLimit)
PT   : slab lookup — first slab where minSalary ≤ basicPay ≤ maxSalary ('Above'/null = ∞)
LWF  : fixed amount by month + state of group/company
```

Rates come from `getMasterList('pfRate'|'esic'|'ptRate', {limit:1})` fetched once on mount;
the live amounts are recomputed on a **500 ms debounce** whenever basicPay / act toggles /
wage-limit toggle / deduction % change (the amount chips are currently commented out in the UI).

---

## 5. TAB 4 — Family Detail

**Component:** `family/AddFamily.tsx` · **APIs:** `getFamilyDetail` / `saveFamilyDetail`
Repeatable rows (§0.5). Starts with 1 empty row; saved data replaces the rows.

| Field | Control | Req | Validation |
|---|---|---|---|
| `relation` | select `RELATION_OPTIONS` (combined-left, `w-[130px]`) | ✅ | required |
| `name` | text (combined-right) | ✅ | trim, min 2, `/^[a-zA-Z\s]+$/` (letters+spaces only) |
| `birthDate` | date | – | valid date, **not in the future**, implied age 0–120 |
| `aadharNumber` | text | – | `/^\d{12}$/` when filled |
| `isNominee` | switch | – | – |
| `employeefamilyId` | hidden | – | present ⇒ update, absent ⇒ insert |

**Row header** shows `"<relation> - <name>"` (or `Member N`), a **Nominee** badge when
`isNominee`, and turns red-tinted when the row has touched errors.
**Payload:** `{ employeeId, familyMembers: [{ name, relation, birthDate|null, aadharNumber, isNominee, employeefamilyId? }] }`

**Per-row permissions:** existing row editable only with `canEdit`; new row only with `canAdd`;
delete follows the same split. "Add" buttons appear at top **and** bottom of the list.

---

## 6. TAB 5 — Education / Experience

**Component:** `education/AddEducation.tsx` · **APIs:** `getEducationExperienceDetail` / `saveEducationExperienceDetail`
Two independent repeatable lists in one tab.

### 6.1 Education list

| Field | Control | Req | Validation |
|---|---|---|---|
| `educationName` | text | ✅ | trim required |
| `boardId` | `FormikReactSelect`, searchable, clearable — `getMasterList('board')` | – | – |
| `passingYear` | `FormikReactSelect` — years from **current year down to 1970** | ✅ | `/^\d{4}$/` |
| `percentage` | text | – | `/^\d{1,3}(\.\d{1,2})?$/` when filled |
| `employeeeducationId` | hidden | – | upsert key |

Row header: `educationName` + year badge.

### 6.2 Experience list

**Conditional — `isFresher` toggle** (local state, not a form field):
- ON → the whole experience list is **hidden**, replaced by an empty-state card
  ("No experience required for freshers"), rows are **not validated**, and `experienceList`
  is **omitted from the payload entirely**.
- Auto-enabled on load when the API returns zero experience records.

| Field | Control | Req | Validation |
|---|---|---|---|
| `companyName` | text | ✅ | trim required |
| `fromDate` | date | ✅ | required |
| `toDate` | date | ✅ | required (**no from ≤ to check — add if needed**) |
| `designation` | text | ✅ | trim required |
| `salary` | text | – | `/^\d+(\.\d{1,2})?$/` when filled |
| `employeeexperienceId` | hidden | – | upsert key |

Row header: `companyName` + designation badge.

**Payload:** `{ employeeId, educationList:[...], experienceList?:[...] }` (dates → ISO).

---

## 7. TAB 6 — Documents

**Component:** `document/AddDocument.tsx` · **APIs:** `getDocumentDetail`, `uploadEmployeeDocument` (multipart), `saveDocumentDetail` (JSON), `common/removeFile`

| Field | Control | Req | Notes |
|---|---|---|---|
| `documenttypeId` | `FormikReactSelect`, searchable, clearable | ✅ | `getMasterList('documentType')` |
| `documentId` | `FormikReactSelect` | ✅ | **cascades** from type: `getMasterList('document',{documenttypeId})`; disabled until a type is chosen; placeholder "Loading…" while fetching |
| `expiryDate` | date | – | – |
| `document` | `FileUploadField` | ✅ | `accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"`; uploads immediately via `uploadEmployeeDocument` (`uploadFileKey:'file'`, plus `employeedocumentId` when the row already exists) |
| `employeedocumentId` | hidden | – | upsert key |

**Key behaviours**
- Selecting a type **clears** `documentId` and triggers that type's option fetch (cached per type in
  `documentOptionsMap`; loading state per type in `docLoadingMap`).
- On load of N saved docs, all missing type-option sets are fetched in **one parallel batch**
  (one "loading" setState → `Promise.all` → one "results" setState) instead of N×2 re-renders.
- **Existing documents:** only the *upload* field is locked (`documentReadOnly = isExistingDoc`) —
  the file can be viewed/downloaded but not replaced; the other three fields stay editable.
- Replacing a file calls `common/removeFile { file }` on the previous path.
- **Path hygiene:** the server prepends `VITE_APP_API_URL + 'media/'`; `stripBaseUrl()` removes any
  base URL before saving so the stored path never doubles. If no new file was uploaded for an
  existing row, the original `document` path is re-sent (`originalDocumentPath`).
- Row header shows `"<Type> - <Name>"` plus an **Uploaded** badge.
- Save is disabled without an `employeeId` → `toast.error('Please save basic details first')`;
  empty list → `toast.error('Please add at least one document')`.

**Payload:** `{ employeeId, documents:[{ documenttypeId, documentId, expiryDate|null, document, employeedocumentId? }] }`

### 🔔 Modal — Document Preview (in `EmployeeDetail.tsx` / `DocCard`, reusable here)
Type-aware preview: **image** → `<img>`; **pdf** → fetched as an authenticated blob and shown in an
`<iframe>` (bypasses `X-Frame-Options`); **docx** → fetched as `ArrayBuffer` and converted with
`mammoth.convertToHtml` into styled HTML; anything else → "Preview not available" + Download.
Authenticated fetch uses headers `x-authorization: VITE_APP_API_TOKEN` and `x-token: cookie('token')`.
Blob URLs are revoked on close. Expiry date renders red + **Expired** badge when past.

---

## 8. TAB 7 — Assets

**Component:** `assets/AddAssets.tsx` · **APIs:** `getAssetDetail` / `saveAssetDetail`
Repeatable rows, 4-column grid.

| Field | Control | Req | Validation |
|---|---|---|---|
| `assetId` | `ReactSelectField` — `getMasterList('assets')` (enabled once a company is selected) | ✅ | required |
| `assignedDate` | date | – | – |
| `validTill` | date | – | – |
| `assignedStatus` | `ReactSelectField` — `ASSIGNED / RETURNED / LOST` | ✅ | required, default `ASSIGNED` |
| `employeeassetId` | hidden | – | upsert key |

Row header: asset label + status badge colour-coded
(`ASSIGNED` green, `RETURNED` blue, `DAMAGED` amber — defined but commented out of the options —, `LOST` red).
**Payload:** `{ employeeId, assets:[{ assetId, assignedDate|null, validTill|null, assignedStatus, employeeassetId? }] }`
This tab uses the single `viewOnly` flag (no canAdd/canEdit split). Next tab after save → `department`.

---

## 9. TAB 8 — Employee Transfer History

**Components:** `departmentTransferHistory/` → `ViewDepartmentTransferHistory` (shell),
`CollapsibleRow`, `AddTransferPopup` (the big one), `TransferEmployeePopup`,
`LeavingDetailPopup`, `DetailPopup`, `helpers.tsx`, `dummyData.ts` (types + `mapServiceToCompanyRow`)

> ⚠️ `departmentTransferHistory copy/` is a stale duplicate — port only `departmentTransferHistory/`.
> This tab has **no Save/Next footer**; all writes happen inside its modals.

### 9.1 Shell

- `POST employee/getEmployeeService { employeeId }` → `{ service: [...], isAnyServiceRunning: bool }`;
  each service mapped via `mapServiceToCompanyRow` into `CompanyRow`.
- Table columns: expand-chevron · `#` · Company Name · Branch Name · Joining Date ·
  Leaving Date (or a green **Currently Working** badge) · Actions.
- Header: record-count badge, **Expand All / Collapse All**, and **one** action button:
  - `isAnyServiceRunning === true` → **Transfer Employee** (opens `TransferEmployeePopup` on the active row)
  - `isAnyServiceRunning === false` → **Add Transfer** (opens `AddTransferPopup` in add mode)
- **Permissions:** `canTransfer = canEdit && roleId ∈ {0,1}`; super-admin panel
  (`VITE_APP_IS_SUPER_ADMIN==='true'`) always gets `canEdit`. Without edit rights an amber banner
  reads *"You don't have edit rights. Please contact HR Manager to make changes."*
- Empty/loading states: spinner "Loading service history…" / "No service records found".

### 9.2 Expanded row — Service Modification History

Per-service accordion of transfer entries. Each entry card shows date, `N fields changed`,
the acting admin, and a **Previous → Updated** comparison grid for:
**Department, Designation, Branch, Block, Center** (unchanged values grey, changed red→emerald).
Note printed in the UI: *"It only include Department, Designation, Branch, Block and Center changes."*

### 9.3 Row actions

| Action | Visible when | Opens |
|---|---|---|
| **Details** (Eye) | row has `wageStructure` or `serviceDetail` | `DetailPopup` |
| **Edit** (Pencil, amber) | `isActiveService && canEdit` | `AddTransferPopup` in *restricted edit* mode |
| **Leave Service** (LogOut, red) | `isActiveService && canEdit` | `LeavingDetailPopup` |

### 9.4 🔔 Modal A — `DetailPopup` (read-only)

Sections: **Basic Pay** · **Statutory Compliance** · **Other Settings** ·
**Assignment** (Branch/Department/Block/Center) · **Employment Information** (…, Grade, …) ·
**Important Dates** · **Other Details** (incl. Weekly Off).
(Allowances/Deductions section cards exist but are commented out.)

### 9.5 🔔 Modal B — `LeavingDetailPopup`

Renders standalone (own overlay, `max-w-480px`) **or** `embedded` (form only, used inside the transfer modal).

| Field | Control | Req | Validation |
|---|---|---|---|
| `isTransfer` | `ToggleCard` (emerald) "Mark this as a transfer to another company/service" | – | branches the submit (below) |
| `leavingDate` | date | ✅ | must be **≥ joiningDate** (a "≤ +30 days in future" rule exists but is commented out) |
| `leavingReason` | text | ✅ | required |

**Submit branches on `isTransfer`:**
- `false` → `POST employee/leaveEmployeeService { employeeserviceId, leavingDate(ISO), leavingReason }`
  → invalidate `['employee-service-list']` → close.
- `true` → **no API call**; fires `onTransfer({ leavingDate, leavingReason })` and closes, which makes
  the parent row open `TransferEmployeePopup` pre-filled with those leaving values
  (chained-modal flow: *Leave Service → Transfer Employee*).

### 9.6 🔔 Modal C — `TransferEmployeePopup`

A `max-w-950px` shell (header "Transfer Employee — `<company> • <department>`") that renders
`AddTransferPopup` with `embedded showCompanyChange` and `editData` built from the active row's
`serviceDetail` + `wageStructure`. Leaving date/reason overrides from Modal B are keyed into the
component (`key={leavingDate+leavingReason}`) to force a clean re-init.

### 9.7 🔔 Modal D — `AddTransferPopup` (the main service form)

**API:** `POST employee/saveEmployeeService`

**Three modes**

| Mode | Condition | Behaviour |
|---|---|---|
| **Add** | no `editData` | `createNewService:true`; dates default to **today**; Transfer-Type block shown |
| **Restricted edit** | `editData && !showCompanyChange` | edits the existing service (`employeeserviceId` sent, no `createNewService`); Transfer-Type block and Leaving section hidden; intent is *department / center / salary only* |
| **Transfer** | `editData && showCompanyChange` | `createNewService:true` **and** `employeeserviceId`; Leaving section shown and its fields become **required** |

**Fields** — same shape as Tab 1's Service Details plus wage structure:

`companyId` ✅ · `branchId` ✅ · `departmentId` ✅ · `block` · `center` ✅ · `designation` ✅
(infinite-scroll, 20/page, 400 ms debounce, filtered by department) · `sourceType` · `grade` ✅ ·
`employmentType` ✅ · `contractPeriod` / `contractPeriodType` (required unless `Permanent`) ·
`joiningDate` ✅ · `confirmationDate` ✅ · `renewalDate` (required unless `Permanent`) ·
`policeVerified` · `stampAgreement` · `salaryType` / `basicPay` / `wagesPerDay` · the full
wage-structure set (`pfActApplicable`, `pfStartDate`, `pfDeductionPercentage`,
`employee/employerPfContributionOnWageLimit`, `epsApplicable`, `epsStartDate`,
`defferedPensionApplicable`, `defferedPensionAllowedUptoMaxAge`, `esicActApplicable`,
`esicStartDate`, `ptActApplicable`, `lwfActApplicable`, `overtimeApplicable`,
`pf/pt/esicApplicableOnOvertime`, `disability`, `disabilityStartDate`, `employeeWeeklyOff`) ·
`leavingDate` / `leavingReason` (conditional) · UI-only: `isCompanyChanged`, `isBranchChanged`,
`wageStructureOption` (`'same' | 'different'`).

**Date validations (all cross-field)**
- `joiningDate` ≥ previous service's joiningDate **and** strictly **>** `leavingDate`
- `confirmationDate` ≥ `joiningDate`
- `leavingDate` (transfer mode) ≥ previous joiningDate **and** strictly **<** new `joiningDate`
- `renewalDate` **auto-computed** = joiningDate + contractPeriod(type) *(note: unlike Tab 1, no −1 day here)*

**Conditional UI**
- **Transfer Type** — two mutually exclusive cards, *Company Change* (amber) and
  *Branch Change* (blue): selecting one clears the other. Shown only in add/transfer mode.
- `isCompanyChanged` ON → clears `companyId` and reveals a **New Company** select
  (`getMasterList('company')`); OFF → restores the original company.
- `isBranchChanged` ON → clears `branchId`; OFF → restores it.
- **Transfer Summary banner** appears when the company and/or department actually differ,
  showing *Previous → New* cards for each.
- **Leave Existing Service Details** red panel (transfer mode only): `leavingDate` + `leavingReason`.
- Wage-structure choice: **Keep Existing** vs **Apply Selected Department Changes**
  (`wageStructureOption`), each with its own set of act toggles / PF / EPS / ESIC / OT /
  disability / weekly-off controls (mirrors Tab 3's conditional nesting).
- A department-change confirmation dialog is wired (`showDeptChangeConfirm`, `pendingDepartmentId`).

**Cascades** (each clears the levels below it, except during the initial edit load which is
guarded by `isInitialEditLoad` for ~500 ms)
```
companyId → branch list; clears branchId, departmentId, designation, block, center
branchId  → department list, block list
departmentId → designation list (+ clears designation), center list
block     → center list
```

**Department-change salary comparison**
When `departmentId !== originalDepartmentId` (and an `employeeserviceId` exists):
`POST employee/compareDepartmentSalaryComponents { employeeserviceId, departmentId }` →
`{ employeeWageStructure, employeeNewWageStructure, allowance[], deduction[] }`.
- The response's `employeeNewWageStructure` **auto-populates** every salary/statutory form field.
- Allowance/deduction rows are computed as `amount = round(basicPay × percentage / 100)` for old
  and new, with `diff`, `isNew`, `isRemoved`, and per-component PF/PT/ESI applicability flags,
  rendered as an old→new comparison with `DiffBadge` / `ApplicabilityDot` / `ComplianceCompareRow`.
- `getWageStructure` is also called to read `canEditPfAct / canEditEsicAct / canEditPtAct /
  canEditLwfAct / canEditOvertimeAct` permission flags.

**Payload** — `{ employeeId, createNewService?, employeeserviceId?, companyId, branchId,
departmentId, blockId, centerId, designationId, sourceType, grade, employmentType,
contractPeriod, contractPeriodType, joiningDate, confirmDate, renewalDate,
policeVerified:'Yes'|'No', stampAgreement:'Yes'|'No', leavingDate?, leavingReason? }`
(a `salaryComponents[]` block is prepared but commented out).
On success: invalidate `['employee-service-list']` + `['employee-by-id']`, close.

---

## 10. TAB 9 — Leave Management

**Components:** `leaveManagement.tsx/AddLeaveManagment.tsx` + `ViewLeaveHistory.tsx`
**APIs:** `employee/saveLeaveDetail`, `employee/getLeaveDetail`

### 10.1 Leave form

| Field | Control | Req | Validation |
|---|---|---|---|
| `fromDate` | date | ✅ | required |
| `toDate` | date | ✅ | required, **≥ fromDate** |
| `leavetypeId` | `FormikReactSelect` — `getMasterList('leaveType',{companyId})` | ✅ | required |
| `paidType` | `FormikReactSelect` (`PAID` / `UNPAID`) | – | **always disabled** — auto-derived |
| `leaveReason` | text (`md:col-span-2`) | – | – |

**Conditional:** selecting a leave type copies that master's `payType` into `paidType`
(the field is display-only; users can never set it directly).

**Payload:** `{ employeeId, fromDate(ISO), toDate(ISO), payType, leavetypeId:Number, leaveReason? }`
(+ `leaveId` when editing). On success the form **resets** and the history table refreshes
via a `refreshKey` bump. Saving here closes the wizard (`onSaveSuccess → handleSaveClose`).

### 10.2 Leave History table (`ViewLeaveHistory`)

Server-side paginated table (`Table1`) under the form.
Query params: `{ companyId, employeeId, limit, offset, term, sort, sortBy }`;
default `limit=5` (URL-overridable), 500 ms debounced search, `placeholderData` for smooth paging,
`staleTime 5 min`, and **prefetch of the next page** whenever `offset+limit < totalRecord`.
Columns: Sr No. · From Date · To Date · Pay Type (badge: PAID blue / UNPAID orange) ·
Leave Type (mapped through `LEAVE_TYPE_OPTIONS`) · Sort Name (`shortName`) · Reason (truncated).
A Status column (APPROVED/PENDING/REJECTED badges) exists but is commented out.

---

## 11. Companion Screens (optional to port)

- **`EmployeeDetail.tsx`** — read-only 360° page: hero header (photo, name, prefix, badges,
  Active/Inactive), collapsible sections (Personal, Wage Structure, Family, Education & Experience,
  Documents, Face Gallery, Leave History) with an **Expand/Collapse-All** context, full skeleton
  loaders, an infinite-scroll **employee switcher** (`employee/employeeList`, 50/page, 400 ms debounce),
  the document preview modal (§7), and a face-image gallery with zoom
  (`employeeFaces[].faceMedias[]` + `secondaryVectorImage[]`, filtering out `delete` flags).
- **`ViewEmployee.tsx`** — employee list: ~25 toggleable columns (Name, Employee Code, Department,
  Designation, Branch, Basic pay, Phone, Email, DOB, Joining/Leaving Date, Aadhaar, UAN, PF, ESIC,
  Bank, Account No, IFSC, audit columns), import/export
  (`downloadImportEmployeeFormat`, `exportEmployeeDetail`, `importEmployeeSheet`),
  activate/deactivate, talk-credential save, face delete, and the navigations that set the wizard's
  entry mode (`/employeeadd?employeeId=…`, `state:{addDetailOnly:true}`, `/employeedetail`,
  `/employeeapointmentletter`, `/detailattendance`).
- **`appointmentLetter/`** — HTML→print/PDF appointment letter built from the row passed in
  router state (inlines all stylesheets into a blob iframe before printing).

---

## 12. Implementation Order (recommended)

1. Port shared utils (§0.2) + static options (§0.4) + date/response conventions (§0.5).
2. Build the shell (§1) with all 9 tabs stubbed — verify locks, progress, URL sync, the three save modes.
3. Tab 1 (largest single form) → then Tab 2. Both need `DuplicateCheckProvider`.
4. The repeatable-list pattern once, then reuse it for Tabs 4, 5, 7 → then Tab 6 (adds file upload).
5. Tab 3 (read-only + formula bar).
6. Tab 9 (form + paginated history).
7. Tab 8 last — it depends on the wage-structure shape and hosts 4 chained modals.

### Known gaps worth fixing in the new project
- Tab 3 cannot be saved (`readOnlyWageDetails = true`, `onSubmit` returns the payload instead of posting).
- Tab 5 experience has no `fromDate ≤ toDate` rule; Tab 2 passport has no `validFrom ≤ validTo` rule.
- `renewalDate` auto-calc differs between Tab 1 (`−1 day`) and Tab 8 (no offset).
- `departmentTransferHistory copy/` is dead code.
- A leftover `console.log(":::::::::::::", list)` sits in `AddEducation.tsx`'s board fetch.
