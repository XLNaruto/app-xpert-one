import { MutationCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from './api-error'
import { queryKeys } from './query-keys'

/** Where the account's plan — and a booked plan change — is managed. */
const BILLING_PATH = '/administration/billing'

/**
 * While a `next_renewal` plan switch is booked, the account is held to the
 * SMALLER of the two plans' limits, so adding an employee or a company can fail
 * with a 409 that no form on the adding screen can fix. The screen still shows
 * its own error; this adds the way out — a link to billing, where the booking
 * can be cancelled. Matched on the server's wording because the 409 carries no
 * dedicated code.
 */
function isBookedPlanLimitError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    /booked plan change/i.test(error.message)
  )
}

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      if (!isBookedPlanLimitError(error)) return
      toast.info('A booked plan change is limiting your account.', {
        id: 'booked-plan-limit',
        duration: 8000,
        description: 'Cancel the booked change on the billing page to lift the limit.',
        action: {
          label: 'Open billing',
          // Lazy: the router is built with this client, so a static import
          // would be circular.
          onClick: () => {
            void import('@/app/router/router').then(({ router }) =>
              router.navigate({ to: BILLING_PATH }),
            )
          },
        },
      })
    },
  }),
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

/**
 * Office Task is live work — a run started on a phone, a hand-in answered by an
 * approver a minute ago — so nothing under `office-task` is served from cache:
 * every screen, every tab and every filter reads the API when it's shown, and
 * a query nobody is looking at is dropped at once.
 */
queryClient.setQueryDefaults(queryKeys.officeTask.all, {
  staleTime: 0,
  gcTime: 0,
  refetchOnMount: 'always',
})
