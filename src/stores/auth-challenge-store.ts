import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createIdbSessionStorage } from '@/lib/idb-storage'
// Type-only, so it is erased at build and no import cycle survives into the
// bundle — the feature reads this store back.
import type { AuthChallenge, LoginValues } from '@/features/auth'

/**
 * How long the code screen stays reachable across a reload. Far longer than the
 * two minutes a code lives, because an expired code is not a dead screen — the
 * user can still ask for another from it. It only bounds how long a half-done
 * sign-in can sit in storage.
 */
const CHALLENGE_TTL_MS = 15 * 60 * 1000

interface AuthChallengeState {
  challenge: AuthChallenge | null
  /**
   * The credentials the challenge came from. **`password` is dropped on the way
   * to storage** (see `partialize`), so after a reload this is the address and
   * the login form it was sent through, and nothing secret.
   */
  credentials: LoginValues | null
  /**
   * Read by `createIdbSessionStorage`, not by the app: `false` marks the record
   * session-only, so it survives a reload and a new tab but not a browser
   * restart. A half-finished sign-in should never outlive the browser.
   */
  rememberMe: boolean
  /** Also read by the storage adapter — it drops the record past this. */
  expiresAt: number | null
  /** A login answered with a challenge — hand the code screen its input. */
  start: (challenge: AuthChallenge, credentials: LoginValues) => void
  /**
   * Swap in a challenge that replaced this one — the hand-off from an
   * unverified address to a second factor, or a re-issued two-factor token.
   * The credentials are untouched; they're still the same sign-in.
   */
  replace: (challenge: AuthChallenge) => void
  /** The step is over — signed in, abandoned, or given up on. */
  clear: () => void
}

/**
 * The half-finished sign-in the code screen runs on: the challenge the login
 * answered with, plus who it was for.
 *
 * It is persisted so that reloading `/verify-otp` doesn't throw the user back
 * to the login form mid-code, and encrypted + session-only for the same reasons
 * the auth session is — a `challenge_token` is a login credential, even a
 * two-minute single-use one.
 *
 * The **password is deliberately not persisted**. Both branches of the step can
 * be finished without it (`verify-email` takes the address, `verify-login-otp`
 * takes the challenge token), so keeping a reusable, cross-site secret at rest
 * would buy only the two conveniences that replay a login — signing in
 * automatically once an address is verified, and re-issuing a two-factor
 * challenge on "Resend". Those degrade to a trip through the login form after a
 * reload; the screen itself keeps working.
 */
export const useAuthChallengeStore = create<AuthChallengeState>()(
  persist(
    (set) => ({
      challenge: null,
      credentials: null,
      rememberMe: false,
      expiresAt: null,
      start: (challenge, credentials) =>
        set({
          challenge,
          credentials,
          expiresAt: Date.now() + CHALLENGE_TTL_MS,
        }),
      // The window is the sign-in's, not each code's, so a re-issued challenge
      // doesn't extend it.
      replace: (challenge) => set({ challenge }),
      clear: () =>
        set({ challenge: null, credentials: null, expiresAt: null }),
    }),
    {
      name: 'xpertone-auth-challenge',
      storage: createJSONStorage(createIdbSessionStorage),
      // Everything but the password. `partialize` is what keeps it out of
      // storage while the live store still holds it for this tab.
      partialize: (state) => ({
        challenge: state.challenge,
        credentials: state.credentials && {
          ...state.credentials,
          password: '',
        },
        rememberMe: state.rememberMe,
        expiresAt: state.expiresAt,
      }),
      // IndexedDB is async; rehydrated in main.tsx before the router mounts so
      // the route guard below sees the restored challenge on a reload.
      skipHydration: true,
    },
  ),
)
