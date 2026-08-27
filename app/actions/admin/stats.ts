'use server'

import { requireAdmin } from './auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AdminStats } from '@/lib/types/admin'

/**
 * Fetches aggregate stats for the admin dashboard.
 * Uses supabaseAdmin (service role) to bypass RLS for cross-user queries.
 */
export async function getAdminStatsAction(): Promise<AdminStats> {
  await requireAdmin()

  // Calculate today boundaries in America/Santo_Domingo timezone
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santo_Domingo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const todayStr = formatter.format(now) // YYYY-MM-DD

  // Total users (count profiles as proxy for registered users)
  const { count: totalUsers } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })

  // Today's play-session sign-ups. Mirrors session_taken_count(): a spot is
  // occupied while pending or paid, and a pending Stripe hold that has lapsed
  // no longer counts.
  const { count: todaySignups } = await supabaseAdmin
    .from('session_signups')
    .select('id', { count: 'exact', head: true })
    .eq('session_date', todayStr)
    .in('payment_status', ['pending', 'paid'])
    .or(`hold_expires_at.is.null,hold_expires_at.gt.${now.toISOString()}`)

  // Upcoming events
  const { count: upcomingEvents } = await supabaseAdmin
    .from('events')
    .select('id', { count: 'exact', head: true })
    .gte('event_date', now.toISOString())

  return {
    totalUsers: totalUsers ?? 0,
    activeMembers: 0,
    todaySignups: todaySignups ?? 0,
    upcomingEvents: upcomingEvents ?? 0,
  }
}
