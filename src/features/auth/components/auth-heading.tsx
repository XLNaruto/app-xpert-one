import type { LucideIcon } from 'lucide-react'

/** Shared lock/badge + title + subtitle header used across the auth screens. */
export function AuthHeading({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
}) {
  return (
    <>
      <div className="mx-auto grid size-16 place-items-center rounded-full border border-primary/20 bg-primary/10">
        <Icon className="size-7 text-primary" />
      </div>
      <h1 className="mt-5 text-center font-heading text-3xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-1.5 text-center text-sm text-muted-foreground">
        {subtitle}
      </p>
    </>
  )
}
