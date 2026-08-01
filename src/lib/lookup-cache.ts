/**
 * How long a geography lookup stays fresh.
 *
 * States and districts are maintained by the super admin and effectively never
 * change during a session, but list screens need them to turn a `state_id` /
 * `district_id` into a name. Reading them through the query cache with this
 * stale time means that resolution costs one request per session rather than one
 * per page load — see `ensureStates` / `ensureDistricts`.
 */
export const LOOKUP_STALE_TIME = 60 * 60_000
