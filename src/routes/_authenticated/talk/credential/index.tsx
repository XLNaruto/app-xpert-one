import { createFileRoute } from '@tanstack/react-router'
import { TalkCredentialListPage } from '@/features/talk/credential'

export const Route = createFileRoute('/_authenticated/talk/credential/')({
  component: TalkCredentialListPage,
})
