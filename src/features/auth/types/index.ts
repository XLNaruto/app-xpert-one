import type { AuthUser } from '@/stores/auth-store'

export type { AuthUser }
export type { LoginValues, LoginResponse, TokenResponse } from '../schemas'

/** The client-side session a successful sign-in resolves to. */
export interface AuthSession {
  user: AuthUser
  token: string
  refreshToken: string
  /** Access-token lifetime in seconds. */
  expiresIn: number
}
