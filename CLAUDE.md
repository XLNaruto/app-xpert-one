# CLAUDE.md — XpertOne

Guidance for Claude Code. Modular, **feature-based** architecture — TanStack Query for server state, Zustand for client state.

## Stack

- **React 19 + Vite + TypeScript** (strict)
- **TanStack Query** — all server state
- **TanStack Router** — file-based routing
- **TanStack Table** — all data tables (`<DataTable>`)
- **Zustand** — client/UI state only
- **Tailwind + shadcn/ui** — styling & components
- **Axios** — HTTP · **Zod** — validation
- **react-hook-form** — forms

## Current status

XpertOne is an early-stage admin portal. Only two screens are live today:

| Route | Feature folder | Notes |
|---|---|---|
| `/dashboard` | `features/dashboard/` | Placeholder "Coming Soon" shell; KPI widgets land here later |
| `/profile` | `features/profile/` | Read-only "My Profile" view |

Authentication is **email + password** (`features/auth/`). There is **no backend
API yet** — sign-in is a local mock that accepts any valid credentials and
establishes a client session, and the profile screen returns mock data. Each
feature `api/` hook is written so that when the real API arrives you only swap
the hook's `queryFn`/`mutationFn` — nothing else changes.

New feature modules get added under `src/features/` as the product grows, each
following the same self-contained folder shape.

## Non-negotiable rules

1. **Server state → TanStack Query. Client state → Zustand. Never mix.**
2. **Components never call `fetch`/`axios` directly** — they call a Query/mutation hook from the feature's `api/`.
3. **All query keys live in `src/lib/query-keys.ts`.**
4. **New feature = new folder under `src/features/`** with `api/`, `components/`, `hooks/`, `types/`, `pages/`, `index.ts`.
5. **Cross-feature imports go through the feature's `index.ts`**, never deep paths.
6. **`@/` alias**, never long relative chains.
7. **One generic `<DataTable>`** powers every list screen.
8. **Zustand stores stay small and single-concern**; select narrowly.
9. **External integrations and calculations stay behind a service/pure-function boundary** — never leak SDKs or calc logic into components.
10. **Table columns are defined inline in the list page** with `useMemo<ColumnDef<T>[]>`. Never a separate `<thing>-columns.tsx` file.
11. **Screen logic lives in `features/<name>/hooks/`** — `use-<thing>-list.ts` (query, filters, dialog/nav state, delete flow), `use-<thing>-form.ts` (react-hook-form + create/update). Pages and components only lay out markup.
12. **`features/<name>/lib/`** holds pure helpers (mappers, derivations) — no React, no hooks.

## Feature folder shape

Every feature mirrors this (see `features/master/*` and the reference
`sales-incharge` module):

```
<feature>/
├── api/            query + mutation hooks and the raw <thing>-api.ts calls
├── components/     presentational pieces only (dialogs, toolbars, form layout)
├── hooks/          use-<thing>-list.ts · use-<thing>-form.ts · use-<thing>-detail.ts
├── lib/            pure helpers: <thing>-mappers.ts, calculations
├── pages/          screens — inline columns + layout, driven by the hooks
├── types/          UI-facing record types
├── constants.ts    dropdown options, EMPTY_<THING>_FORM
├── schemas.ts      zod form schema + inferred FormValues
└── index.ts        the feature's public surface
```

Shared form/detail primitives live in `components/common/` — `Field`
(`form-field.tsx`), `DetailItem`, `FormSection`, `TableRowActions`. Don't
re-declare a local `Field` inside a feature.

## Folder structure

```
src/
├── app/            providers, router, layouts (sidebar/topbar shell)
├── routes/         file-based route tree — mirrors features/ (TanStack Router)
├── features/       the modules — each self-contained
│   ├── auth/         email/password sign-in (mock until the API lands)
│   ├── dashboard/    KPI hub (placeholder for now)
│   ├── profile/      "My Profile" view
│   └── error/        404 + offline screens
├── components/     ui/ (shadcn), data-table/, charts/, maps/, common/
├── lib/            api-client, http, query-client, query-keys, endpoints, utils
├── stores/         GLOBAL zustand: auth-store, ui-store, config-store
├── hooks/ · types/ · config/ · styles/
```

## Conventions

- Files kebab-case; Components PascalCase; hooks `useX`; stores `useXStore`.
- Page files are named `<module>-<kind>-page.tsx` — `<module>-list-page.tsx`,
  `<module>-create-page.tsx`, `<module>-detail-page.tsx`. Never `-manage-page`
  or `-form-page`: **one `create` page serves both create and edit** (it takes
  an optional `data` prop), and its component is `<Module>CreatePage`.
- **`src/routes/` mirrors `src/features/`.** A feature at
  `features/master/branch/` gets routes at `routes/_authenticated/master/branch/`
  — one folder per module holding `index.tsx` (list), `create.tsx` (create +
  edit) and `detail.tsx`. Never flat dot-notation files, never a route folder
  that doesn't match a feature folder.
- **Never put a record id in the path.** No `/master/pf-rate/1/edit`, no
  `/master/branch/$branchId`. Routes are static — `/master/branch/create`,
  `/master/branch/detail` — and the id (or any other param) rides along in a
  single encrypted `?data=` token: `/master/branch/create?data=CEMFAVEXWBk`.
  - Navigate with `encryptId(id)` / `encryptParams({ id, … })` from `lib/crypto`:
    `navigate({ to: '/master/branch/create', search: { data: encryptId(id) } })`.
  - The route file uses `validateSearch: validateDataSearch` (`lib/route-search`)
    and passes `data` straight to the page.
  - The page decrypts with `decryptId(data)` — `undefined` means create mode on a
    create page, "not found" on a detail page. Never decrypt inside a hook.
- Query hooks in `features/<name>/api/`: `use<Thing>` (queries), `use<Action>` (mutations).
- Forms: react-hook-form + Zod resolver, inline field errors.
- Env only through `config/env.ts` (zod-parsed).

## Scripts

```bash
npm run dev · npm run build · npm run preview · npm run lint
```

## Before finishing any task
- `npm run build` passes (no TS errors).
- No server data in Zustand; no direct `fetch`/axios in components.
- New API calls went through a feature `api/` hook + centralized query key.
