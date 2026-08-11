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
7b. **Lists page server-side with `limit`/`offset`** — never fetch-all + client
   paging. `lib/pagination.ts` holds the `PageParams` / `Paginated<T>` contract;
   the list hook owns `usePagination()`, the api fn takes `PageParams` and
   returns `{ items, total }`, the query key carries the params, and the page
   passes `serverPagination limit offset total onPaginationChange` (plus
   `searchValue`/`onSearchChange` where the endpoint supports a search term).
   Masters still on a mock store use `paginate()` so they behave identically.
   Call the query hook with no params to get the whole master (dropdowns,
   history panels).
7c. **Search and sort are server-side too** — never client-filter a paged list.
   `PageParams` carries `search`, `sort` and `sortBy`; `usePagination(limit,
   defaultSort)` owns all three and the page passes `searchValue`/`onSearchChange`
   plus `manualSorting sorting onSortingChange`. A sortable column's **id is the
   API's own field name** (`effective_date`, `office_name`, …) so a header click
   reaches `?sort=` untranslated — list the endpoint's sortable fields in the
   feature's `constants.ts` and set `enableSorting: false` on every column that
   isn't one, `auditColumns({ createdAt: 'created_at' })` included. The api fn
   always sends an order, defaulting to the screen's, so paging can't repeat or
   skip rows.
8. **Zustand stores stay small and single-concern**; select narrowly.
9. **External integrations and calculations stay behind a service/pure-function boundary** — never leak SDKs or calc logic into components.
10. **Table columns are defined inline in the list page** with `useMemo<ColumnDef<T>[]>`. Never a separate `<thing>-columns.tsx` file.
11. **Screen logic lives in `features/<name>/hooks/`** — `use-<thing>-list.ts` (query, filters, dialog/nav state, delete flow), `use-<thing>-form.ts` (react-hook-form + create/update). Pages and components only lay out markup.
12. **`features/<name>/lib/`** holds pure helpers (mappers, derivations) — no React, no hooks.
13. **Anything stored locally goes in IndexedDB — never `localStorage`/`sessionStorage`.**
    Persisted Zustand stores use `createJSONStorage(createIdbStorage)` from
    `lib/idb-storage` (auth uses `createIdbSessionStorage`, which adds encryption
    + expiry). IndexedDB is async, so those stores set `skipHydration: true` and
    are rehydrated in `main.tsx` before the app mounts — add any new persisted
    store to that `Promise.all`.
14. **Access control goes through `features/permissions`** — `GET /user/my-role`
    (cached for the session, mounted once in the dashboard layout) is the single
    source of truth. A new screen names its resource once in
    `features/permissions/constants.ts` (`PERMISSIONS`), then:
    - the sidebar row in `config/navigation.ts` carries `permission: PERMISSIONS.x`
      (`filterNavByPermission` drops what the user can't reach),
    - the module's `routes/_authenticated/**/route.tsx` calls
      `requirePermission(context.queryClient, PERMISSIONS.x)` in `beforeLoad`, so a
      typed URL can't walk past a hidden row (a 403 renders `RouteError` →
      `Forbidden`), and
    - the screen takes its button flags from
      `useResourceAccess(PERMISSIONS.x)` (`canCreate` / `canUpdate` / `canDelete`
      / `canView` / `canManage`) — an Add button, a row's Edit/Delete and a Save
      are rendered only when held; for a one-off code use `useCan()` or
      `<Can permission="x:import">`. Row-action flags belong in the columns
      `useMemo` deps.
    A bare `PERMISSIONS` entry is a *resource*, matching any action held on it; pass
    a full `resource:action` code to gate one action. Never gate on a role name.

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
