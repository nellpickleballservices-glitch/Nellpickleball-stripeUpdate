'use server'

import { requireAdmin } from './auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { deleteFromBlob } from '@/lib/blob'

/**
 * Read the tourist surcharge percentage from app_config.
 * Returns 0 if no row exists yet.
 */
export async function getTouristSurchargeAction(): Promise<number> {
  await requireAdmin()

  const { data, error } = await supabaseAdmin
    .from('app_config')
    .select('value')
    .eq('key', 'tourist_surcharge_pct')
    .maybeSingle()

  if (error) {
    console.error('[settings] getTouristSurcharge error:', error.message)
    return 0
  }

  return data ? parseInt(data.value, 10) || 0 : 0
}

/**
 * Upsert the tourist surcharge percentage in app_config.
 * Value must be 0–100.
 */
export async function updateTouristSurchargeAction(pct: number): Promise<{ success: boolean }> {
  await requireAdmin()

  if (!Number.isInteger(pct) || pct < 0 || pct > 100) {
    throw new Error('Surcharge must be a whole number between 0 and 100')
  }

  const { error } = await supabaseAdmin
    .from('app_config')
    .upsert(
      { key: 'tourist_surcharge_pct', value: String(pct) },
      { onConflict: 'key' }
    )

  if (error) {
    console.error('[settings] updateTouristSurcharge error:', error.message)
    throw new Error('Operation failed')
  }

  return { success: true }
}

// ── Special Events Banner ──

export interface SpecialEventsBannerConfig {
  title_es: string
  title_en: string
  subtitle_es: string
  subtitle_en: string
  image_url: string
}

const BANNER_KEY = 'special_events_banner'

const EMPTY_BANNER: SpecialEventsBannerConfig = {
  title_es: '',
  title_en: '',
  subtitle_es: '',
  subtitle_en: '',
  image_url: '',
}

/** Admin: read current banner config. */
export async function getSpecialEventsBannerAction(): Promise<SpecialEventsBannerConfig> {
  await requireAdmin()
  return getSpecialEventsBannerPublic()
}

/** Public: read banner config (no auth). */
export async function getSpecialEventsBannerPublic(): Promise<SpecialEventsBannerConfig> {
  const { data, error } = await supabaseAdmin
    .from('app_config')
    .select('value')
    .eq('key', BANNER_KEY)
    .maybeSingle()

  if (error || !data) return EMPTY_BANNER

  try {
    return { ...EMPTY_BANNER, ...JSON.parse(data.value) }
  } catch {
    return EMPTY_BANNER
  }
}

/** Admin: save banner config. */
export async function updateSpecialEventsBannerAction(
  config: SpecialEventsBannerConfig
): Promise<{ success: boolean }> {
  await requireAdmin()

  // Fetch old config to detect replaced image
  const old = await getSpecialEventsBannerPublic()

  const { error } = await supabaseAdmin
    .from('app_config')
    .upsert(
      { key: BANNER_KEY, value: JSON.stringify(config) },
      { onConflict: 'key' }
    )

  if (error) {
    console.error('[settings] updateSpecialEventsBanner error:', error.message)
    throw new Error('Operation failed')
  }

  // Clean up old blob if image changed
  if (old.image_url && old.image_url !== config.image_url) {
    void deleteFromBlob(old.image_url)
  }

  return { success: true }
}
