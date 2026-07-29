import { createFileRoute } from '@tanstack/react-router'
import { DocumentListPage } from '@/features/master/document'

export const Route = createFileRoute('/_authenticated/master/document/')({
  component: DocumentListPage,
})
