/**
 * My Profile — the signed-in account's own details (`GET /user/me`).
 *
 * `useMyProfile` is the read the topbar leans on for the signed-in name and
 * contact, and `isAccountItself` decides whether that is the organization or
 * the person, so both are part of the public surface alongside the screen.
 */
export { MyProfilePage } from './pages/my-profile-page'
export { useMyProfile } from './api/use-profile'
export { useSetTwoFactor } from './api/use-two-factor'
export { TwoFactorCard } from './components/two-factor-card'
export { isAccountItself, shouldShowUserDetails, statusLabel } from './lib/profile-mappers'
export type {
  MyProfile,
  ProfileAccount,
  ProfileSubscription,
  ProfileUsage,
  ProfileUser,
} from './types'
