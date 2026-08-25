import { createFileRoute, redirect } from '@tanstack/react-router'
import { WorkspaceLayout } from '@/app/layouts/workspace-layout'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Pathless layout for FULL-SCREEN workspaces — same auth gate as
 * `_authenticated`, without the sidebar/topbar shell.
 *
 * A route under here keeps its ordinary URL (`/talk/monitoring`); only the
 * chrome around it differs, so a link into one is a normal link and can be
 * opened in its own tab.
 */
export const Route = createFileRoute('/_workspace')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: WorkspaceLayout,
})
