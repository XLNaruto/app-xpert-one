/**
 * Centralised REST endpoint paths. Feature `api/` layers reference these
 * instead of hard-coding URL strings, so a path only ever changes in one place.
 * Paths are relative to `apiClient`'s baseURL (see `env.VITE_APP_API_URL`).
 *
 * The auth/profile backend is not wired yet — these are the paths the app will
 * call once the API is available.
 */
export const endpoints = {
  AUTH: {
    LOGIN: '/auth/login',
    REFRESH_TOKEN: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },
  /** The authenticated user's own profile, resolved from the access token. */
  ME: {
    GET: '/me',
  },
} as const
