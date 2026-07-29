import { useWatch, type Control } from 'react-hook-form'
import { Calculator } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { WAGE_DAYS_PER_MONTH } from '../constants'
import type { DesignationFormValues } from '../schemas'

interface CalculationFormulaStripProps {
  control: Control<DesignationFormValues>
}

interface FormulaCard {
  key: string
  badge: string
  title: string
  formula: string
  badgeTone: string
}

/**
 * Read-only summary of how each applicable act's amount will be computed for
 * this designation — one card per act that is switched on, worded from the
 * settings actually chosen, so the effect of the toggles and the act settings is
 * visible without leaving the form.
 */
export function CalculationFormulaStrip({ control }: CalculationFormulaStripProps) {
  const values = useWatch({ control })

  const cards: FormulaCard[] = []

  if (values.pfActApplicable) {
    cards.push({
      key: 'pf',
      badge: 'PF',
      title: 'PF Amount',
      formula: pfFormula(values.pfDeductionType, values.pfDeductionValue),
      badgeTone: 'bg-primary/10 text-primary',
    })
  }

  if (values.esicActApplicable) {
    cards.push({
      key: 'esic',
      badge: 'ESI',
      title: 'ESIC Amount',
      formula: `${values.esicDeductionBasis || 'ESI Wages'} × Employee ESIC Rate ÷ 100`,
      badgeTone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    })
  }

  if (values.ptActApplicable) {
    cards.push({
      key: 'pt',
      badge: 'PT',
      title: 'PT Amount',
      formula:
        values.ptActType === 'Manual'
          ? `${amountOr(values.ptAmount)} per month`
          : 'Per the salary slab in the PT rate setting',
      badgeTone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    })
  }

  if (values.lwfActApplicable) {
    cards.push({
      key: 'lwf',
      badge: 'LWF',
      title: 'LWF Amount',
      formula:
        values.lwfActType === 'Manual'
          ? `${amountOr(values.lwfAmount)} per contribution period`
          : 'Fixed amount per the LWF rate setting for the state and month',
      badgeTone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    })
  }

  if (values.overtimeApplicable) {
    cards.push({
      key: 'ot',
      badge: 'OT',
      title: 'OT Amount',
      formula:
        values.overtimeCalculationType === 'Manual'
          ? `OT Hours × ${amountOr(values.overtimeRatePerHour)} per hour`
          : `OT Hours × (Basic Pay ÷ ${WAGE_DAYS_PER_MONTH} ÷ 8) × 2`,
      badgeTone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    })
  }

  if (cards.length === 0) return null

  return (
    <div className="col-span-full">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Calculator className="size-3.5" />
        Calculation Formulas
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-muted-foreground">
          {cards.length} {cards.length === 1 ? 'rule' : 'rules'}
        </span>
      </p>
      <div className="mt-2.5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.key}
            className="rounded-lg border border-border bg-muted/30 px-3.5 py-3"
          >
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${card.badgeTone}`}
              >
                {card.badge}
              </span>
              {card.title}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">{card.formula}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/** How the PF share resolves — by percentage, by flat amount, or by the rate setting. */
function pfFormula(deductionType: string | undefined, value: string | undefined): string {
  if (deductionType === 'Percentage') {
    return `EPF Wages × ${value || 'Employee PF Rate'} ÷ 100`
  }
  if (deductionType === 'Fixed') return `${amountOr(value)} per month`
  return 'Per the employee PF rate in the PF rate setting'
}

/** A hand-entered amount, or a placeholder while the field is still blank. */
function amountOr(amount: string | undefined): string {
  if (!amount) return 'the amount entered'
  return formatCurrency(Number(amount))
}
