import { Avatar } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Up to `max` avatars, then "+N" — hovering lists everyone. */
export function PeopleChips({ names, max = 3 }: { names: string[]; max?: number }) {
  if (names.length === 0) return <span className="text-muted-foreground">Nobody</span>
  const shown = names.slice(0, max)
  const extra = names.length - shown.length

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center -space-x-2">
          {shown.map((name) => (
            <Avatar key={name} name={name} className="size-7 text-[10px] ring-2 ring-background" />
          ))}
          {extra > 0 && (
            <span className="grid size-7 place-items-center rounded-full bg-muted text-[10px] font-semibold ring-2 ring-background">
              +{extra}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{names.join(', ')}</TooltipContent>
    </Tooltip>
  )
}
