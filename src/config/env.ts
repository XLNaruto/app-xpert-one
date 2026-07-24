import { z } from 'zod'

/** All environment access flows through here (zod-parsed, fail-fast). */
const envSchema = z.object({
  // API origin (e.g. http://192.168.1.20:3000); endpoint paths are appended.
  // Empty string (unset in some .env files) falls back to the default.
  VITE_APP_API_URL: z
    .string()
    .default('http://localhost:3000')
    .transform((v) => v || 'http://localhost:3000'),
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
