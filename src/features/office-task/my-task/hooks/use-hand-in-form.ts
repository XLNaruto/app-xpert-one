import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { handInSchema, type HandInFormValues } from '../schemas'
import { useCompleteProjectWork, useCompleteSopTask } from '../api/use-my-tasks'
import type { CompleteTarget } from '../types'

/** The Complete / Submit dialog's form — rules follow the task being handed in. */
export function useHandInForm(target: CompleteTarget | null, onDone: () => void) {
  const completeSop = useCompleteSopTask()
  const completeProject = useCompleteProjectWork()

  const rules = useMemo(
    () => ({
      noteRequired: target?.kind === 'sop',
      proofRequired: !!target?.row.photoRequired,
    }),
    [target],
  )
  const needsApproval =
    target?.kind === 'sop' ? target.row.needsApproval : !!target?.row.needsVerification

  const form = useForm<HandInFormValues>({
    resolver: zodResolver(handInSchema(rules)),
    defaultValues: { note: '', proof: [] },
  })

  // Every opening starts clean.
  useEffect(() => {
    if (target) form.reset({ note: '', proof: [] })
  }, [target, form])

  const onSubmit = form.handleSubmit((values) => {
    if (!target) return
    // The picked files are uploaded by the mutation, then only their keys are sent.
    const input = { id: target.row.id, note: values.note, files: values.proof }
    const mutation = target.kind === 'sop' ? completeSop : completeProject
    mutation.mutate(input, {
      onSuccess: (status) => {
        toast.success(
          status === 'pending_approval' ? 'Submitted — waiting for approval' : 'Task completed',
        )
        onDone()
      },
      onError: (err) => toast.error(err.message),
    })
  })

  return {
    form,
    rules,
    needsApproval,
    onSubmit,
    isPending: completeSop.isPending || completeProject.isPending,
  }
}
