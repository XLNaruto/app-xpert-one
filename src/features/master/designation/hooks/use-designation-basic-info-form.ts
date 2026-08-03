import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  designationBasicInfoSchema,
  type DesignationBasicInfoValues,
} from '../schemas'
import { useDesignation } from '../api/use-designation'
import { useUpdateDesignationName } from '../api/use-designation-mutations'

/**
 * Owns the edit screen's Basic Info tab. `PATCH /user/designations/:id` accepts
 * the designation name and nothing else, so that's all this tab captures and all
 * it validates — the salary configuration and every act setting are
 * effective-dated and saved on the Wage Structure tab, against a month.
 *
 * The record is still read in full: the tab shows the wage structure in force
 * beside the name, read-only, so a rename doesn't happen blind.
 */
export function useDesignationBasicInfoForm(id: number) {
  const navigate = useNavigate()

  const detail = useDesignation(id)
  const updateName = useUpdateDesignationName(id)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DesignationBasicInfoValues>({
    resolver: zodResolver(designationBasicInfoSchema),
    defaultValues: { designationName: '' },
  })

  // Seed the field once the record has loaded.
  useEffect(() => {
    if (!detail.data) return
    reset({ designationName: detail.data.designationName })
  }, [detail.data, reset])

  const goToList = () => navigate({ to: '/master/designation' })

  const onSubmit = handleSubmit((values) => {
    updateName.mutate(values.designationName, {
      onSuccess: () => {
        toast.success('Designation updated')
        goToList()
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to update designation'),
    })
  })

  return {
    register,
    errors,

    /** The record being edited — the wage structure in force rides along on it. */
    designation: detail.data,

    onSubmit,
    isPending: updateName.isPending,
    isLoading: detail.isLoading,
    isError: detail.isError || (!detail.isLoading && !detail.data),
    loadError: detail.error,
    goToList,
  }
}
