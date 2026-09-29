import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { progressSchema, type ProgressFormValues } from '../schemas'
import { useAddProjectProgress } from '../api/use-my-tasks'
import { clampPercentInput } from '../lib/percent-input'
import type { MyProjectRow } from '../types'

/**
 * Stop a running project share: it asks only for the new percent (opening on
 * the last reported one), and saving records it and stops the clock together.
 */
export function useProgressForm(row: MyProjectRow | null, onDone: () => void) {
  const add = useAddProjectProgress()
  const form = useForm<ProgressFormValues>({
    resolver: zodResolver(progressSchema),
    defaultValues: { percent: '0' },
  })

  useEffect(() => {
    if (row) form.reset({ percent: String(row.latestPercent) })
  }, [row, form])

  const stopping = !!row?.runningSince
  const percent = Number(useWatch({ control: form.control, name: 'percent' })) || 0

  const onSubmit = form.handleSubmit((values) => {
    if (!row) return
    add.mutate(
      {
        id: row.id,
        note: '',
        percent: Number(values.percent),
        files: [],
        stop: stopping,
      },
      {
        onSuccess: () => {
          toast.success(stopping ? 'Progress saved · clock stopped' : 'Progress saved')
          onDone()
        },
        onError: (err) => toast.error(err.message),
      },
    )
  })

  // The box can only ever hold 0–100: anything else is trimmed as it's typed.
  const percentField = form.register('percent')
  const percentInput = {
    ...percentField,
    inputMode: 'numeric' as const,
    maxLength: 3,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      e.target.value = clampPercentInput(e.target.value)
      return percentField.onChange(e)
    },
  }

  return {
    form,
    percentInput,
    percent,
    /** Reporting less than last time is allowed, but worth a warning. */
    goingBack: !!row && percent < row.latestPercent,
    /** The clock is running, so saving stops it. */
    stopping,
    onSubmit,
    isPending: add.isPending,
  }
}
