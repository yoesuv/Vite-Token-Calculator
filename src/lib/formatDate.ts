/**
 * Date utilities derived from raw API timestamps.
 *
 * The API stores `released` and `cutoff` as Firestore-style timestamps
 * (`{ _seconds, _nanoseconds }`). Firestore timestamps are absolute
 * instants — they don't carry a timezone — while the publisher enters
 * *calendar dates* ("30 June 2026 12:00 AM") in the backend's own zone
 * (the Cloud Function and its data live in `asia-southeast2`, i.e.
 * Jakarta, UTC+7). Midnight Jakarta is 17:00 UTC the previous day, so
 * formatting in UTC rolls the date back by one. We therefore render the
 * date in the publisher's zone with a fixed `en-GB` locale, so every
 * viewer sees the exact same string (e.g. "30 January 2026") regardless
 * of local timezone or browser locale.
 */

/**
 * The timezone the backend enters dates in. The catalog's Cloud Function
 * runs in region `asia-southeast2` (Jakarta, UTC+7, no DST), and its
 * date-like timestamps are created as midnight in that zone. Rendering in
 * this zone reconstructs the publisher's calendar date. It is also safe if
 * the backend later normalizes to UTC midnight: 00:00 UTC is 07:00
 * Jakarta, the same calendar day, so both conventions display identically.
 */
const PUBLISHER_TIME_ZONE = 'Asia/Jakarta'

/** Firestore timestamp shape returned by the API. */
export type ApiTimestamp = {
  _seconds: number
  _nanoseconds: number
}

/** Is this a timestamp we can actually show? */
export const isDisplayableTimestamp = (
  ts: ApiTimestamp | null | undefined,
): ts is ApiTimestamp => {
  if (ts === null || ts === undefined || typeof ts._seconds !== 'number' || !Number.isFinite(ts._seconds)) {
    return false
  }
  return Number.isFinite(new Date(ts._seconds * 1000).getTime())
}

/**
 * Format an API timestamp as a long date string (e.g. "30 January 2026").
 *
 * Always formatted in the publisher's zone (PUBLISHER_TIME_ZONE) with the
 * fixed `en-GB` locale (day-first order), so the exact same string is shown
 * to every user, everywhere — matching the calendar date the API publisher
 * entered. See the module docs for why this is not formatted in UTC.
 * Returns "—" for malformed/missing values.
 */
export const formatApiTimestamp = (ts: ApiTimestamp | null | undefined): string => {
  if (!isDisplayableTimestamp(ts)) return '—'
  return new Date(ts._seconds * 1000).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: PUBLISHER_TIME_ZONE,
  })
}
