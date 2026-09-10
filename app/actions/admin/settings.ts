'use server'

import { requireAdmin } from './auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

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
