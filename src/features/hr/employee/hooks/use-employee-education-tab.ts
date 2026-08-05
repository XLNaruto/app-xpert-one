import { useMemo, useRef, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import {
  EDUCATION_ROW_KEYS,
  employeeEducationStepSchema,
  employeeEducationStepWithExperienceSchema,
  EXPERIENCE_ROW_KEYS,
  type EmployeeEducationFormValues,
  type EmployeeEducationStepFormValues,
  type EmployeeExperienceFormValues,
} from '../schemas'
import {
  EMPTY_EMPLOYEE_EDUCATION_FORM,
  EMPTY_EMPLOYEE_EXPERIENCE_FORM,
} from '../constants'
import { useEmployeeEducations, useEmployeeExperiences } from '../api/use-employee-steps'
import {
  useCreateEmployeeEducation,
  useCreateEmployeeExperience,
  useDeleteEmployeeEducation,
  useDeleteEmployeeExperience,
  useUpdateEmployeeEducation,
  useUpdateEmployeeExperience,
} from '../api/use-employee-step-mutations'
import {
  educationToFormValues,
  experienceToFormValues,
} from '../lib/employee-step-mappers'
import { isBlankRow, saveRows } from '../lib/save-rows'
import { useRowSeed } from './use-row-seed'

/**
 * Step 5 — qualifications and prior employment: two card lists, one Save.
 *
 * They're separate resources (`/educations` and `/experiences`) with separate
 * row-at-a-time endpoints, so the save reconciles each list independently — but
 * they're captured at the same moment, so they share one form and one submit.
 *
 * **The fresher switch** is a UI flag, not a stored field. Turning it on hides the
 * experience list, skips its validation entirely (a second resolver rather than a
 * conditional refine, so the rules genuinely don't run) and deletes any experience
 * rows already on the record — because "this person is a fresher" and "these three
 * previous jobs" can't both be true. It defaults on when the employee has no
 * experience rows, which is what the empty list already means.
 */
export function useEmployeeEducationTab({
  employeeId,
  onSaved,
  onClose,
}: {
  employeeId: number
  onSaved: () => void
  onClose: () => void
}) {
  const educationList = useEmployeeEducations(employeeId)
  const experienceList = useEmployeeExperiences(employeeId)

  const createEducation = useCreateEmployeeEducation(employeeId)
  const updateEducation = useUpdateEmployeeEducation(employeeId)
  const deleteEducation = useDeleteEmployeeEducation(employeeId)
  const createExperience = useCreateEmployeeExperience(employeeId)
  const updateExperience = useUpdateEmployeeExperience(employeeId)
  const deleteExperience = useDeleteEmployeeExperience(employeeId)

  const form = useForm<EmployeeEducationStepFormValues>({
    /*
     * The resolver picks its schema from the values it's handed: a fresher is
     * validated against the schema whose experience rules don't exist, rather than
     * against one schema whose rules branch internally. Same effect, but "the rules
     * don't run" is stated once instead of at every rule.
     */
    resolver: (values, context, options) => {
      const schema = (values as EmployeeEducationStepFormValues).isFresher
        ? employeeEducationStepSchema
        : employeeEducationStepWithExperienceSchema
      return zodResolver(schema)(values, context, options)
    },
    defaultValues: {
      educations: [EMPTY_EMPLOYEE_EDUCATION_FORM],
      isFresher: false,
      experiences: [EMPTY_EMPLOYEE_EXPERIENCE_FORM],
    },
  })
  const { control, handleSubmit, reset } = form

  const educations = useFieldArray({ control, name: 'educations' })
  const experiences = useFieldArray({ control, name: 'experiences' })

  const isFresher = useWatch({ control, name: 'isFresher' })

  /** Server ids removed from each list — deleted on Save, not on click. */
  const [removedEducationIds, setRemovedEducationIds] = useState<number[]>([])
  const [removedExperienceIds, setRemovedExperienceIds] = useState<number[]>([])
  const closeAfterSaveRef = useRef(false)
  const [isSaving, setIsSaving] = useState(false)

  const educationRows = educationList.data
  const experienceRows = experienceList.data

  /*
   * Both lists arrive from separate reads, so they're paired into one value before
   * seeding — the form holds them together and must be reset in one go.
   */
  const serverRows = useMemo(
    () =>
      educationRows && experienceRows
        ? { educations: educationRows, experiences: experienceRows }
        : undefined,
    [educationRows, experienceRows],
  )

  // Seed from the server, and again after each save — but never mid-save.
  useRowSeed(serverRows, isSaving, ({ educations: saved, experiences: prior }) => {
    reset({
      educations:
        saved.length > 0
          ? saved.map((row) => ({ id: row.id, ...educationToFormValues(row) }))
          : [EMPTY_EMPLOYEE_EDUCATION_FORM],
      // No experience on record is what "fresher" means — nothing else stores it.
      isFresher: prior.length === 0,
      experiences:
        prior.length > 0
          ? prior.map((row) => ({ id: row.id, ...experienceToFormValues(row) }))
          : [EMPTY_EMPLOYEE_EXPERIENCE_FORM],
    })
    setRemovedEducationIds([])
    setRemovedExperienceIds([])
  })

  const addEducation = () => educations.append({ ...EMPTY_EMPLOYEE_EDUCATION_FORM })
  const addExperience = () => experiences.append({ ...EMPTY_EMPLOYEE_EXPERIENCE_FORM })

  const removeEducation = (index: number) => {
    const row = form.getValues(`educations.${index}`)
    if (row?.id !== undefined) {
      setRemovedEducationIds((previous) => [...previous, row.id as number])
    }
    if (educations.fields.length === 1) {
      educations.update(0, { ...EMPTY_EMPLOYEE_EDUCATION_FORM })
      return
    }
    educations.remove(index)
  }

  const removeExperience = (index: number) => {
    const row = form.getValues(`experiences.${index}`)
    if (row?.id !== undefined) {
      setRemovedExperienceIds((previous) => [...previous, row.id as number])
    }
    if (experiences.fields.length === 1) {
      experiences.update(0, { ...EMPTY_EMPLOYEE_EXPERIENCE_FORM })
      return
    }
    experiences.remove(index)
  }

  const submit = handleSubmit(async (values) => {
    const shouldClose = closeAfterSaveRef.current
    closeAfterSaveRef.current = false

    const savableEducations = values.educations.filter(
      (row) => !isBlankRow(row as Record<string, unknown>, EDUCATION_ROW_KEYS),
    )

    /*
     * A fresher has no prior employment, so the rows on screen are discarded and
     * anything already saved is deleted — otherwise the record would claim both.
     */
    const savableExperiences = values.isFresher
      ? []
      : values.experiences.filter(
          (row) => !isBlankRow(row as Record<string, unknown>, EXPERIENCE_ROW_KEYS),
        )

    const experienceIdsToRemove = values.isFresher
      ? [
          ...removedExperienceIds,
          ...values.experiences
            .map((row) => row.id)
            .filter((id): id is number => id !== undefined),
        ]
      : removedExperienceIds

    setIsSaving(true)
    try {
      await saveRows<EmployeeEducationFormValues>(
        savableEducations,
        removedEducationIds,
        {
          create: (row) => createEducation.mutateAsync(row),
          update: (id, row) => updateEducation.mutateAsync({ educationId: id, values: row }),
          remove: (id) => deleteEducation.mutateAsync(id),
        },
      )
      await saveRows<EmployeeExperienceFormValues>(
        savableExperiences,
        experienceIdsToRemove,
        {
          create: (row) => createExperience.mutateAsync(row),
          update: (id, row) =>
            updateExperience.mutateAsync({ experienceId: id, values: row }),
          remove: (id) => deleteExperience.mutateAsync(id),
        },
      )
      setRemovedEducationIds([])
      setRemovedExperienceIds([])
      toast.success('Education & experience saved')
      if (shouldClose) onClose()
      else onSaved()
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save education & experience."))
    } finally {
      setIsSaving(false)
    }
  })

  const onSubmitAndClose = () => {
    closeAfterSaveRef.current = true
    void submit()
  }

  const isForbidden =
    isForbiddenError(educationList.error) || isForbiddenError(experienceList.error)

  return {
    form,
    educationFields: educations.fields,
    experienceFields: experiences.fields,
    addEducation,
    removeEducation,
    addExperience,
    removeExperience,
    isFresher,
    isLoading: educationList.isLoading || experienceList.isLoading,
    isError:
      (educationList.isError || experienceList.isError) && !isForbidden,
    error: educationList.error ?? experienceList.error,
    isForbidden,
    forbiddenMessage: isForbidden
      ? getApiErrorMessage(educationList.error ?? experienceList.error)
      : undefined,
    onSubmit: submit,
    onSubmitAndClose,
    onClose,
    isSaving,
  }
}
