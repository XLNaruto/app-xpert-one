import { useConfigStore } from '@/stores/config-store'

/**
 * Join a media base URL and a storage path. The pure core of `mediaUrl()` —
 * exported for the `useMediaUrl()` hook, which reads the base reactively.
 *
 * - Empty/nullish paths → `''` (nothing to render).
 * - Already-absolute inputs (`http(s)://`, protocol-relative, `data:`/`blob:`)
 *   are returned untouched, so object-URL previews pass through safely.
 * - With no base URL yet, the raw path is returned as a fallback.
 */
export function joinMediaUrl(base: string, path?: string | null): string {
  if (!path) return ''
  if (/^(https?:)?\/\//i.test(path) || /^(data|blob):/i.test(path)) return path
  if (!base) return path
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

/**
 * Build a full media URL from a storage path returned by the API — e.g.
 * `accounts/1/employees/photos/6a74….png` →
 * `https://cdn.dev.xpertoneindia.com/accounts/1/employees/photos/6a74….png`.
 *
 * The backend hands back only relative paths/keys for images and documents; the
 * origin lives in the `media_path` config value fetched once at app start (see
 * `useAppConfig`). This joins the two.
 *
 * Reads the store non-reactively, so it works from mappers and other non-React
 * files. **Components should prefer `useMediaUrl()`** — on a first-ever load the
 * base URL can arrive after the first render, and this function alone won't
 * re-render the image when it does.
 */
export function mediaUrl(path?: string | null): string {
  return joinMediaUrl(useConfigStore.getState().mediaBaseUrl, path)
}
