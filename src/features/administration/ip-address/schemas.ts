import { z } from 'zod'

/** Which list an entry sits on. */
export const ipAddressTypeSchema = z.enum(['ALLOWED', 'BLOCKED'])

export type IpAddressType = z.infer<typeof ipAddressTypeSchema>

/** Which networks may reach the panel at all. */
export const ipAccessModeSchema = z.enum(['PUBLIC', 'RESTRICTED'])

export type IpAccessMode = z.infer<typeof ipAccessModeSchema>

/** `0`–`255`, no leading zeros — one octet of a dotted-quad address. */
const OCTET = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)'
const IPV4 = `${OCTET}(\\.${OCTET}){3}`
/**
 * IPv6 in any of its written forms — full, `::`-compressed, or with a trailing
 * dotted-quad. Deliberately shape-only: the server is the authority on what it
 * will store, and this just stops obvious typos before the round trip.
 */
const IPV6 =
  '(' +
  `([\\da-fA-F]{1,4}:){7}[\\da-fA-F]{1,4}|` +
  `([\\da-fA-F]{1,4}:){1,7}:|` +
  `([\\da-fA-F]{1,4}:){1,6}:[\\da-fA-F]{1,4}|` +
  `([\\da-fA-F]{1,4}:){1,5}(:[\\da-fA-F]{1,4}){1,2}|` +
  `([\\da-fA-F]{1,4}:){1,4}(:[\\da-fA-F]{1,4}){1,3}|` +
  `([\\da-fA-F]{1,4}:){1,3}(:[\\da-fA-F]{1,4}){1,4}|` +
  `([\\da-fA-F]{1,4}:){1,2}(:[\\da-fA-F]{1,4}){1,5}|` +
  `[\\da-fA-F]{1,4}:(:[\\da-fA-F]{1,4}){1,6}|` +
  `:((:[\\da-fA-F]{1,4}){1,7}|:)|` +
  `::(ffff(:0{1,4})?:)?${IPV4}|` +
  `([\\da-fA-F]{1,4}:){1,4}:${IPV4}` +
  ')'

/** A single host, or a host with a CIDR prefix (`/0`–`/32` v4, `/0`–`/128` v6). */
const IPV4_ENTRY = new RegExp(`^${IPV4}(/(3[0-2]|[12]?\\d))?$`)
const IPV6_ENTRY = new RegExp(`^${IPV6}(/(12[0-8]|1[01]\\d|[1-9]?\\d))?$`)

/** True for one host or one CIDR range, in either address family. */
export function isIpEntry(value: string): boolean {
  return IPV4_ENTRY.test(value) || IPV6_ENTRY.test(value)
}

/**
 * Create/edit form for one IP entry.
 *
 * The address is validated here only to catch typos early — a range that is
 * syntactically fine but already on the same list still comes back 409, and that
 * message is what the form shows.
 */
export const ipAddressSchema = z.object({
  ipAddresses: z
    .string()
    .trim()
    .min(1, 'Please enter an IP address')
    .max(49, 'Cannot exceed 49 characters')
    .refine(isIpEntry, 'Enter a valid IP address or CIDR range (e.g. 10.0.0.0/8)'),
  type: ipAddressTypeSchema,
})

export type IpAddressFormValues = z.infer<typeof ipAddressSchema>

/**
 * One entry as the API returns it.
 *
 * List rows carry the full audit trail, while `POST /user/ip-addresses` and
 * `GET/PATCH /user/ip-addresses/:id` answer with the record's own columns only —
 * hence the optional audit fields, which the mapper reads as an empty trail.
 */
export const ipAddressResponseSchema = z.object({
  id: z.number(),
  company_id: z.number(),
  ip_addresses: z.string(),
  type: ipAddressTypeSchema,
  created_at: z.string().nullish(),
  created_by_name: z.string().nullish(),
  updated_at: z.string().nullish(),
  updated_by_name: z.string().nullish(),
})

export type IpAddressResponse = z.infer<typeof ipAddressResponseSchema>

/** `GET /user/ip-addresses` — an offset-paginated page of entries. */
export const ipAddressesResponseSchema = z.object({
  items: z.array(ipAddressResponseSchema),
  total: z.number(),
})

/**
 * `GET/PUT /user/ip-addresses/mode` — the company's mode plus how many entries
 * each list holds. The counts ride along because the mode alone is misleading: a
 * `PUBLIC` company with a full allow list is enforcing nothing.
 */
export const ipAccessModeResponseSchema = z.object({
  company_id: z.number(),
  ip_access_mode: ipAccessModeSchema,
  allowed_count: z.number(),
  blocked_count: z.number(),
})

export type IpAccessModeResponse = z.infer<typeof ipAccessModeResponseSchema>

/**
 * The create request body. The endpoint rejects unknown keys
 * (`additionalProperties: false`), so this is exactly what may be sent.
 */
export interface IpAddressPayload {
  company_id: number
  ip_addresses: string
  type: IpAddressType
}

/** The update body — an entry can't move between companies. */
export type IpAddressUpdatePayload = Omit<IpAddressPayload, 'company_id'>

/** The mode write — the company and the mode it should be switched to. */
export interface IpAccessModePayload {
  company_id: number
  ip_access_mode: IpAccessMode
}
