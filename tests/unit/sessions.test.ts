import { describe, it, expect } from 'vitest'
import {
  generateOccurrences,
  clubToday,
  clubInstant,
  addDays,
  dayOfWeek,
  formatSessionTime,
} from '@/lib/sessions'
import type { DayOfWeek } from '@/lib/types/sessions'

// Base template: recurring Tue + Thu, 6-8pm, 10 players.
const base = {
  is_recurring: true,
  days_of_week: [2, 4] as DayOfWeek[],
  weeks_ahead: 2,
  specific_date: null as string | null,
  blackout_dates: [] as string[],
  capacity: 10,
  start_time: '18:00:00',
  end_time: '20:00:00',
}

/** The same game, published for one date only. */
const oneTime = {
  ...base,
  is_recurring: false,
  days_of_week: [] as DayOfWeek[],
  weeks_ahead: null,
  specific_date: '2026-08-13',
}

/** A fixed instant: Tuesday 2026-08-11, 10:00 club time (14:00 UTC). */
const TUE_MORNING = new Date('2026-08-11T14:00:00Z')

describe('date helpers', () => {
  it('adds days without drifting across month boundaries', () => {
    expect(addDays('2026-08-30', 3)).toBe('2026-09-02')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('reports day of week with Sunday as 0', () => {
    expect(dayOfWeek('2026-08-09')).toBe(0) // Sunday
    expect(dayOfWeek('2026-08-11')).toBe(2) // Tuesday
  })

  it('anchors club instants to the fixed -04:00 offset', () => {
    expect(clubInstant('2026-08-11', '18:00:00')).toBe('2026-08-11T18:00:00-04:00')
    expect(clubInstant('2026-08-11', '18:00')).toBe('2026-08-11T18:00:00-04:00')
  })

  it('resolves today in club time, not server time', () => {
    // 01:30 UTC is still the previous day at UTC-4.
    expect(clubToday(new Date('2026-08-12T01:30:00Z'))).toBe('2026-08-11')
  })
})

describe('generateOccurrences', () => {
  it('returns only the configured weekdays', () => {
    const out = generateOccurrences(base, {}, TUE_MORNING)
    expect(out.length).toBeGreaterThan(0)
    for (const o of out) {
      expect([2, 4]).toContain(o.dayOfWeek)
    }
  })

  it('spans the configured horizon and no further', () => {
    const out = generateOccurrences(base, {}, TUE_MORNING)
    const last = out[out.length - 1]
    expect(last.date <= addDays('2026-08-11', 14)).toBe(true)
  })

  it('publishes exactly weeks_ahead dates per weekday picked', () => {
    // 2 weeks x {Tue, Thu} = 4 dates. An inclusive today+14 window would let
    // Tue 2026-08-25 slip in as a fifth.
    const out = generateOccurrences(base, {}, TUE_MORNING)
    expect(out.map((o) => o.date)).toEqual([
      '2026-08-11',
      '2026-08-13',
      '2026-08-18',
      '2026-08-20',
    ])
  })

  it('publishes a single date when one week and one weekday are configured', () => {
    const out = generateOccurrences(
      { ...base, days_of_week: [2], weeks_ahead: 1 },
      {},
      TUE_MORNING
    )
    expect(out.map((o) => o.date)).toEqual(['2026-08-11'])
  })

  it('returns nothing when no days are selected', () => {
    expect(generateOccurrences({ ...base, days_of_week: [] }, {}, TUE_MORNING)).toEqual([])
  })

  it('returns nothing when a recurring session has no horizon', () => {
    expect(generateOccurrences({ ...base, weeks_ahead: null }, {}, TUE_MORNING)).toEqual([])
  })

  it('skips blackout dates', () => {
    const out = generateOccurrences(
      { ...base, blackout_dates: ['2026-08-13'] },
      {},
      TUE_MORNING
    )
    expect(out.map((o) => o.date)).not.toContain('2026-08-13')
    expect(out.map((o) => o.date)).toContain('2026-08-11')
  })

  it("keeps today's card while the game has not finished", () => {
    // 19:00 club time — the 18:00-20:00 game is underway but not over.
    const during = new Date('2026-08-11T23:00:00Z')
    const out = generateOccurrences(base, {}, during)
    expect(out[0].date).toBe('2026-08-11')
  })

  it("drops today's card once the end time passes", () => {
    // 20:30 club time, half an hour after the game ended.
    const after = new Date('2026-08-12T00:30:00Z')
    const out = generateOccurrences(base, {}, after)
    expect(out.map((o) => o.date)).not.toContain('2026-08-11')
    expect(out[0].date).toBe('2026-08-13') // next Thursday
  })

  it('exposes start and end instants for each card', () => {
    const [first] = generateOccurrences(base, {}, TUE_MORNING)
    expect(first.startsAt).toBe('2026-08-11T18:00:00-04:00')
    expect(first.endsAt).toBe('2026-08-11T20:00:00-04:00')
  })

  it('marks a date sold out once capacity is reached', () => {
    const out = generateOccurrences(base, { '2026-08-11': 10 }, TUE_MORNING)
    const target = out.find((o) => o.date === '2026-08-11')!
    expect(target.isFull).toBe(true)
    expect(target.spotsLeft).toBe(0)
  })

  it('never reports negative spots when overbooked', () => {
    const out = generateOccurrences(base, { '2026-08-11': 14 }, TUE_MORNING)
    const target = out.find((o) => o.date === '2026-08-11')!
    expect(target.spotsLeft).toBe(0)
    expect(target.isFull).toBe(true)
  })

  it('leaves other dates unaffected by one full date', () => {
    const out = generateOccurrences(base, { '2026-08-11': 10 }, TUE_MORNING)
    const other = out.find((o) => o.date === '2026-08-13')!
    expect(other.isFull).toBe(false)
    expect(other.spotsLeft).toBe(10)
  })
})

describe('generateOccurrences — one-time sessions', () => {
  it('publishes exactly one date, ignoring weekdays entirely', () => {
    const out = generateOccurrences(oneTime, {}, TUE_MORNING)
    expect(out.map((o) => o.date)).toEqual(['2026-08-13'])
  })

  it('does not repeat on the same weekday the following week', () => {
    const out = generateOccurrences(oneTime, {}, TUE_MORNING)
    expect(out).toHaveLength(1)
  })

  it('keeps its date while that game is still underway', () => {
    // 19:00 club time on the session's own date.
    const during = new Date('2026-08-13T23:00:00Z')
    expect(generateOccurrences(oneTime, {}, during).map((o) => o.date)).toEqual(['2026-08-13'])
  })

  it('goes quiet for good once its date has passed', () => {
    // 20:30 club time, half an hour after the game ended.
    const after = new Date('2026-08-14T00:30:00Z')
    expect(generateOccurrences(oneTime, {}, after)).toEqual([])
  })

  it('drops a date that is already in the past', () => {
    const out = generateOccurrences({ ...oneTime, specific_date: '2026-08-01' }, {}, TUE_MORNING)
    expect(out).toEqual([])
  })

  it('returns nothing when no date has been set', () => {
    expect(generateOccurrences({ ...oneTime, specific_date: null }, {}, TUE_MORNING)).toEqual([])
  })

  it('honours a blackout on its own date', () => {
    const out = generateOccurrences(
      { ...oneTime, blackout_dates: ['2026-08-13'] },
      {},
      TUE_MORNING
    )
    expect(out).toEqual([])
  })

  it('still tracks capacity for its single date', () => {
    const out = generateOccurrences(oneTime, { '2026-08-13': 10 }, TUE_MORNING)
    expect(out[0].isFull).toBe(true)
    expect(out[0].spotsLeft).toBe(0)
  })
})

describe('formatSessionTime', () => {
  it('renders 12-hour time in English', () => {
    expect(formatSessionTime('18:00:00', 'en')).toBe('6:00 PM')
    expect(formatSessionTime('00:30:00', 'en')).toBe('12:30 AM')
    expect(formatSessionTime('12:00:00', 'en')).toBe('12:00 PM')
  })

  it('renders 24-hour time in Spanish', () => {
    expect(formatSessionTime('18:00:00', 'es')).toBe('18:00')
    expect(formatSessionTime('09:05:00', 'es')).toBe('09:05')
  })
})
