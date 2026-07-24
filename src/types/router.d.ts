import '@tanstack/react-router'

/** Extra fields carried in history location state (not the URL). */
declare module '@tanstack/react-router' {
  interface HistoryState {
    /** Email carried through the forgot-password → verify → reset flow. */
    email?: string
  }
}
