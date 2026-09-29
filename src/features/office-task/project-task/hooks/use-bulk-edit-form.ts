import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { EMPTY_BULK_EDIT } from '../constants'
import { bulkEditSchema, type BulkEditValues } from '../schemas'
import { useBulkEditProjectTasks } from '../api/use-project-tasks'

/** The bulk bar: priority / start / deadline for every selected task. */
export function useBulkEditForm(ids: number[], onDone: () => void) {
  const bulk = useBulkEditProjectTasks()
  const form = useForm<BulkEditValues>({
    resolver: zodResolver(bulkEditSchema),
    defaultValues: EMPTY_BULK_EDIT,
  })
  const values = useWatch({ control: form.control })
  const touched = !!(values.priority || values.startDate || values.deadline)

  const onSubmit = form.handleSubmit((v) =>
    bulk.mutate(
      { ids, values: v },
      {
        onSuccess: (count) => {
          toast.success(`${count} task${count === 1 ? '' : 's'} updated`)
          form.reset(EMPTY_BULK_EDIT)
          onDone()
        },
        onError: (err) => toast.error(err.message),
      },
    ),
  )

  return { form, touched, onSubmit, isPending: bulk.isPending }
}
