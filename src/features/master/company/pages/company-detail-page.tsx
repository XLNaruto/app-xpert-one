import { useNavigate } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
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
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { FormSection } from '@/components/common/form-section'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCompany } from '../api/use-company'

/** Read-only view of a single company record. */
export function CompanyDetailPage({ companyId }: { companyId: number }) {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useCompany(companyId)

  return (
    <div>
      <PageHeader
        title="Company Detail"
        description="Company information at a glance"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate({ to: '/company' })}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            {data && (
              <Button
                onClick={() =>
                  navigate({
                    to: '/company/$companyId/edit',
                    params: { companyId: String(data.id) },
                  })
                }
              >
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
      ) : isError || !data ? (
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
            <Detail icon={Building2} label="Company Name" value={data.companyName} />
            <Detail icon={Hash} label="Company Code" value={data.companyCode} />
            <Detail icon={CalendarDays} label="Establish Year" value={data.establishYear} />
            <Detail icon={FileText} label="Registration Number" value={data.registrationNumber} />
            <Detail icon={FileText} label="PAN Number" value={data.panNumber} />
            <Detail icon={FileText} label="GST Number" value={data.gstNumber} />

            <FormSection icon={MapPin} title="Address Details" />
            <Detail
              icon={MapPin}
              label="Address"
              value={[data.addressLine1, data.addressLine2, data.addressLine3]
                .filter(Boolean)
                .join(', ')}
              className="sm:col-span-2"
            />
            <Detail icon={MapPin} label="State" value={data.state} />
            <Detail icon={MapPin} label="City" value={data.city} />
            <Detail icon={MapPin} label="Pin Code" value={data.pinCode} />

            <FormSection icon={Phone} title="Contact Details" />
            <Detail icon={Phone} label="Phone" value={data.phone} />
            <Detail icon={Smartphone} label="Mobile Number 1" value={data.mobile1} />
            <Detail icon={Smartphone} label="Mobile Number 2" value={data.mobile2} />
            <Detail icon={Mail} label="Email" value={data.email} />
            <Detail
              icon={CalendarDays}
              label="Created On"
              value={formatDate(data.createdAt)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/** Format an ISO date-time as 'dd MMM yyyy' (falls back to the raw value). */
function formatDate(value: string) {
  try {
    return format(parseISO(value), 'dd MMM yyyy')
  } catch {
    return value
  }
}

/** A labelled read-only detail row with a tinted icon. */
function Detail({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: LucideIcon
  label: string
  value: string | null
  className?: string
}) {
  return (
    <div className={className}>
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-foreground">
        {value || 'N/A'}
      </p>
    </div>
  )
}
