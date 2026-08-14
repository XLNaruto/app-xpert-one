/**
 * Talk credentials — the module's public surface.
 *
 * Two screens: the credential list, and the one issue/edit form behind it. These
 * are the EMPLOYEE Talk logins; a back-office user's Talk access is part of
 * their panel login and lives on `features/administration/admin-user`.
 *
 * Cross-feature imports come through here, never through a deep path.
 */
export { TalkCredentialListPage } from './pages/talk-credential-list-page'
export { TalkCredentialCreatePage } from './pages/talk-credential-create-page'

export { useTalkCredentials, useTalkCredential } from './api/use-talk-credentials'
export {
  useCreateTalkCredential,
  useUpdateTalkCredential,
  useDeleteTalkCredential,
} from './api/use-talk-credential-mutations'

export { employeeLabel } from './lib/talk-credential-mappers'
export { TALK_CREDENTIAL_SORT, TALK_CREDENTIAL_DEFAULT_SORT } from './constants'

export type {
  TalkCredential,
  TalkCredentialCompany,
  TalkCredentialDepartment,
} from './types'
export type { TalkCredentialStatus } from './schemas'
