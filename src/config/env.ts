import { z } from 'zod'
import { API_PROXY_PREFIX } from './api-proxy'

/** All environment access flows through here (zod-parsed, fail-fast). */
const envSchema = z.object({
  // API origin (e.g. http://192.168.1.20:3000); endpoint paths are appended.
  // Empty string (unset in some .env files) falls back to the default.
  VITE_APP_API_URL: z
    .string()
    .default('http://localhost:3000')
    .transform((v) => v || 'http://localhost:3000'),
  // Dev-only reverse-proxy target. When set, `vite.config.ts` forwards
  // `/api/*` to it and requests go same-origin (see `apiBaseUrl` below).
  VITE_APP_API_TARGET: z.string().default(''),
  VITE_USE_MOCK_API: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  VITE_MAP_TILE_URL: z
    .string()
    .default('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),

  /** Google Maps JavaScript API key — powers geo-location pickers. */
  VITE_GOOGLE_MAPS_KEY: z
    .string()
    .default('AIzaSyCR5dRbUjEWxxxDsHbmWd76vBzLgunN8io'),

  /**
   * Razorpay publishable key id — the payment sheet a plan purchase hands off
   * to. Empty means this environment can't take a card: the purchase still
   * raises its order server-side, and the screen says the payment is pending
   * rather than opening a checkout that can't load.
   */
  VITE_RAZORPAY_KEY_ID: z.string().default(''),

  /**
   * Origin of the Talk chat app — the sidebar's Communication → Chat row opens
   * it in a new tab. Talk is a separate deployment with its own session, so the
   * panel only ever links to it; nothing here is called as an API.
   */
  VITE_APP_TALK_URL: z
    .string()
    .default('https://talk.dev.xpertoneindia.com/')
    .transform((v) => v || 'https://talk.dev.xpertoneindia.com/'),

  /** Secret used to derive the key that encrypts persisted client storage. */
  VITE_APP_ENCRYPT_KEY: z.string().default('xpertone-storage-key'),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  console.error(
    '❌ Invalid environment variables:',
    z.flattenError(parsed.error).fieldErrors,
  )
  throw new Error('Invalid environment variables')
}

export const env = parsed.data

/**
 * Base URL every axios instance should use.
 *
 * With `VITE_APP_API_TARGET` set during `npm run dev`, this is the same-origin
 * `/api` prefix that the Vite dev server reverse-proxies to that target — no
 * CORS preflights, and cookies/headers behave as if the API were local.
 * In a production build (or with no target configured) it is the real
 * `VITE_APP_API_URL` origin, so nothing about the deployed app changes.
 */
export const apiBaseUrl =
  import.meta.env.DEV && env.VITE_APP_API_TARGET
    ? API_PROXY_PREFIX
    : env.VITE_APP_API_URL
