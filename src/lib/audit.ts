import { useAuthStore } from '@/stores/auth-store'
import type { AuditFields } from '@/types/audit'

/** The signed-in user's name — stamped on the audit columns. */
export function currentUserName(): string {
  return useAuthStore.getState().user?.name ?? 'System'
}

/** Audit fields for a freshly created record. */
export function createdStamp(): AuditFields {
  return {
    createdBy: currentUserName(),
    createdAt: new Date().toISOString(),
    updatedBy: null,
    updatedAt: null,
  }
}

/** Audit fields to merge onto a record being edited. */
export function updatedStamp(): Pick<AuditFields, 'updatedBy' | 'updatedAt'> {
  return { updatedBy: currentUserName(), updatedAt: new Date().toISOString() }
}
