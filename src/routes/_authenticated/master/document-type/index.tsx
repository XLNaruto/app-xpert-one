import { createFileRoute } from '@tanstack/react-router'
import { DocumentTypeListPage } from '@/features/master/document-type'

export const Route = createFileRoute('/_authenticated/master/document-type/')({
  component: DocumentTypeListPage,
})
