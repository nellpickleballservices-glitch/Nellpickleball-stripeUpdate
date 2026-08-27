// Play sessions — weekly recurring games, or one-off dates, with paid sign-ups.
// Schema: supabase/migrations/0025_play_sessions.sql,
//         supabase/migrations/0026_session_one_time.sql

export type PaymentMethod = 'stripe' | 'cash'
export type PaymentStatus = 'pending' | 'paid' | 'cancelled' | 'refunded'
export type SessionCurrency = 'usd' | 'dop'

/** 0 = Sunday .. 6 = Saturday, matching Postgres `extract(dow)` and JS `getDay()`. */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface PlaySession {
  id: string
  title_es: string
  title_en: string
  description_es: string | null
  description_en: string | null
  details_es: string | null
  details_en: string | null
  image_url: string | null
  image_urls: string[]
  /**
   * Which of the two shapes this row is. Recurring rows project
   * `days_of_week` forward `weeks_ahead` weeks; one-time rows run on
   * `specific_date` and nothing else.
   */
  is_recurring: boolean
  days_of_week: DayOfWeek[]
  start_time: string // 'HH:MM:SS'
  end_time: string
  /** Null on a one-time session, where there is no horizon to project. */
  weeks_ahead: number | null
  /** 'YYYY-MM-DD'. Set only when `is_recurring` is false. */
  specific_date: string | null
  blackout_dates: string[] // 'YYYY-MM-DD'
  capacity: number
  price_cents: number
  currency: SessionCurrency
  allow_stripe: boolean
  allow_cash: boolean
  location_name: string | null
  is_published: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface SessionSignup {
  id: string
  session_id: string
  session_date: string
  name: string
  email: string
  phone: string | null
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  amount_cents: number
  currency: SessionCurrency
  stripe_session_id: string | null
  stripe_payment_intent: string | null
  hold_expires_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

/** A signup row joined with its parent session's title, for the admin roster. */
export interface AdminSessionSignup extends SessionSignup {
  session_title: string | null
}

/**
 * One concrete, bookable date projected from a session template — i.e. one
 * card on the public page. `endsAt` is the card's expiration: past it, the
 * occurrence is no longer generated at all.
 */
export interface SessionOccurrence {
  date: string // 'YYYY-MM-DD'
  dayOfWeek: DayOfWeek
  startsAt: string // ISO-8601 with the club's UTC offset
  endsAt: string
  taken: number
  capacity: number
  spotsLeft: number
  isFull: boolean
}
