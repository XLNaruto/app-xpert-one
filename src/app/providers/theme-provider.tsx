import { useEffect, type ReactNode } from 'react'
import { useResolvedTheme } from '@/hooks/use-resolved-theme'

/** Applies the current theme to <html> as a `.dark` class. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useResolvedTheme()

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return <>{children}</>
}
