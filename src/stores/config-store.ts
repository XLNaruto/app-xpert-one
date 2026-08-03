import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createIdbStorage } from '@/lib/idb-storage'

/**
 * The rupee sign — the portal's default currency symbol, and the one place the
 * glyph itself is written. It lives here, with the state it seeds, so
 * `lib/currency` (which reads this store) can re-export it without the two
 * modules importing each other. Feature code imports it from `@/lib/currency`.
 */
export const RUPEE_SIGN = '₹'

interface ConfigState {
  /**
   * Base URL for building media/asset URLs from the relative paths the API
   * returns (e.g. `office_image_paths`). Fetched once per session from
   * `GET /sales-incharge-admin/config` and read by the `mediaUrl()` helper.
   */
  mediaBaseUrl: string
  setMediaBaseUrl: (url: string) => void
  /**
   * Currency the whole app renders amounts in. The single source of truth for
   * the symbol — no screen hard-codes `₹`; labels and formatters read it
   * through the `currency()` / `amountLabel()` helpers in `lib/currency`.
   */
  currencySymbol: string
  /** ISO 4217 code used by `Intl.NumberFormat` (must match the symbol). */
  currencyCode: string
  setCurrency: (currency: { symbol: string; code: string }) => void
}

/**
 * Global media/config state (client state). The value is server-sourced but
 * mirrored here so the pure `mediaUrl()` helper can build image URLs
 * synchronously anywhere — no hook required. Persisted so URLs resolve on the
 * first paint after a reload, before the config query refetches.
 */
export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      mediaBaseUrl: '',
      setMediaBaseUrl: (mediaBaseUrl) => set({ mediaBaseUrl }),
      currencySymbol: RUPEE_SIGN,
      currencyCode: 'INR',
      setCurrency: ({ symbol, code }) =>
        set({ currencySymbol: symbol, currencyCode: code }),
    }),
    {
      name: 'xpertone-config',
      // Local data always lives in IndexedDB (never localStorage). It's async,
      // so hydration is explicit in main.tsx — before the first paint, which is
      // what lets `mediaUrl()` resolve synchronously after a reload.
      storage: createJSONStorage(createIdbStorage),
      skipHydration: true,
    },
  ),
)
