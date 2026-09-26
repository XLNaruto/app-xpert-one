/** The widest window the API reads or generates — `to` at most 30 days after `from`. */
export const SCHEDULE_MAX_DAYS = 31

/** The API's maximum `limit` on the grid. */
export const SCHEDULE_MAX_LIMIT = 200

/** Employees per page — each row is a whole month wide, so fewer than a master. */
export const SCHEDULE_PAGE_SIZE = 10

export const SCHEDULE_PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

/** Most employees one Generate may name. */
export const SCHEDULE_GENERATE_MAX_EMPLOYEES = 1000

/**
 * The shift dropdown's "no override" choice — the API's `shift_id: null`. A
 * Combobox value can't be `null`, so it travels as this sentinel.
 */
export const NORMAL_SHIFT_VALUE = 'normal'
