import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
      currencySymbol: '₹',
      currencyCode: 'INR',
      setCurrency: ({ symbol, code }) =>
        set({ currencySymbol: symbol, currencyCode: code }),
    }),
    { name: 'xpertone-config' },
  ),
)
