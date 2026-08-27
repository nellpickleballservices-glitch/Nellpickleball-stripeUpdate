// Admin domain type definitions
// Matches schema from supabase/migrations/0005_admin_events_cms.sql

export type EventType = 'tournament' | 'training' | 'social'

export interface Event {
  id: string
  title_es: string
  title_en: string
  description_es: string | null
  description_en: string | null
  event_date: string
  location_id: string | null
  event_type: EventType
  start_time: string | null
  end_time: string | null
  image_url: string | null
  price_cents: number | null
  created_at: string
}

export interface ContentBlock {
  id: string
  block_key: string
  block_type: string
  content_es: string | null
  content_en: string | null
  sort_order: number
  updated_at: string
}

export interface AdminStats {
  totalUsers: number
  activeMembers: number
  todaySignups: number
  upcomingEvents: number
}

export type GalleryMediaType = 'image' | 'video'
export type GalleryGridSize = '1x1' | '1x2' | '2x1' | '2x2'

export interface GalleryItem {
  id: string
  media_type: GalleryMediaType
  url: string
  thumbnail_url: string | null
  title_es: string | null
  title_en: string | null
  caption_es: string | null
  caption_en: string | null
  grid_size: GalleryGridSize
  sort_order: number
  is_visible: boolean
  created_at: string
}

export interface Expedition {
  id: string
  title_es: string
  title_en: string
  description_es: string | null
  description_en: string | null
  details_es: string | null
  details_en: string | null
  image_url: string
  image_urls: string[]
  start_date: string
  end_date: string
  expires_at: string | null
  is_published: boolean
  sort_order: number
  created_at: string
}

export interface UserWithDetails {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  country: string | null
  created_at: string
  membership_status: string | null
  membership_plan: string | null
  is_banned: boolean
}
