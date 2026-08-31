import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createIdbSessionStorage } from '@/lib/idb-storage'

/**
 * The signed-in user, as returned by `POST /user/auth/login` (camelCased).
 * `roleId` / `companyId` are null until a role is assigned / a company is
 * selected for the session — an owner logs in with no company at all and picks
 * one, so `isOwner: true` normally means `companyId: null` on the first login.
 */
export interface AuthUser {
  id: number
  accountId: number
  email: string
  name: string
  roleId: number | null
  companyId: number | null
  isOwner: boolean
  /**
   * The company this account last worked in — a hint, not a selection: the gate
   * still asks every login, it just pre-highlights this one. Null when the
   * account has never picked a company.
   */
  lastSelectedCompanyId: number | null
  phone?: string
  avatarUrl?: string
}

/** "Remember me" keeps the session for a year; otherwise it's session-only. */
const REMEMBER_MS = 365 * 24 * 60 * 60 * 1000

interface SetSessionOptions {
  remember?: boolean
  /** Access-token lifetime in seconds, from the login/refresh response. */
  expiresIn?: number
  /** Whether this sign-in went through a second factor — see `twoFactorEnabled`. */
  twoFactorEnabled?: boolean
}

/** Absolute access-token expiry from a lifetime in seconds (null if unknown). */
function accessExpiryFrom(expiresIn?: number): number | null {
  return expiresIn && expiresIn > 0 ? Date.now() + expiresIn * 1000 : null
}

interface AuthState {
  user: AuthUser | null
  /** Short-lived access token, attached as the Bearer on every request. */
  token: string | null
  /** Long-lived refresh token, exchanged at /auth/refresh for a new pair. */
  refreshToken: string | null
  isAuthenticated: boolean
  /** Whether the session should survive a browser restart (persist storage). */
  rememberMe: boolean
  /** Absolute session expiry (epoch ms) when remembered; null session-only. */
  expiresAt: number | null
  /**
   * Absolute expiry (epoch ms) of the *access* token — distinct from
   * `expiresAt`, which governs how long the persisted session survives. Drives
   * the proactive refresh in `lib/auth-refresh.ts`; null when unknown.
   */
  accessTokenExpiresAt: number | null
  /**
   * Whether the user holds a second factor on their login. No endpoint reports
   * this, so it is *inferred* at sign-in and cannot be read back: a login that
   * asked for a code before minting the token pair means on, one that went
   * straight through means off. `POST /user/me/two-factor/{enable,disable}`
   * updates it from there, including from the 409 those answer when the flag
   * was already what was asked for.
   */
  twoFactorEnabled: boolean
  /**
   * Whether `POST /user/auth/select-company` has actually run for *this*
   * session. The login response carries a `company_id` for a member account,
   * but that is only the company they belong to — the access token is not
   * scoped to it until the selection is submitted, so tenant endpoints answer
   * "Select a company first". The gate therefore keys off this flag, not off
   * `user.companyId`: false means "still ask", whatever the login said. It is
   * persisted with the session, so a reload doesn't re-ask.
   */
  companySelected: boolean
  /** Record the second factor being switched on or off from the profile screen. */
  setTwoFactorEnabled: (enabled: boolean) => void
  /** Establish a full session after sign-in. */
  setSession: (
    user: AuthUser,
    token: string,
    refreshToken: string,
    options?: SetSessionOptions,
  ) => void
  /**
   * Rotate the token pair (used by the refresh flow). A refresh token is only
   * replaced when the server returns a rotated one; otherwise the current one
   * is kept.
   */
  setTokens: (token: string, refreshToken?: string | null, expiresIn?: number) => void
  /**
   * Record the company that `POST /user/auth/select-company` just made active.
   * The server owns this (it's re-read from the database on every token
   * refresh); the local copy is what the company gate and switcher read.
   */
  setActiveCompany: (companyId: number | null) => void
  /** Clear the session locally (backend logout is handled by `useLogout`). */
  logout: () => void
}

/**
 * Global auth session — client state, persisted (encrypted) to IndexedDB via
 * `createIdbSessionStorage`. `rememberMe`/`expiresAt` are read by that adapter
 * to decide session-only vs. remembered persistence and expiry.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      rememberMe: false,
      expiresAt: null,
      accessTokenExpiresAt: null,
      twoFactorEnabled: false,
      companySelected: false,
      setTwoFactorEnabled: (enabled) => set({ twoFactorEnabled: enabled }),
      setSession: (user, token, refreshToken, options) => {
        const remember = options?.remember ?? false
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
          rememberMe: remember,
          expiresAt: remember ? Date.now() + REMEMBER_MS : null,
          accessTokenExpiresAt: accessExpiryFrom(options?.expiresIn),
          twoFactorEnabled: options?.twoFactorEnabled ?? false,
          // A fresh sign-in always goes through the gate again — the new token
          // carries no active company until select-company says so.
          companySelected: false,
        })
      },
      setTokens: (token, refreshToken, expiresIn) =>
        set((s) => ({
          token,
          refreshToken: refreshToken ?? s.refreshToken,
          accessTokenExpiresAt: accessExpiryFrom(expiresIn),
        })),
      setActiveCompany: (companyId) =>
        set((s) => ({
          ...(s.user ? { user: { ...s.user, companyId } } : {}),
          companySelected: companyId != null,
        })),
      logout: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          rememberMe: false,
          expiresAt: null,
          accessTokenExpiresAt: null,
          twoFactorEnabled: false,
          companySelected: false,
        }),
    }),
    {
      name: 'xpertone-auth',
      // Tokens encrypted at rest; hydrated explicitly in main.tsx so the
      // synchronous route guards see the restored session on first load.
      storage: createJSONStorage(createIdbSessionStorage),
      skipHydration: true,
    },
  ),
)
