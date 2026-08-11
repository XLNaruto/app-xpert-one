import { z } from 'zod'

/**
 * Attendance Management — the wire shapes.
 *
 * Read-only screens, so there is no form schema here: these parse what the two
 * endpoints answer, and `lib/attendance-mappers` turns them into the record
 * types the components read.
 */

const totalsSchema = z.object({
  total: z.number(),
  present: z.number(),
  absent: z.number(),
  attendance_rate: z.number(),
})

const groupSchema = totalsSchema.extend({
  id: z.number(),
  name: z.string(),
  code: z.string().nullish(),
})

const groupBySchema = z.enum(['department', 'designation'])

export const attendanceGroupsResponseSchema = z.object({
  date: z.string(),
  today: z.string(),
  group_by: groupBySchema,
  totals: totalsSchema,
  items: z.array(groupSchema),
  total: z.number(),
})

const employeeSchema = z.object({
  employee_id: z.number(),
  prefix: z.string().nullish(),
  name: z.string().nullish(),
  employee_full_name: z.string().nullish(),
  code: z.string().nullish(),
  photo: z.string().nullish(),
  status: z.enum(['present', 'absent']),
  attendance_id: z.number().nullish(),
  day_status: z
    .enum(['present', 'half_day', 'absent', 'leave', 'holiday', 'weekly_off', 'future'])
    .nullish(),
  check_in: z.string().nullish(),
  check_out: z.string().nullish(),
  total_hour: z.string().nullish(),
  check_in_at: z.string().nullish(),
  check_out_at: z.string().nullish(),
})

export const attendanceGroupEmployeesResponseSchema = z.object({
  date: z.string(),
  today: z.string(),
  group_by: groupBySchema,
  group: groupSchema,
  totals: totalsSchema,
  items: z.array(employeeSchema),
  total: z.number(),
})

/* ── One employee's month ───────────────────────────────────────────────── */

const dayStatusSchema = z.enum([
  'present',
  'half_day',
  'absent',
  'leave',
  'holiday',
  'weekly_off',
  'future',
])

const punchSchema = z.object({
  id: z.number(),
  event_type: z.enum(['check_in', 'check_out']),
  event_time: z.string().nullish(),
  time: z.string().nullish(),
  captured_image: z.string().nullish(),
  captured_image_url: z.string().nullish(),
  latitude: z.string().nullish(),
  longitude: z.string().nullish(),
  location_accuracy: z.string().nullish(),
  device: z.string().nullish(),
})

const monthDaySchema = z.object({
  shift_date: z.string(),
  status: dayStatusSchema,
  check_in: z.string().nullish(),
  check_out: z.string().nullish(),
  total_hour: z.string().nullish(),
  total_time: z.object({ display: z.string().nullish() }).nullish(),
  weekly_off: z.boolean().nullish(),
  holiday_name: z.string().nullish(),
  leave_type: z.string().nullish(),
  log: z.array(punchSchema).nullish(),
})

/**
 * The month read wraps its answer in `data` — the one endpoint in this feature
 * that does, because it is the same payload `POST /employees/:id/attendance/view`
 * returns rather than a shape written for this screen.
 */
export const attendanceMonthResponseSchema = z.object({
  data: z.object({
    month: z.string(),
    employee_id: z.number(),
    today: z.string().nullish(),
    weekly_off: z.string().nullish(),
    list: z.array(monthDaySchema),
    counts: z.object({
      present: z.number(),
      half_day: z.number(),
      absent: z.number(),
      leave: z.number(),
      holiday: z.number(),
      weekly_off: z.number(),
      future: z.number(),
      elapsed: z.number(),
      working: z.number(),
    }),
  }),
})

export type AttendanceMonthResponse = z.infer<typeof attendanceMonthResponseSchema>

export type AttendanceGroupsResponse = z.infer<typeof attendanceGroupsResponseSchema>
export type AttendanceGroupEmployeesResponse = z.infer<
  typeof attendanceGroupEmployeesResponseSchema
>
