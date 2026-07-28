import { z } from 'zod'

/**
 * Numeric fields cross the form boundary as strings (that's what an `<input>`
 * gives us) and are parsed to numbers by the mappers. These builders validate
 * the string form so the messages read like the rest of the app's forms.
 */

/** Required money field: present, numeric and not negative. */
const amount = (what: string) =>
  z
    .string()
    .trim()
    .min(1, `Please enter ${what}`)
    .refine((v) => Number.isFinite(Number(v)), 'Please enter a valid amount')
    .refine((v) => Number(v) >= 0, 'Amount must be positive')

/** Optional money field: blank is allowed, anything else must be a valid amount. */
const optionalAmount = z
  .string()
  .trim()
  .refine((v) => v === '' || Number.isFinite(Number(v)), 'Please enter a valid amount')
  .refine((v) => v === '' || Number(v) >= 0, 'Amount must be positive')

/** One salary band. A blank maximum means the band is open-ended ("Above"). */
export const ptSlabSchema = z
  .object({
    minSalary: amount('minimum salary'),
    maxSalary: optionalAmount,
    amount: amount('the amount to deduct'),
    month: z.string().trim().min(1, 'Please select an applicable month'),
    gender: z.enum(['Male', 'Female', 'Both'], {
      message: 'Please select a gender',
    }),
    minAge: z
      .string()
      .trim()
      .refine((v) => v === '' || Number.isFinite(Number(v)), 'Please enter a valid age')
      .refine(
        (v) => v === '' || (Number(v) > 0 && Number(v) <= 100),
        'Age must be between 1 and 100',
      ),
  })
  .refine((v) => v.maxSalary === '' || Number(v.maxSalary) >= Number(v.minSalary), {
    path: ['maxSalary'],
    message: 'Maximum salary cannot be less than the minimum',
  })

export type PtSlabFormValues = z.infer<typeof ptSlabSchema>

/** Upper bound of a band as a number — a blank maximum is open-ended. */
function upperBound(maxSalary: string): number {
  return maxSalary.trim() === '' ? Number.POSITIVE_INFINITY : Number(maxSalary)
}

/**
 * Two bands can share a salary range as long as they can never apply to the
 * same payslip — a different month or a different gender keeps them apart.
 * `Every Month` and `Both` are wildcards, so they collide with everything.
 */
function canCollide(a: PtSlabFormValues, b: PtSlabFormValues): boolean {
  const monthsCollide = a.month === '0' || b.month === '0' || a.month === b.month
  const gendersCollide =
    a.gender === 'Both' || b.gender === 'Both' || a.gender === b.gender
  return monthsCollide && gendersCollide
}

function formatRange(min: number, max: number): string {
  const from = min.toLocaleString('en-IN')
  const to = max === Number.POSITIVE_INFINITY ? 'Above' : max.toLocaleString('en-IN')
  return `${from} – ${to}`
}

/** Create/edit form for a PT rate and its salary slabs. */
export const ptRateSchema = z
  .object({
    wef: z.string().trim().min(1, 'Please select W.E.F date'),
    stateId: z.string().trim().min(1, 'Please select state'),
    detail: z.string().trim().max(200, 'Detail cannot exceed 200 characters'),
    slabs: z.array(ptSlabSchema).min(1, 'Add at least one salary slab'),
  })
  // Overlapping bands would make the deduction for a salary ambiguous, so the
  // clash is reported on both rows — whichever one the user meant to fix.
  .superRefine((values, ctx) => {
    const slabs = values.slabs
    for (let i = 0; i < slabs.length; i++) {
      for (let j = i + 1; j < slabs.length; j++) {
        if (!canCollide(slabs[i], slabs[j])) continue

        const minA = Number(slabs[i].minSalary)
        const maxA = upperBound(slabs[i].maxSalary)
        const minB = Number(slabs[j].minSalary)
        const maxB = upperBound(slabs[j].maxSalary)
        if (!(minA <= maxB && minB <= maxA)) continue

        ctx.addIssue({
          code: 'custom',
          path: ['slabs', i, 'minSalary'],
          message: `Salary range overlaps with Slab ${j + 1} (${formatRange(minB, maxB)})`,
        })
        ctx.addIssue({
          code: 'custom',
          path: ['slabs', j, 'minSalary'],
          message: `Salary range overlaps with Slab ${i + 1} (${formatRange(minA, maxA)})`,
        })
      }
    }
  })

export type PtRateFormValues = z.infer<typeof ptRateSchema>
