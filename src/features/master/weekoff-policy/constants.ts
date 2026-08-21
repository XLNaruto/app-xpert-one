import type { ComboboxOption } from '@/components/ui/combobox'
import type { WeekoffPolicyFormValues } from './schemas'
import type { WeekoffOffType } from './types'

/**
 * The `sort` values `/user/weekoff-policies` accepts. Sorting is server-side, so
 * a column is sortable only if it appears here — the list gives each of these
 * columns the API's field name as its column id, and marks the rest unsortable.
 */
export const WEEKOFF_POLICY_SORT = {
  name: 'name',
  createdAt: 'created_at',
} as const

/** Newest policy first — the order the list opens in and reverts to. */
export const WEEKOFF_POLICY_DEFAULT_SORT = {
  id: WEEKOFF_POLICY_SORT.createdAt,
  desc: true,
}

/**
 * The seven weekdays, in the API's own numbering: 0 = Sunday … 6 = Saturday.
 * Index into this with `week_day` — never re-derive the order.
 */
export const WEEK_DAYS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
] as const

/** Weekday dropdown for an occurrence rule row. */
export const WEEK_DAY_OPTIONS: ComboboxOption[] = WEEK_DAYS.map((day) => ({
  label: day.label,
  value: String(day.value),
}))

/**
 * Which occurrence of the weekday a rule applies to. `''` is the API's `null` —
 * every occurrence — and is what a working-day exception uses when it applies to
 * the whole month.
 */
export const WEEK_NUMBER_OPTIONS: ComboboxOption[] = [
  { label: 'Every occurrence', value: '' },
  { label: '1st of the month', value: '1' },
  { label: '2nd of the month', value: '2' },
  { label: '3rd of the month', value: '3' },
  { label: '4th of the month', value: '4' },
  { label: '5th of the month', value: '5' },
]

/** Ordinal for an occurrence number, for the summary line on a list row. */
export const OCCURRENCE_LABELS: Record<number, string> = {
  1: '1st',
  2: '2nd',
  3: '3rd',
  4: '4th',
  5: '5th',
}

/**
 * The patterns nearly every company actually uses, as one click each. They
 * replace the current selection rather than adding to it — a preset is a
 * starting point, and merging two of them would produce a pattern nobody asked
 * for.
 */
export const WEEKOFF_PRESETS: {
  label: string
  description: string
  apply: Pick<WeekoffPolicyFormValues, 'everyWeekDays' | 'rules'>
}[] = [
  {
    label: 'Sunday only',
    description: 'Every Sunday off',
    apply: { everyWeekDays: [0], rules: [] },
  },
  {
    label: 'Saturday & Sunday',
    description: 'A full weekend off',
    apply: { everyWeekDays: [0, 6], rules: [] },
  },
  {
    label: 'Sunday + alternate Saturdays',
    description: 'Sundays, plus the 2nd and 4th Saturday',
    apply: {
      everyWeekDays: [0],
      rules: [
        { weekDay: '6', weekNumber: '2', isOff: true },
        { weekDay: '6', weekNumber: '4', isOff: true },
      ],
    },
  },
]

/**
 * The two shapes a policy can take. FIXED names the weekdays; FLEXIBLE names a
 * count and lets the rota decide which days — which is the only way to describe a
 * shop, warehouse or hospital that runs seven days.
 */
export const WEEKOFF_OFF_TYPE_OPTIONS: {
  value: WeekoffOffType
  label: string
  description: string
}[] = [
  {
    value: 'FIXED',
    label: 'Fixed days',
    description: 'Name the weekdays that are off — the same every week.',
  },
  {
    value: 'FLEXIBLE',
    label: 'Any days',
    description: 'Name how many days a week are off and let the rota pick them.',
  },
]

/** Blank form values for a new policy — Sunday off, the commonest starting point. */
export const EMPTY_WEEKOFF_POLICY_FORM: WeekoffPolicyFormValues = {
  name: '',
  offType: 'FIXED',
  everyWeekDays: [0],
  rules: [],
  weeklyOffDays: '',
  status: true,
}

/** Which level a default is being pinned at. */
export const WEEKOFF_DEFAULT_SCOPES: ComboboxOption[] = [
  { label: 'Whole company', value: 'company' },
  { label: 'One department', value: 'department' },
]
