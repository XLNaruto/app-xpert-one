import {
  ArrowLeft,
  Building2,
  CalendarDays,
  FileText,
  Hash,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Smartphone,
} from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { DetailItem } from '@/components/common/detail-item'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import { decryptId } from '@/lib/crypto'
import { Forbidden } from '@/features/error'
import { PERMISSIONS, useResourceAccess } from '@/features/permissions'
import { CompanyLogo } from '../components/company-logo'
import { useCompanyDetail } from '../hooks/use-company-detail'

/**
 * Read-only view of a single company record. The record id arrives encrypted in
 * the `?data=` search param.
 */
export function CompanyDetailPage({ data }: { data?: string }) {
  const {
    company,
    isLoading,
    isError,
    error,
    isForbidden,
    forbiddenMessage,
    goToList,
    goToEdit,
  } = useCompanyDetail(decryptId(data))

  // The Edit button is the only write this screen offers.
  const { canUpdate } = useResourceAccess(PERMISSIONS.companies)

  // Reading this record was refused — show the 403 screen with the server's
  // reason instead of an inline error line.
  if (isForbidden) {
    return <Forbidden description={forbiddenMessage} />
  }

  return (
    <div>
      <PageHeader
        title="Company Detail"
        description="Company information at a glance"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={goToList}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            {canUpdate && company && (
              <Button onClick={goToEdit}>
                <Pencil className="size-4" />
                Edit
              </Button>
            )}
          </div>
        }
      />

      {isLoading ? (
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : isError || !company ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : "Couldn't load this company."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="grid grid-cols-1 gap-x-6 gap-y-5 pt-6 sm:grid-cols-2">
            <FormSection icon={Building2} title="Company Information" className="mt-0" />
            {/* The logo is a picture, not a field — it leads the section rather
                than sitting in a `DetailItem` as a storage path. */}
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Logo</p>
              <CompanyLogo logo={company.logo} />
            </div>
            <DetailItem
              icon={Building2}
              label="Company Name"
              value={company.companyName}
            />
            <DetailItem icon={Hash} label="Company Code" value={company.companyCode} />
            <DetailItem
              icon={CalendarDays}
              label="Establish Year"
              value={company.establishYear}
            />
            <DetailItem
              icon={FileText}
              label="Registration Number"
              value={company.registrationNumber}
            />
            <DetailItem icon={FileText} label="PAN Number" value={company.panNumber} />
            <DetailItem icon={FileText} label="GST Number" value={company.gstNumber} />

            <FormSection icon={MapPin} title="Address Details" />
            <DetailItem
              icon={MapPin}
              label="Address"
              value={[company.addressLine1, company.addressLine2, company.addressLine3]
                .filter(Boolean)
                .join(', ')}
              className="sm:col-span-2"
            />
            <DetailItem icon={MapPin} label="State" value={company.stateName} />
            <DetailItem icon={MapPin} label="District" value={company.districtName} />
            <DetailItem icon={MapPin} label="City" value={company.city} />
            <DetailItem icon={MapPin} label="Pin Code" value={company.pinCode} />

            <FormSection icon={Phone} title="Contact Details" />
            <DetailItem icon={Phone} label="Phone" value={company.phone} />
            <DetailItem
              icon={Smartphone}
              label="Primary Mobile Number"
              value={company.mobile1}
            />
            <DetailItem
              icon={Smartphone}
              label="Secondary Mobile Number"
              value={company.mobile2}
            />
            <DetailItem icon={Mail} label="Email" value={company.email} />
            <DetailItem
              icon={CalendarDays}
              label="Created On"
              value={formatDate(company.createdAt)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
