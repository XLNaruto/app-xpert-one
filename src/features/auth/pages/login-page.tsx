import { useState } from 'react'
import { Building2, Eye, EyeOff, Lock, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useLogin } from '../hooks/use-login'

const fieldClasses =
  'h-11 border border-border bg-white/80 pl-10 text-foreground shadow-sm backdrop-blur-sm placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-0 dark:border-white/15 dark:bg-white/5 dark:focus-visible:border-primary'

/** The two API login forms, as the segmented switch renders them. */
const ROLE_TABS = [
  { value: 'owner', label: 'Owner', icon: ShieldCheck },
  { value: 'user', label: 'User', icon: UserRound },
] as const

/**
 * Email · password sign-in. A login that answers with a challenge instead of a
 * session hands over to `/verify-otp` rather than swapping this form out.
 */
export function LoginPage() {
  const {
    register,
    errors,
    isOwner,
    setIsOwner,
    onSubmit,
    isPending,
    isError,
    error,
  } = useLogin()
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div>
      {/* Lock badge */}
      <div className="mx-auto grid size-16 place-items-center rounded-full border border-primary/20 bg-primary/10">
        <Lock className="size-7 text-primary" />
      </div>

      <h1 className="mt-5 text-center font-heading text-3xl font-bold tracking-tight text-foreground">
        Welcome Back!
      </h1>
      <p className="mt-1.5 text-center text-sm text-muted-foreground">
        Sign in to continue to XpertOne
      </p>

      <form
        onSubmit={onSubmit}
        noValidate
        autoComplete="on"
        className="mt-7 space-y-5"
      >
        {isError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error?.message}
          </p>
        )}

        {/* Which API login form to use — Owner sends `is_owner: true` and no
            company code, User sends `is_owner: false` plus the code. */}
        <div
          role="tablist"
          aria-label="Sign-in as"
          className="relative grid h-12 grid-cols-2 rounded-lg border border-border bg-white/80 p-1 shadow-sm backdrop-blur-sm dark:border-white/15 dark:bg-white/5"
        >
          {/* Sliding thumb — one element that travels between the two halves. */}
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-linear-to-r from-primary to-primary-hover shadow-sm shadow-primary/25 transition-transform duration-300 ease-out',
              !isOwner && 'translate-x-full',
            )}
          />
          {ROLE_TABS.map(({ value, label, icon: Icon }) => {
            const active = isOwner === (value === 'owner')
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setIsOwner(value === 'owner')}
                className={cn(
                  'relative z-10 inline-flex cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors duration-200',
                  active
                    ? 'text-white'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-4" strokeWidth={2.25} />
                {label}
              </button>
            )
          })}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="block text-foreground/90">
            Email
          </Label>
          <div className="group relative">
            <Mail
              strokeWidth={2.25}
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
            />
            <Input
              id="email"
              type="email"
              autoComplete="username"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Enter your email"
              className={fieldClasses}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password" className="block text-foreground/90">
            Password
          </Label>
          <div className="group relative">
            <Lock
              strokeWidth={2.25}
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
            />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              className={cn(fieldClasses, 'pr-10')}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              title={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 z-10 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:text-primary"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        {/* Company code — tenant-admin sign-in only */}
        <div className={cn('space-y-2', isOwner && 'hidden')}>
          <Label htmlFor="companyCode" className="block text-foreground/90">
            Company Code
          </Label>
          <div className="group relative">
            <Building2
              strokeWidth={2.25}
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
            />
            <Input
              id="companyCode"
              type="text"
              autoComplete="organization"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={50}
              placeholder="Enter your company code"
              className={fieldClasses}
              {...register('companyCode')}
            />
          </div>
          {errors.companyCode && (
            <p className="text-xs text-destructive">
              {errors.companyCode.message}
            </p>
          )}
        </div>

        {/* Remember */}
        <div className="flex items-center gap-2.5 text-sm">
          <Checkbox
            id="remember"
            className="border-border shadow-none"
            {...register('remember')}
          />
          <Label
            htmlFor="remember"
            className="cursor-pointer select-none font-normal text-muted-foreground"
          >
            Remember me
          </Label>
        </div>

        {/* Sign in */}
        <Button
          type="submit"
          className="h-12 w-full bg-linear-to-r from-primary to-primary-hover text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-95"
          disabled={isPending}
        >
          {isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}
