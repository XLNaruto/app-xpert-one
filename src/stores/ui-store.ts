import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createIdbStorage } from '@/lib/idb-storage'

export type Theme = 'light' | 'dark' | 'system'

/** Order the theme toggle steps through. */
const THEME_CYCLE: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' }

interface UiState {
  /** Desktop rail collapse (persisted). */
  sidebarCollapsed: boolean
  /** Mobile/tablet drawer open (ephemeral, not persisted). */
  sidebarMobileOpen: boolean
  theme: Theme
  toggleSidebar: () => void
  setSidebar: (collapsed: boolean) => void
  setMobileSidebar: (open: boolean) => void
  toggleMobileSidebar: () => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

/** Global UI chrome state (sidebar + theme). Single-concern, select narrowly. */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      theme: 'light',
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebar: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileSidebar: (open) => set({ sidebarMobileOpen: open }),
      toggleMobileSidebar: () => set((s) => ({ sidebarMobileOpen: !s.sidebarMobileOpen })),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: THEME_CYCLE[s.theme] })),
    }),
    {
      name: 'xpertone-ui',
      // Local data always lives in IndexedDB (never localStorage). It's async,
      // so hydration is explicit in main.tsx — before the first paint.
      storage: createJSONStorage(createIdbStorage),
      skipHydration: true,
      // Don't persist the transient mobile drawer state.
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed, theme: s.theme }),
    },
  ),
)
