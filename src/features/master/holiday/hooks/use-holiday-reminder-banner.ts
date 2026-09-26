import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { encryptParams } from '@/lib/crypto'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { useHolidayReminder } from '../api/use-holiday-reminder'
import type { HolidayReminderCompany } from '../types'

/**
 * Drives the dashboard's "add next year's holidays" banner. Each named company
 * links to the year form pre-filled with that company and the reminder's
 * accounting year — the company rides along rather than being switched to, so
 * adding holidays for a sister company doesn't move the whole session.
 */
export function useHolidayReminderBanner(companyIds?: string[]) {
  const navigate = useNavigate()
  const { canCreate } = useResourceAccess(PERMISSIONS.holidays)

  // The dashboard filter holds ids as strings; the query key wants them stable.
  const ids = useMemo(
    () =>
      companyIds
        ?.map(Number)
        .filter((id) => Number.isFinite(id))
        .sort((a, b) => a - b),
    [companyIds],
  )

  const reminder = useHolidayReminder(ids)

  const openYearForm = (company: HolidayReminderCompany) => {
    const accountingYear = reminder.data?.accountingYear
    if (!accountingYear) return
    navigate({
      to: '/master/holiday/year',
      search: {
        data: encryptParams({
          accountingYear,
          companyId: company.companyId,
          companyName: company.companyName,
        }),
      },
    })
  }

  return {
    reminder: reminder.data,
    // A banner is a nudge — a failed read just leaves it out.
    visible: Boolean(reminder.data?.show),
    canAdd: canCreate,
    openYearForm,
  }
}
