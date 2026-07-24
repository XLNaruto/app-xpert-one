import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

/** Distinctive "go back" pill used at the foot of the auth flow screens. */
export function AuthBackLink({
  to,
  label,
}: {
  to: '/login' | '/forgot-password'
  label: string
}) {
  return (
    <div className="mt-7 flex justify-center">
      <Link
        to={to}
        className="group inline-flex items-center gap-2 rounded-full border border-border bg-white/50 py-1.5 pl-1.5 pr-4 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:text-primary hover:shadow-md dark:border-white/15 dark:bg-white/5"
      >
        <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-primary transition-all duration-300 group-hover:-translate-x-0.5 group-hover:bg-primary group-hover:text-white">
          <ArrowLeft className="size-3.5" />
        </span>
        {label}
      </Link>
    </div>
  )
}
