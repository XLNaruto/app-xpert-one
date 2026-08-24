import { createContext, useCallback, useState } from 'react'

export interface SectionSignal {
  open: boolean
  token: number
}

export const SectionSignalContext = createContext<SectionSignal | null>(null)

export function useCollapsibleSectionGroup() {
  const [signal, setSignal] = useState<SectionSignal | null>(null)

  const setAll = useCallback((open: boolean) =>
    setSignal((current) => ({ open, token: (current?.token ?? 0) + 1 })),
  [])

  return {
    signal,
    expandAll: useCallback(() => setAll(true), [setAll]),
    collapseAll: useCallback(() => setAll(false), [setAll]),
    allOpen: signal === null ? null : signal.open,
  }
}
