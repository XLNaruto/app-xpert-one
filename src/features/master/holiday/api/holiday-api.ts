import { mockDelay } from '@/lib/utils'
import { ALL_ROWS, paginate, type PageParams, type Paginated } from '@/lib/pagination'
import { createdStamp, updatedStamp } from '@/lib/audit'
import type { HolidayFormValues } from '../schemas'
import type { Holiday } from '../types'

/**
 * In-memory holiday master store. No backend yet — records live here for the
 * session. Swap each function's body for the matching REST call when the API
 * lands; the signatures stay the same.
 */

let holidays: Holiday[] = [
  {
    id: 1,
    holidayName: 'TEST HOLIDAY123',
    fromDate: '2026-04-30',
    toDate: '2026-04-20',
    createdBy: 'Roman Rings',
    createdAt: '2026-04-28T09:24:55.098Z',
    updatedBy: 'Roman Rings',
    updatedAt: '2026-04-28T11:26:49.275Z',
  },
  {
    id: 2,
    holidayName: 'DHULETI',
    fromDate: '2026-03-01',
    toDate: '2026-03-01',
    createdBy: 'Rohan Sanghani',
    createdAt: '2026-03-02T10:08:15.415Z',
    updatedBy: 'Roman Rings',
    updatedAt: '2026-04-21T06:39:16.596Z',
  },
]

function nextId(): number {
  return holidays.reduce((max, h) => Math.max(max, h.id), 0) + 1
}

/** Map validated form values onto the stored fields shared by create + update. */
function applyForm(values: HolidayFormValues) {
  return {
    holidayName: values.holidayName.trim(),
    fromDate: values.fromDate,
    toDate: values.toDate,
  }
}

/** Record fields the list screen's search box matches against. */
const SEARCH_FIELDS: readonly (keyof Holiday)[] = ['holidayName']

export async function fetchHolidays(params: PageParams = ALL_ROWS): Promise<Paginated<Holiday>> {
  return mockDelay(paginate([...holidays], params, SEARCH_FIELDS))
}

export async function fetchHoliday(id: number): Promise<Holiday> {
  const found = holidays.find((h) => h.id === id)
  if (!found) throw new Error('Holiday not found')
  return mockDelay({ ...found })
}

export async function createHoliday(values: HolidayFormValues): Promise<Holiday> {
  const record: Holiday = {
    id: nextId(),
    ...applyForm(values),
    ...createdStamp(),
  }
  holidays = [record, ...holidays]
  return mockDelay({ ...record })
}

export async function updateHoliday(
  id: number,
  values: HolidayFormValues,
): Promise<Holiday> {
  const index = holidays.findIndex((h) => h.id === id)
  if (index === -1) throw new Error('Holiday not found')
  const updated: Holiday = {
    ...holidays[index],
    ...applyForm(values),
    ...updatedStamp(),
  }
  holidays = holidays.map((h) => (h.id === id ? updated : h))
  return mockDelay({ ...updated })
}

export async function deleteHoliday(id: number): Promise<void> {
  holidays = holidays.filter((h) => h.id !== id)
  return mockDelay(undefined)
}
