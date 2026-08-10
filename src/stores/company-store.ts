import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createIdbStorage } from '@/lib/idb-storage'

interface CompanyState {
  /**
   * The active company (tenant) the user operates as. The server is the source
   * of truth — the selection is stored against the session by
   * `POST /me/company/select` — but it's mirrored here so the topbar can render
   * the active company synchronously on first paint, before `/me/companies`
   * refetches. `null` until a company resolves.
   */
  selectedCompanyId: number | null
  selectedCompanyName: string | null
  /**
   * The active company's logo as a bare storage path, `null` when it has none.
   * Mirrored alongside the name so the sidebar can brand itself on first paint
   * instead of flashing the XpertOne wordmark until `/my/companies` returns.
   */
  selectedCompanyLogo: string | null
  /** Mirror the server's active selection. */
  setSelectedCompany: (
    id: number | null,
    name: string | null,
    logo?: string | null,
  ) => void
  /** Clear on logout so the next user doesn't inherit a stale tenant. */
  clear: () => void
}

/**
 * Global selected-company state (client state). Server-sourced but mirrored
 * here — same pattern as `config-store` — so the active tenant is available
 * synchronously anywhere without a hook. Persisted so it survives a reload.
 */
export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      selectedCompanyId: null,
      selectedCompanyName: null,
      selectedCompanyLogo: null,
      setSelectedCompany: (selectedCompanyId, selectedCompanyName, logo = null) =>
        set({ selectedCompanyId, selectedCompanyName, selectedCompanyLogo: logo }),
      clear: () =>
        set({
          selectedCompanyId: null,
          selectedCompanyName: null,
          selectedCompanyLogo: null,
        }),
    }),
    {
      name: 'xpertone-company',
      // Local data always lives in IndexedDB (never localStorage). It's async,
      // so hydration is explicit in main.tsx — the mirror only earns its keep if
      // the active company is there on the first paint.
      storage: createJSONStorage(createIdbStorage),
      skipHydration: true,
    },
  ),
)
