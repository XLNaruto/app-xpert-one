import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CompanyForm } from '../components/company-form'
import { useCompany } from '../api/use-company'
import { useCreateCompany, useUpdateCompany } from '../api/use-company-mutations'
import { companyToFormValues } from '../mappers'

/**
 * Create/edit a company record. One screen for both: pass `companyId` to edit an
 * existing record (hydrates the form + updates on submit), or omit it to create
 * a new one.
 */
export function CompanyManagePage({ companyId }: { companyId?: number }) {
  const isEdit = companyId !== undefined
  const navigate = useNavigate()

  const company = useCompany(companyId ?? Number.NaN)
  const createCompany = useCreateCompany()
  const updateCompany = useUpdateCompany(companyId ?? Number.NaN)

  const isPending = isEdit ? updateCompany.isPending : createCompany.isPending
  const goToList = () => navigate({ to: '/company' })

  const handleSubmit = (values: Parameters<typeof createCompany.mutate>[0]) => {
    const mutation = isEdit ? updateCompany : createCompany
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(isEdit ? 'Company updated' : 'Company created')
        goToList()
      },
      onError: (err) =>
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to ${isEdit ? 'update' : 'create'} company`,
        ),
    })
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Company' : 'Add New Company'}
        description={isEdit ? 'Update this company record' : 'Create a new company record'}
        actions={
          <Button variant="outline" onClick={goToList}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {isEdit && company.isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : isEdit && (company.isError || !company.data) ? (
            <p className="text-sm text-destructive">
              {company.error instanceof Error
                ? company.error.message
                : "Couldn't load this company."}
            </p>
          ) : (
            <CompanyForm
              defaultValues={
                isEdit && company.data ? companyToFormValues(company.data) : undefined
              }
              isPending={isPending}
              submitLabel={isEdit ? 'Save Changes' : 'Create Company'}
              onCancel={goToList}
              onSubmit={handleSubmit}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
