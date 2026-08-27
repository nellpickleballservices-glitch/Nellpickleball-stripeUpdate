'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from './auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export interface HeroLocation {
  id: string
  name: string
  sort_order: number
  created_at: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_NAME_LEN = 80

export async function getHeroLocationsAction(): Promise<HeroLocation[]> {
  await requireAdmin()

  const { data, error } = await supabaseAdmin
    .from('hero_locations')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[hero-locations] getHeroLocations error:', error.message)
    throw new Error('Operation failed')
  }
  return (data ?? []) as HeroLocation[]
}

export async function createHeroLocationAction(name: string): Promise<{ success: boolean }> {
  await requireAdmin()

  const trimmed = name.trim()
  if (!trimmed) throw new Error('Name is required')
  if (trimmed.length > MAX_NAME_LEN) throw new Error('Name is too long')

  const { data: existing } = await supabaseAdmin
    .from('hero_locations')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (existing?.sort_order ?? 0) + 1

  const { error } = await supabaseAdmin
    .from('hero_locations')
    .insert({ name: trimmed, sort_order: nextOrder })

  if (error) {
    console.error('[hero-locations] createHeroLocation error:', error.message)
    throw new Error('Operation failed')
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function deleteHeroLocationAction(id: string): Promise<{ success: boolean }> {
  await requireAdmin()

  if (!UUID_RE.test(id)) throw new Error('Invalid id')

  const { error } = await supabaseAdmin
    .from('hero_locations')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[hero-locations] deleteHeroLocation error:', error.message)
    throw new Error('Operation failed')
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
