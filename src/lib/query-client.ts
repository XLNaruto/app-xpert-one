import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api-error'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      // A 4xx is the server's verdict — a missing permission (403) or a missing
      // record (404) won't change on a second try, so only network/5xx
      // failures get the one retry.
      retry: (failureCount, error) => {
        const status = error instanceof ApiError ? error.status : undefined
        if (status != null && status >= 400 && status < 500) return false
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
    },
  },
})
