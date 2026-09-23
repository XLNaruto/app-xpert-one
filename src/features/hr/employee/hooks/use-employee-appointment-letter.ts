import { createElement, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { downloadDocument, printDocument } from '@/lib/pdf/render-document'
import { getApiErrorMessage, isForbiddenError } from '@/lib/api-error'
import { useCompanyStore } from '@/stores/company-store'
import { APPOINTMENT_VARIANTS, type AppointmentVariant } from '../constants'
import { useEmployee } from '../api/use-employees'
import { useEmployeeTransfers } from '../api/use-employee-steps'
import { AppointmentOrder } from '../components/appointment-order'
import {
  appointmentLetterFilename,
  buildAppointmentLetterFields,
  type LetterLang,
} from '../lib/appointment-letter-fields'

const MIN_ZOOM = 0.35
const MAX_ZOOM = 1.4
const ZOOM_STEP = 0.12

/**
 * The appointment-letter screen: the employee it's for, the letter's field set,
 * and the toolbar — variant, language, zoom, print and download.
 *
 * Two reads: the employee record (name, address, mobile, joining date) and the
 * transfer register, because the record's `service` names its designation and
 * branch only by id while the register carries the names the letter prints.
 */
export function useEmployeeAppointmentLetter(employeeId: number | undefined) {
  const navigate = useNavigate()
  const id = employeeId ?? Number.NaN

  const detail = useEmployee(id)
  const transfers = useEmployeeTransfers(id)
  const companyName = useCompanyStore((s) => s.selectedCompanyName)

  const [lang, setLang] = useState<LetterLang>('en')
  const [variant, setVariant] = useState<AppointmentVariant>('appointment')
  const [zoom, setZoom] = useState(0.75)
  const [busy, setBusy] = useState<'download' | 'print' | null>(null)

  // The open posting, or the newest one on someone who has left.
  const posting =
    transfers.data?.find((transfer) => transfer.isCurrent) ?? transfers.data?.[0] ?? null

  const fields = useMemo(
    () => buildAppointmentLetterFields(detail.data, posting, companyName),
    [detail.data, posting, companyName],
  )

  const isRenewal = variant === 'renewal'
  const docLabel = isRenewal ? 'Re-appointment Order' : 'Appointment Letter'
  const letter = () => createElement(AppointmentOrder, { fields, lang, variant })

  const download = async () => {
    setBusy('download')
    toast.loading(`Generating ${docLabel.toLowerCase()}…`, { id: 'appointment-pdf' })
    try {
      await downloadDocument(letter(), appointmentLetterFilename(fields.fullName, isRenewal))
      toast.success(`${docLabel} downloaded.`, { id: 'appointment-pdf' })
    } catch {
      toast.error('Could not generate the PDF. Please try again.', { id: 'appointment-pdf' })
    } finally {
      setBusy(null)
    }
  }

  const print = async () => {
    setBusy('print')
    try {
      await printDocument(letter(), docLabel)
    } catch {
      toast.error('Could not open the print dialog.')
    } finally {
      setBusy(null)
    }
  }

  const isForbidden = isForbiddenError(detail.error)

  return {
    employee: detail.data,
    isLoading: detail.isLoading,
    isError: detail.isError,
    isForbidden,
    forbiddenMessage: isForbidden ? getApiErrorMessage(detail.error) : undefined,
    fields,

    lang,
    setLang,
    variant,
    setVariant,
    variantHint: APPOINTMENT_VARIANTS.find((v) => v.value === variant)?.hint ?? '',
    docLabel,

    zoom,
    zoomOut: () => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2))),
    zoomIn: () => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2))),
    /** Back to actual size — the sheet as it prints. */
    zoomReset: () => setZoom(1),

    busy,
    download,
    print,

    goBack: () => void navigate({ to: '/hr/employee' }),
  }
}
