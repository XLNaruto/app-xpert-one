import { useEffect, type ReactNode } from 'react'
import { QueryProvider } from './query-provider'
import { ThemeProvider } from './theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { startTokenRefreshScheduler } from '@/lib/auth-refresh'

export function AppProviders({ children }: { children: ReactNode }) {
  // Keep the access token fresh in the background while signed in.
  useEffect(() => startTokenRefreshScheduler(), [])

  return (
    <QueryProvider>
      <ThemeProvider>
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryProvider>
  )
}
