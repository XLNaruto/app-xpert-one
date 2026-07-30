import axios from 'axios'
import { apiBaseUrl } from '@/config/env'
import { endpoints } from '@/lib/endpoints'
import { useAuthStore } from '@/stores/auth-store'

/** How often the scheduler checks whether the access token is close to expiry. */
export const REFRESH_CHECK_INTERVAL_MS = 60 * 1000

/** Renew this far ahead of expiry, so an in-flight request can't race it. */
export const REFRESH_SKEW_MS = 2 * 60 * 1000

/**
 * `POST /user/auth/refresh` response. The server always rotates — the old
 * refresh token is revoked and a new one comes back — but `refresh_token` is
 * typed optional so a non-rotating response keeps the current one instead of
 * clearing it.
 */
interface RefreshResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
}

// Bare client (no interceptors) so refreshing can't recurse through the 401
// handler that calls it.
const refreshClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
})

let inFlight: Promise<string> | null = null

/**
 * Exchange the refresh token for a fresh token pair. Single-flight: concurrent
 * callers (the 401 interceptor and the scheduler below) share one in-flight
 * request so we only hit /user/auth/refresh once.
 */
export function refreshAccessToken(): Promise<string> {
  if (inFlight) return inFlight

  const { refreshToken } = useAuthStore.getState()
  if (!refreshToken) {
    return Promise.reject(new Error('No refresh token available'))
  }

  inFlight = refreshClient
    .post<RefreshResponse>(endpoints.AUTH.REFRESH_TOKEN, {
      refresh_token: refreshToken,
    })
    .then((res) => {
      const { access_token, refresh_token: rotated, expires_in } = res.data
      useAuthStore.getState().setTokens(access_token, rotated, expires_in)
      return access_token
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}

let timer: ReturnType<typeof setInterval> | null = null

/**
 * Start a background timer that keeps the access token fresh while signed in.
 * Driven by the token's own `expires_in` (stored as `accessTokenExpiresAt`) —
 * when the lifetime is unknown we leave it alone and let the 401 interceptor
 * refresh reactively instead.
 */
export function startTokenRefreshScheduler(): () => void {
  stopTokenRefreshScheduler()

  timer = setInterval(() => {
    const { token, refreshToken, accessTokenExpiresAt } = useAuthStore.getState()
    if (!token || !refreshToken || accessTokenExpiresAt == null) return
    if (Date.now() < accessTokenExpiresAt - REFRESH_SKEW_MS) return
    refreshAccessToken().catch(() => {
      useAuthStore.getState().logout()
    })
  }, REFRESH_CHECK_INTERVAL_MS)

  return stopTokenRefreshScheduler
}

export function stopTokenRefreshScheduler() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
