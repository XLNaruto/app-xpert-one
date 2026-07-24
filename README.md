# XpertOne

React 19 + Vite + TypeScript admin portal built to the architecture in
[`CLAUDE.md`](./CLAUDE.md). Modular, feature-based, with TanStack Query for
server state and Zustand for client state.

## Stack

- **React 19 + Vite + TypeScript** (strict)
- **TanStack** — Query (server state), Router (file-based routes), Table (`<DataTable>`)
- **Zustand** — auth + UI (client state only)
- **Tailwind v4 + shadcn-style UI** — themed design tokens with light/dark support
- **Axios** + **Zod** + **react-hook-form**

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # routes:generate && oxlint && tsc -b && vite build
npm run preview
```

## Current status

XpertOne is in early development. Live screens:

| Route | Feature folder | Covers |
|---|---|---|
| `/login` | `auth/` | Email + password sign-in |
| `/dashboard` | `dashboard/` | Placeholder shell — KPI widgets to come |
| `/profile` | `profile/` | Read-only "My Profile" view |

> **No backend yet.** Sign-in is a local mock that accepts any valid email +
> password and creates a client session; the profile screen serves mock data.
> Each feature `api/` hook is structured so that when the API is ready you only
> swap its `queryFn`/`mutationFn` — the rest of the app is unchanged.

## Architecture rules (enforced)

1. Server state → TanStack Query · Client state → Zustand · never mixed.
2. Components never call `fetch`/`axios` — only a Query/mutation hook from the feature's `api/`.
3. All query keys live in [`src/lib/query-keys.ts`](./src/lib/query-keys.ts).
4. Each feature is a self-contained folder under `src/features/` with
   `api/ · components/ · hooks/ · pages/ · types/ · index.ts`.
5. Cross-feature imports go through the feature `index.ts` barrel.
6. `@/` path alias · one generic `<DataTable>` for every list screen.

## Folder structure

```
src/
├── app/            providers, router, layouts (sidebar/topbar shell)
├── routes/         file-based route tree (TanStack Router)
├── features/       auth · dashboard · profile · error
├── components/     ui/ · data-table/ · charts/ · maps/ · common/
├── lib/            api-client · http · query-client · query-keys · endpoints · utils
├── stores/         global zustand: auth-store · ui-store · config-store
└── config/ · hooks/ · types/ · styles/
```

## Note on file-based routing

TanStack Router generates `src/routeTree.gen.ts` on `dev`/`build` (via
`npm run routes:generate`). It's gitignored, so `tsc -b` regenerates it before
building on a fresh checkout.
