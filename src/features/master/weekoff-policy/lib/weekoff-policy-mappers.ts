import type { ComboboxOption } from '@/components/ui/combobox'
import { OCCURRENCE_LABELS, WEEK_DAYS, WEEKOFF_PRESETS } from '../constants'
import type {
  WeekoffDayPayload,
  WeekoffPolicyFormValues,
  WeekoffPolicyResponse,
  WeekoffPolicyUpdatePayload,
} from '../schemas'
import type { WeekoffDay, WeekoffPolicy } from '../types'

/** `3` → `Wednesday`, falling back to the raw number if the API widens the range. */
export function weekDayName(weekDay: number): string {
  return WEEK_DAYS.find((day) => day.value === weekDay)?.label ?? String(weekDay)
}

/** `3` → `Wed`. */
export function weekDayShort(weekDay: number): string {
  return WEEK_DAYS.find((day) => day.value === weekDay)?.short ?? String(weekDay)
}

/**
 * API record → the UI policy. The audit trail only comes back on the list rows;
 * on a single-record response it's absent and renders as a dash.
 */
export function toWeekoffPolicy(response: WeekoffPolicyResponse): WeekoffPolicy {
  return {
    id: response.id,
    companyId: response.company_id,
    name: response.name,
    status: response.status,
    days: response.days.map(
      (day): WeekoffDay => ({
        id: day.id,
        weekDay: day.week_day,
        weekNumber: day.week_number ?? null,
        isOff: day.is_off,
      }),
    ),
    createdBy: response.created_by_name ?? '',
    createdAt: response.created_at ?? '',
    updatedBy: response.updated_by_name ?? null,
    updatedAt: response.updated_at ?? null,
  }
}

/**
 * Validated form values → the request body shared by create and update.
 *
 * The form's two halves collapse into the API's one `days` array here: the ticked
 * weekdays become every-occurrence off rules, and the occurrence rows travel as
 * they were entered. The array is always the WHOLE rule set, because that's the
 * only thing the endpoint accepts — sending `days` replaces every rule.
 */
export function weekoffPolicyToPayload(
  values: WeekoffPolicyFormValues,
): WeekoffPolicyUpdatePayload {
  const everyWeek: WeekoffDayPayload[] = [...values.everyWeekDays]
    .sort((a, b) => a - b)
    .map((weekDay) => ({ week_day: weekDay, week_number: null, is_off: true }))

  const occurrences: WeekoffDayPayload[] = values.rules.map((rule) => ({
    week_day: Number(rule.weekDay),
    week_number: rule.weekNumber ? Number(rule.weekNumber) : null,
    is_off: rule.isOff,
  }))

  return {
    name: values.name.trim(),
    status: values.status,
    days: [...everyWeek, ...occurrences],
  }
}

/**
 * Hydrate the edit form from a stored policy — the inverse of the split above. A
 * plain every-occurrence off rule goes back to a tick; everything else (a dated
 * rule, or an every-occurrence *working* exception) is an occurrence row.
 */
export function weekoffPolicyToFormValues(
  policy: WeekoffPolicy,
): WeekoffPolicyFormValues {
  const everyWeekDays: number[] = []
  const rules: WeekoffPolicyFormValues['rules'] = []

  for (const day of policy.days) {
    if (day.weekNumber === null && day.isOff) {
      everyWeekDays.push(day.weekDay)
      continue
    }
    rules.push({
      weekDay: String(day.weekDay),
      weekNumber: day.weekNumber === null ? '' : String(day.weekNumber),
      isOff: day.isOff,
    })
  }

  return {
    name: policy.name,
    everyWeekDays: everyWeekDays.sort((a, b) => a - b),
    rules,
    status: policy.status,
  }
}

/**
 * Which preset the current selection *is*, or `-1` for a pattern of the user's
 * own. Order-insensitive on both halves, since a tick order and a row order carry
 * no meaning — what matters is the set of rules the pattern amounts to.
 */
export function matchingPresetIndex(
  everyWeekDays: number[],
  rules: WeekoffPolicyFormValues['rules'],
): number {
  const key = (
    days: number[],
    ruleList: WeekoffPolicyFormValues['rules'],
  ) =>
    JSON.stringify([
      [...days].sort((a, b) => a - b),
      ruleList
        .map((rule) => `${rule.weekDay}-${rule.weekNumber ?? ''}-${rule.isOff}`)
        .sort(),
    ])

  const current = key(everyWeekDays, rules)
  return WEEKOFF_PRESETS.findIndex(
    (preset) => key(preset.apply.everyWeekDays, preset.apply.rules) === current,
  )
}

/** One rule as a phrase — `2nd & 4th Sat` is built from these by the summary. */
export function ruleLabel(day: WeekoffDay): string {
  const occurrence =
    day.weekNumber === null ? 'Every' : (OCCURRENCE_LABELS[day.weekNumber] ?? '')
  const suffix = day.isOff ? '' : ' (working)'
  return `${occurrence} ${weekDayShort(day.weekDay)}${suffix}`.trim()
}

/**
 * The pattern as one readable line — what a list row shows instead of the raw
 * rules. Occurrences of the same weekday are folded together (`2nd, 4th Sat`),
 * since that's how the pattern is spoken.
 */
export function weekoffSummary(days: WeekoffDay[]): string {
  if (days.length === 0) return 'No rules'

  /** Weekday → the occurrences named for it, keeping off and working apart. */
  const grouped = new Map<string, { weekDay: number; isOff: boolean; parts: string[] }>()

  for (const day of days) {
    const key = `${day.weekDay}-${day.isOff}`
    const entry = grouped.get(key) ?? { weekDay: day.weekDay, isOff: day.isOff, parts: [] }
    entry.parts.push(
      day.weekNumber === null ? 'Every' : (OCCURRENCE_LABELS[day.weekNumber] ?? ''),
    )
    grouped.set(key, entry)
  }

  return [...grouped.values()]
    // Off days first, then weekday order — the exceptions read as asides.
    .sort((a, b) => Number(b.isOff) - Number(a.isOff) || a.weekDay - b.weekDay)
    .map((entry) => {
      const occurrences = entry.parts.join(', ')
      const label = `${occurrences} ${weekDayShort(entry.weekDay)}`
      return entry.isOff ? label : `${label} working`
    })
    .join(' · ')
}

/**
 * Dropdown options for the pickers that point something at a policy — the shift
 * form and the set-default dialog. The value is the policy's id.
 */
export function weekoffPolicyOptions(policies: WeekoffPolicy[]): ComboboxOption[] {
  return policies.map((policy) => ({
    label: `${policy.name} (${weekoffSummary(policy.days)})`,
    value: String(policy.id),
  }))
}
