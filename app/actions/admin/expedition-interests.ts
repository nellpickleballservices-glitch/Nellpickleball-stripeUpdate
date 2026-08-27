'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from './auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALID_STATUSES = ['new', 'contacted', 'booked', 'declined'] as const
export type InterestStatus = (typeof VALID_STATUSES)[number]

export interface AdminExpeditionInterest {
  id: string
  expedition_id: string
  expedition_title: string | null
  name: string
  email: string
  phone: string | null
  party_size: number | null
  message: string | null
  status: InterestStatus
  created_at: string
  updated_at: string
}

export async function getExpeditionInterestsAction(): Promise<AdminExpeditionInterest[]> {
  await requireAdmin()

  const { data, error } = await supabaseAdmin
    .from('expedition_interests')
    .select('*, expedition:expeditions(title_en, title_es)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[admin] expedition-interests list error:', error.message)
    throw new Error('Operation failed')
  }

  return (data ?? []).map((row): AdminExpeditionInterest => {
    const exp = (row as { expedition?: { title_en?: string; title_es?: string } }).expedition
    return {
      id: row.id,
      expedition_id: row.expedition_id,
      expedition_title: exp?.title_en ?? exp?.title_es ?? null,
      name: row.name,
      email: row.email,
      phone: row.phone,
      party_size: row.party_size,
      message: row.message,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  })
}

export async function updateExpeditionInterestStatusAction(
  id: string,
  status: InterestStatus
): Promise<{ success: boolean }> {
  await requireAdmin()

  if (!UUID_RE.test(id)) throw new Error('Invalid id')
  if (!VALID_STATUSES.includes(status)) throw new Error('Invalid status')

  const { error } = await supabaseAdmin
    .from('expedition_interests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[admin] update expedition-interest status error:', error.message)
    throw new Error('Operation failed')
  }

  revalidatePath('/n3ll-admin-x9k2/interests')
  return { success: true }
}

export async function deleteExpeditionInterestAction(id: string): Promise<{ success: boolean }> {
  await requireAdmin()

  if (!UUID_RE.test(id)) throw new Error('Invalid id')

  const { error } = await supabaseAdmin
    .from('expedition_interests')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[admin] delete expedition-interest error:', error.message)
    throw new Error('Operation failed')
  }

  revalidatePath('/n3ll-admin-x9k2/interests')
  return { success: true }
}
