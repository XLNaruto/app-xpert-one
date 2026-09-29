import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { isStaleRowError } from '@/features/office-task/common'
import { verdictSchema, type VerdictFormValues } from '../schemas'
import { useDecideProject, useDecideSop } from '../api/use-approvals'
import type { VerdictRequest } from '../types'

/** The verdict dialog: optional remarks, then approve / reject every row in it. */
export function useVerdictForm(request: VerdictRequest, onDone: () => void) {
  const decideSop = useDecideSop()
  const decideProject = useDecideProject()
  const form = useForm<VerdictFormValues>({
    resolver: zodResolver(verdictSchema(request.verdict)),
    defaultValues: { remarks: '' },
  })

  const onSubmit = form.handleSubmit(({ remarks }) => {
    const mutation = request.kind === 'sop' ? decideSop : decideProject
    mutation.mutate(
      { ids: request.rows.map((r) => r.id), verdict: request.verdict, remarks },
      {
        onSuccess: (count) => {
          toast.success(
            `${count} task${count === 1 ? '' : 's'} ${request.verdict === 'approved' ? 'approved' : 'sent back'}`,
          )
          onDone()
        },
        onError: (err) => {
          toast.error(err.message)
          // All-or-nothing: a row answered elsewhere fails the batch. The list is
          // re-read, so close and let the approver pick again.
          if (isStaleRowError(err)) onDone()
        },
      },
    )
  })

  return { form, onSubmit, isPending: decideSop.isPending || decideProject.isPending }
}
