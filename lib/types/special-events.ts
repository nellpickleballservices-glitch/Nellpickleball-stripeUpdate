// Special events — one-off promotional events with early-bird pricing,
// customizable card sizes, and hero/banner sections.
// Schema: supabase/migrations/0028_special_events.sql

export const SPECIAL_EVENTS_TAG = 'special-events'

export type PaymentMethod = 'stripe' | 'cash'
export type PaymentStatus = 'pending' | 'paid' | 'cancelled' | 'refunded'
export type EventCurrency = 'usd' | 'dop'
export type CardSize = 'normal' | 'large' | 'featured'

export interface SpecialEvent {
  id: string
  title_es: string
  title_en: string
  description_es: string | null
  description_en: string | null
  details_es: string | null
  details_en: string | null
  image_url: string | null
  image_urls: string[]
  event_date: string // 'YYYY-MM-DD'
  start_time: string // 'HH:MM:SS'
  end_time: string
  capacity: number
  price_cents: number
  currency: EventCurrency
  promo_price_cents: number | null
  promo_expires_at: string | null // ISO-8601
  allow_stripe: boolean
  allow_cash: boolean
  card_size: CardSize
  hero_title_es: string | null
  hero_title_en: string | null
  hero_subtitle_es: string | null
  hero_subtitle_en: string | null
  hero_image_url: string | null
  location_name: string | null
  is_published: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface SpecialEventSignup {
  id: string
  event_id: string
  name: string
  email: string
  phone: string | null
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  amount_cents: number
  currency: EventCurrency
  stripe_session_id: string | null
  stripe_payment_intent: string | null
  hold_expires_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AdminSpecialEventSignup extends SpecialEventSignup {
  event_title: string | null
}
