import { create } from 'zustand'

interface IpBlockState {
  /**
   * The server's message for the block (`"Requests from this IP address are
   * blocked"`), or `null` while this network is allowed. Non-null puts the
   * `RestrictedIp` overlay on screen.
   */
  blockedMessage: string | null
  /** Raised by the api-client interceptor on a `RESTRICTED_IP` response. */
  block: (message: string) => void
  /** Lifted after a successful request proves the address is allowed again. */
  clear: () => void
}

/**
 * Whether this browser's network is currently blocked from the API.
 *
 * Deliberately *not* persisted: a block belongs to the address the user is on, so
 * a reload must ask the server again rather than restore a verdict that may no
 * longer hold (moving off a coffee-shop Wi-Fi shouldn't need a cache purge).
 */
export const useIpBlockStore = create<IpBlockState>()((set) => ({
  blockedMessage: null,
  // Guard the write so a burst of parallel 403s doesn't re-render the overlay
  // once per failed request.
  block: (message) =>
    set((s) => (s.blockedMessage === message ? s : { blockedMessage: message })),
  clear: () => set((s) => (s.blockedMessage === null ? s : { blockedMessage: null })),
}))
