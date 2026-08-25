import { AlertCircle, Loader2, UsersRound } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/empty-state'
import { useMediaResolver } from '@/hooks/use-media-url'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { PEOPLE_SEGMENTS, PERSON_KIND_LABEL } from '../constants'
import { personLabel, personSubtitle } from '../lib/talk-monitoring-mappers'
import { MonitoringSearchInput } from './monitoring-search-input'
import { MonitoringSegmentedTabs } from './monitoring-segmented-tabs'
import type { useTalkMonitoring } from '../hooks/use-talk-monitoring'
import type { MonitoringPerson } from '../types'

/**
 * The FIRST sidebar — everyone of the account who holds a Talk identity.
 *
 * Both arms of the product are in one list, badged apart: a workforce credential
 * and a back-office login. What this enumerates is Talk identities, not the
 * employee master — somebody without a credential has no conversations to
 * monitor and isn't here, while an admin user has plenty and is.
 */
export function MonitoringPeoplePane({
  monitoring,
}: {
  monitoring: ReturnType<typeof useTalkMonitoring>
}) {
  const {
    peopleQuery,
    people,
    peopleTruncated,
    personSearch,
    setPersonSearch,
    segment,
    setSegment,
    segmentCounts,
    selectedPerson,
    selectPerson,
  } = monitoring

  const resolveMedia = useMediaResolver()

  return (
    // Full width while it's the only pane; a fixed rail once all three show.
    <aside className="flex h-full w-full min-w-0 flex-col border-r bg-card xl:w-80">
      <div className="space-y-3 border-b p-3">
        <MonitoringSearchInput
          value={personSearch}
          onChange={setPersonSearch}
          placeholder="Search people..."
        />
        <MonitoringSegmentedTabs
          options={PEOPLE_SEGMENTS.map(({ value, label }) => ({
            value,
            label,
            // The counts describe the whole directory, not the loaded window —
            // the pane holds all of it, which is the reason it's loaded in full.
            count: peopleQuery.isSuccess ? segmentCounts[value] : undefined,
          }))}
          value={segment}
          onChange={setSegment}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {peopleQuery.isPending ? (
          <PersonRowSkeletons />
        ) : peopleQuery.isError ? (
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load people"
            description={getApiErrorMessage(
              peopleQuery.error,
              'Something went wrong while reading the Talk directory.',
            )}
          />
        ) : people.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="No one to show"
            description={
              personSearch.trim()
                ? // The endpoint matches the NAME alone — saying "or login"
                  // would send someone hunting with an address that can't match.
                  'No Talk identity matches that name.'
                : 'Nobody in this segment holds a Talk identity yet.'
            }
          />
        ) : (
          <ul>
            {people.map((person) => (
              <PersonRow
                key={person.talkUserId}
                person={person}
                photoUrl={resolveMedia(person.photo)}
                selected={person.talkUserId === selectedPerson?.talkUserId}
                onSelect={() => selectPerson(person)}
              />
            ))}
          </ul>
        )}

        {peopleTruncated && (
          <p className="border-t px-4 py-3 text-xs text-muted-foreground">
            Showing the first {people.length} identities — narrow the search to
            reach the rest.
          </p>
        )}

        {/*
          The search is the server's now, so a term in flight is a request in
          flight. `keepPreviousData` holds the last matches on screen meanwhile,
          which would otherwise look like a search that found nothing new.
        */}
        {peopleQuery.isFetching && !peopleQuery.isPending && (
          <p className="flex items-center justify-center gap-2 border-t py-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Searching…
          </p>
        )}
      </div>
    </aside>
  )
}

function PersonRow({
  person,
  photoUrl,
  selected,
  onSelect,
}: {
  person: MonitoringPerson
  photoUrl: string
  selected: boolean
  onSelect: () => void
}) {
  const subtitle = personSubtitle(person)
  const suspended = person.status !== 'active'

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected}
        className={cn(
          'flex w-full items-center gap-3 border-b px-3 py-2.5 text-left transition-colors',
          selected
            ? 'border-l-2 border-l-primary bg-primary/10'
            : 'hover:bg-muted/60',
        )}
      >
        <Avatar
          name={personLabel(person)}
          src={photoUrl || undefined}
          className={cn('size-10', suspended && 'opacity-60 grayscale')}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                'truncate text-sm font-semibold',
                // A person whose master record is gone reads as a placeholder,
                // not as somebody's name.
                person.name ? 'text-foreground' : 'italic text-muted-foreground',
              )}
            >
              {personLabel(person)}
            </span>
            {suspended && (
              <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                Suspended
              </Badge>
            )}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {/* A back-office identity has no posting, so its login is the more
                useful subtitle anyway. */}
            {subtitle || person.email}
          </span>
        </span>
        <Badge
          variant={person.kind === 'admin' ? 'default' : 'secondary'}
          className="shrink-0 text-[10px]"
        >
          {PERSON_KIND_LABEL[person.kind]}
        </Badge>
      </button>
    </li>
  )
}

function PersonRowSkeletons() {
  return (
    <ul className="p-3">
      {Array.from({ length: 8 }).map((_, index) => (
        <li key={index} className="flex items-center gap-3 py-2.5">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </li>
      ))}
    </ul>
  )
}
