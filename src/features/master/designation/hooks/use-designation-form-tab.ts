import { useNavigate } from '@tanstack/react-router'
import { encryptParams } from '@/lib/crypto'
import { DESIGNATION_FORM_TABS, type DesignationFormTab } from '../constants'

/** The tab a screen opens on when the token doesn't name one. */
const DEFAULT_TAB: DesignationFormTab = 'basic'

/**
 * Which tab the edit screen has open, carried in the URL rather than in state —
 * so a refresh, a bookmark or a shared link comes back to the tab that was open
 * instead of dropping the user back on Basic Info.
 *
 * It rides *inside* the encrypted `?data=` token, alongside the designation id,
 * rather than as a `?tab=` of its own: this screen's params live in one token, and
 * splitting one of them out would put half the screen's state in the clear.
 *
 * Switching tabs replaces the history entry rather than pushing one — the tabs are
 * two views of one record, so Back belongs to the screen the user arrived from,
 * not to the tab they just left.
 */
export function useDesignationFormTab(id: number, tab: DesignationFormTab) {
  const navigate = useNavigate()

  return {
    tab,
    setTab: (next: string) =>
      navigate({
        to: '/master/designation/create',
        search: { data: encryptParams({ id, tab: asTab(next) }) },
        replace: true,
      }),
  }
}

/**
 * Read a tab name off the token. Anything the screen doesn't have — a stale link,
 * a tampered token — falls back to the default rather than rendering no tab.
 */
export function asTab(value: unknown): DesignationFormTab {
  return DESIGNATION_FORM_TABS.find((tab) => tab === value) ?? DEFAULT_TAB
}
