import { createClient } from '@/lib/supabase/server'

export interface HeroLocation {
  id: string
  name: string
  sort_order: number
}

export async function getHeroLocations(): Promise<HeroLocation[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('hero_locations')
    .select('id, name, sort_order')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[hero-locations] getHeroLocations error:', error.message)
    return []
  }
  return (data ?? []) as HeroLocation[]
}
