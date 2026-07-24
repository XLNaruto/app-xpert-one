import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Building2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table'
import { useCompanies } from '../api/use-companies'
import { useDeleteCompany } from '../api/use-company-mutations'
import { companyColumns } from '../components/company-columns'
import type { Company } from '../types'

/** Company master — the list screen with view/edit/delete row actions. */
export function CompanyListPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useCompanies()
  const deleteCompany = useDeleteCompany()
  const [pendingDelete, setPendingDelete] = useState<Company | null>(null)

  const columns = useMemo(
    () =>
      companyColumns({
        onView: (company) =>
          navigate({ to: '/company/$companyId', params: { companyId: String(company.id) } }),
        onEdit: (company) =>
          navigate({
            to: '/company/$companyId/edit',
            params: { companyId: String(company.id) },
          }),
        onDelete: (company) => setPendingDelete(company),
      }),
    [navigate],
  )

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteCompany.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Company deleted')
        setPendingDelete(null)
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to delete company'),
    })
  }

  return (
    <div>
      <PageHeader
        title="Company"
        description="Manage your company master records."
        actions={
          <Button onClick={() => navigate({ to: '/company/new' })}>
            <Plus className="size-4" />
            Add New Company
          </Button>
        }
      />

      {isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error instanceof Error ? error.message : "Couldn't load companies."}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          isLoading={isLoading}
          searchColumn="companyName"
          searchPlaceholder="Search companies…"
          itemName="companies"
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={
            <EmptyState
              icon={Building2}
              title="No companies yet"
              description="Create your first company to get started."
              action={
                <Button onClick={() => navigate({ to: '/company/new' })}>
                  <Plus className="size-4" />
                  Add New Company
                </Button>
              }
            />
          }
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        variant="destructive"
        icon={Building2}
        title="Delete company?"
        description={
          pendingDelete
            ? `"${pendingDelete.companyName}" will be permanently removed.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={deleteCompany.isPending}
        keepOpenOnConfirm
        onConfirm={confirmDelete}
      />
    </div>
  )
}
