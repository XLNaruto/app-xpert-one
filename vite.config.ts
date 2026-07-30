import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

/** Must match `API_PROXY_PREFIX` in `src/config/api-proxy.ts`. */
const API_PROXY_PREFIX = '/api'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars for the active mode (.env, .env.<mode>) — only VITE_* are exposed.
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  // Dev-only reverse proxy. When VITE_APP_API_TARGET is set, the client talks to
  // the same-origin `/api` prefix (see `apiBaseUrl` in config/env.ts) and the dev
  // server forwards to the real API — so the browser never makes a cross-origin
  // request and CORS / third-party-cookie rules don't apply on localhost.
  const proxyTarget = (env.VITE_APP_API_TARGET || '').replace(/\/+$/, '')

  return {
    base: env.VITE_APP_BASE_URL || '/',
    plugins: [
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      tailwindcss(),
      tsconfigPaths(),
    ],
    server: {
      proxy: proxyTarget
        ? {
            [API_PROXY_PREFIX]: {
              target: proxyTarget,
              changeOrigin: true,
              // Upstream https targets with self-signed certs (staging boxes).
              secure: proxyTarget.startsWith('https://'),
              ws: true,
              // `/api/user/auth/login` → `<target>/user/auth/login`
              rewrite: (path) => path.replace(new RegExp(`^${API_PROXY_PREFIX}`), ''),
            },
          }
        : undefined,
    },
  }
})
