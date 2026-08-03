/**
 * Offset pagination — the one shape every list travels in.
 *
 * The API pages with `?limit=&offset=` and answers `{ items, total }`, so the
 * whole stack speaks that language: `fetch<Things>(params)` takes `PageParams`,
 * the query key carries them, and `<DataTable serverPagination>` reports page
 * changes back as `{ limit, offset }`. Masters still on an in-memory mock use
 * `paginate()` to behave identically until their endpoint lands.
 */

/**
 * Rows per page when a screen doesn't say otherwise — the option every list's
 * page-size selector opens on. Keep it in the `pageSizeOptions` a page offers,
 * or the selector shows a size the user can't pick again.
 */
export const DEFAULT_PAGE_SIZE = 5

/** Sort direction — the API's `sort_by`. */
export type SortDir = 'asc' | 'desc'

export interface PageParams {
  /** Rows to fetch. Negative means "no limit" — see `ALL_ROWS`. */
  limit: number
  /** Rows to skip before the page starts. */
  offset: number
  /** Free-text filter applied server-side, so it spans every page. */
  search?: string
  /**
   * Column to order by, named the way the endpoint names it (`effective_date`,
   * `office_name`, …). Sorting is server-side, so it spans every page — which is
   * why the sortable list columns carry the API's field name as their column id.
   */
  sort?: string
  /** Direction for `sort`. */
  sortBy?: SortDir
}

export interface Paginated<T> {
  items: T[]
  /** Rows matching the query across all pages — drives the pager. */
  total: number
}

/**
 * "Every row" — for dropdowns and history panels that need the whole master
 * rather than a page of it.
 */
export const ALL_ROWS: PageParams = { limit: -1, offset: 0 }

/** An empty result, for rendering before the first page arrives. */
export const EMPTY_PAGE: Paginated<never> = { items: [], total: 0 }

/**
 * Filter + slice an in-memory list the way an offset-paginated endpoint would.
 * `searchFields` are the record keys `params.search` is matched against; a
 * feature passes the same fields its search box advertises.
 */
export function paginate<T>(
  rows: T[],
  { limit, offset, search }: PageParams,
  searchFields: readonly (keyof T)[] = [],
): Paginated<T> {
  const term = search?.trim().toLowerCase()

  const matched =
    term && searchFields.length
      ? rows.filter((row) =>
          searchFields.some((field) =>
            String(row[field] ?? '')
              .toLowerCase()
              .includes(term),
          ),
        )
      : rows

  return {
    items: limit < 0 ? matched.slice(offset) : matched.slice(offset, offset + limit),
    total: matched.length,
  }
}
