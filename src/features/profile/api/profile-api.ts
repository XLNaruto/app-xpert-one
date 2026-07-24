import { mockDelay } from '@/lib/utils'
import type { MyProfile } from '../types'

/**
 * The signed-in user's profile. No backend yet — this returns mock data so the
 * profile screen renders. When the API is ready, swap this for a
 * `GET /me` call that validates and maps the response to `MyProfile`.
 */
export async function fetchMyProfile(): Promise<MyProfile> {
  return mockDelay<MyProfile>({
    id: 1,
    phone: '+919876543210',
    displayName: 'XpertOne Admin',
    email: 'admin@xpertone.com',
    status: 'active',
    createdAt: '2025-01-15T09:30:00.000Z',
    dateOfJoining: '2025-01-15',
  })
}
