// Pure helpers for projecting a recurring session template into concrete dates.
// Kept free of React and Supabase so the date math stays unit-testable.

import type { DayOfWeek, PlaySession, SessionOccurrence } from '@/lib/types/sessions'

/**
 * The club is in the Dominican Republic, which sits on UTC-4 year-round with no
 * daylight saving. Every "what day is it / has this game started" decision uses
 * this zone rather than the server's, so a Vercel box running UTC doesn't roll
 * the schedule over to tomorrow at 8pm local time.
 */
export const CLUB_TIMEZONE = 'America/Santo_Domingo'

/**
 * Cache tag for published session data. Lives here rather than in the action
 * files because a 'use server' module may only export async functions.
 */
export const SESSIONS_TAG = 'play-sessions'

/**
 * Fixed UTC offset for the club. Safe to hardcode precisely because the
 * Dominican Republic does not observe daylight saving — if that ever changes,
 * this is the single line to revisit.
 */
export const CLUB_UTC_OFFSET = '-04:00'

/** Today's date in the club's timezone, as 'YYYY-MM-DD'. */
export function clubToday(now: Date = new Date()): string {
  // 'en-CA' formats as YYYY-MM-DD, which is exactly the shape we store.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CLUB_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/**
 * An absolute instant for a wall-clock time on a given club date, e.g.
 * ('2026-08-11', '18:00:00') -> '2026-08-11T18:00:00-04:00'. Anchoring to a
 * real offset is what lets us compare a session's end against `now` without
 * the server's own timezone entering into it.
 */
export function clubInstant(dateStr: string, time: string): string {
  const hhmmss = time.length === 5 ? `${time}:00` : time
  return `${dateStr}T${hhmmss}${CLUB_UTC_OFFSET}`
}

/**
 * Date-string arithmetic done in UTC. Using UTC (rather than local) means the
 * result depends only on the input string, never on where the code runs.
 */
function toUtc(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(dateStr: string, days: number): string {
  const d = toUtc(dateStr)
  d.setUTCDate(d.getUTCDate() + days)
  return fromUtc(d)
}

/** Day of week for a 'YYYY-MM-DD' string. 0 = Sunday. */
export function dayOfWeek(dateStr: string): DayOfWeek {
  return toUtc(dateStr).getUTCDay() as DayOfWeek
}

/** The fields of a session that determine which dates it publishes. */
export type OccurrenceSource = Pick<
  PlaySession,
  | 'is_recurring'
  | 'days_of_week'
  | 'weeks_ahead'
  | 'specific_date'
  | 'blackout_dates'
  | 'capacity'
  | 'start_time'
  | 'end_time'
>

/**
 * Every date this session still runs.
 *
 * Each returned occurrence is one card on the public page: a concrete start
 * date/time and an end time on that same day. The end time doubles as the
 * card's expiration — once it passes, the occurrence stops being generated and
 * the card disappears on its own, no cleanup job involved.
 *
 * A recurring session projects `days_of_week` forward over a window of exactly
 * `weeks_ahead` weeks, so the series keeps rolling: a fresh date joins the tail
 * as each stale one drops off. A one-time session yields at most a single
 * occurrence, on `specific_date`, and then goes quiet for good.
 *
 * `takenByDate` carries live sign-up counts keyed by date; dates missing from
 * it are simply empty.
 */
export function generateOccurrences(
  session: OccurrenceSource,
  takenByDate: Record<string, number> = {},
  now: Date = new Date()
): SessionOccurrence[] {
  const today = clubToday(now)
  const nowMs = now.getTime()
  const blackout = new Set(session.blackout_dates)

  /** Null when the date is blacked out or its game has already finished. */
  const build = (date: string): SessionOccurrence | null => {
    if (blackout.has(date)) return null

    const startsAt = clubInstant(date, session.start_time)
    const endsAt = clubInstant(date, session.end_time)

    // Expired — the game has already finished. Only ever true for today.
    if (Date.parse(endsAt) <= nowMs) return null

    const taken = takenByDate[date] ?? 0
    const spotsLeft = Math.max(0, session.capacity - taken)

    return {
      date,
      dayOfWeek: dayOfWeek(date),
      startsAt,
      endsAt,
      taken,
      capacity: session.capacity,
      spotsLeft,
      isFull: spotsLeft === 0,
    }
  }

  // ── One-time: a single date, and only while it is still in the future.
  //
  // Tested against `false` rather than falsiness so that a row read before
  // migration 0026 has been applied — where the column is simply absent —
  // falls through to the recurring branch it was written as, matching the
  // column's own `default true`. Otherwise every existing session would
  // vanish from the site in the window between deploy and migration.
  if (session.is_recurring === false) {
    if (!session.specific_date || session.specific_date < today) return []
    const only = build(session.specific_date)
    return only ? [only] : []
  }

  // ── Recurring: every matching weekday inside the horizon.
  if (session.days_of_week.length === 0 || !session.weeks_ahead) return []

  const days = new Set<number>(session.days_of_week)
  // A window of N weeks spans N*7 days counting today, so the last day is
  // today + N*7 - 1. Using today + N*7 would make the window one day too long
  // and hand every weekday an extra occurrence — at weeks_ahead = 1 that meant
  // two cards, not one.
  const lastDay = addDays(today, session.weeks_ahead * 7 - 1)
  const out: SessionOccurrence[] = []

  for (let date = today; date <= lastDay; date = addDays(date, 1)) {
    if (!days.has(dayOfWeek(date))) continue
    const occurrence = build(date)
    if (occurrence) out.push(occurrence)
  }

  return out
}

// ─────────────────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────────────────

export function formatSessionDate(dateStr: string, locale: string): string {
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString(
    locale === 'en' ? 'en-US' : 'es-DO',
    { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }
  )
}

/** '18:00:00' -> '6:00 PM' (en) / '18:00' (es). */
export function formatSessionTime(time: string, locale: string): string {
  const [h, m] = time.split(':').map(Number)
  if (locale === 'en') {
    const period = h >= 12 ? 'PM' : 'AM'
    const hour12 = h % 12 === 0 ? 12 : h % 12
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatSessionTimeRange(start: string, end: string, locale: string): string {
  return `${formatSessionTime(start, locale)} – ${formatSessionTime(end, locale)}`
}

export function formatPrice(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-DO', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

/** Cover image with a graceful fallback to the first gallery image. */
export function getSessionImages(session: Pick<PlaySession, 'image_url' | 'image_urls'>): string[] {
  if (session.image_urls?.length) return session.image_urls
  return session.image_url ? [session.image_url] : []
}
