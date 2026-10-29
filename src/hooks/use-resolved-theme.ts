import { useSyncExternalStore } from 'react'
import { useUiStore } from '@/stores/ui-store'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(DARK_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

const systemPrefersDark = () => window.matchMedia(DARK_QUERY).matches

/**
 * The theme actually on screen — the stored preference, with `system` resolved
 * against the OS setting (and kept live as that setting changes).
 */
export function useResolvedTheme(): 'light' | 'dark' {
  const theme = useUiStore((s) => s.theme)
  const prefersDark = useSyncExternalStore(subscribe, systemPrefersDark, () => false)
  if (theme === 'system') return prefersDark ? 'dark' : 'light'
  return theme
}
