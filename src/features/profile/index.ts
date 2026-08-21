/**
 * My Profile — the signed-in account's own details (`GET /user/me`).
 *
 * `useMyProfile` is the read the topbar leans on for the account's name and
 * contact, so it is part of the public surface alongside the screen.
 */
export { MyProfilePage } from './pages/my-profile-page'
export { useMyProfile } from './api/use-profile'
export { useSetTwoFactor } from './api/use-two-factor'
export { TwoFactorCard } from './components/two-factor-card'
export { statusLabel } from './lib/profile-mappers'
export type {
  MyProfile,
  ProfileAccount,
  ProfileSubscription,
  ProfileUsage,
} from './types'
