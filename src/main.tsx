import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { AppProviders } from '@/app/providers'
import { router } from '@/app/router/router'
import { useAuthStore } from '@/stores/auth-store'
import { useUiStore } from '@/stores/ui-store'
import { useConfigStore } from '@/stores/config-store'
import { useCompanyStore } from '@/stores/company-store'
import '@/styles/globals.css'

// Every persisted store is backed by IndexedDB (async) with `skipHydration`, so
// rehydrate them ALL before mounting the router:
//  • auth — the synchronous `beforeLoad` guards would otherwise run against
//    empty state and bounce a signed-in user to /login on refresh;
//  • ui / config / company — first paint should already carry the saved theme,
//    media base URL and active company (no flash, no placeholder).
Promise.all(
  [useAuthStore, useUiStore, useConfigStore, useCompanyStore].map((store) =>
    Promise.resolve(store.persist.rehydrate()),
  ),
).finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  )
})
