import { clsx, type ClassValue } from 'clsx'
import { format, parseISO } from 'date-fns'
import { twMerge } from 'tailwind-merge'

/** Merge conditional class names, de-duplicating Tailwind utilities. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a number as Indian-locale currency (₹). */
export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

/** Compact number formatting (1.2K, 3.4M). */
export function formatCompact(value: number) {
  return new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(value)
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`
}

/** Format an ISO date-time as 'dd MMM yyyy' (falls back to the raw value). */
export function formatDate(value: string, pattern = 'dd MMM yyyy') {
  try {
    return format(parseISO(value), pattern)
  } catch {
    return value
  }
}

/** Simulate network latency for the in-memory mock API layer. */
export function mockDelay<T>(data: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}
