'use server'

import { requireAdmin } from './auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'
import type { UserWithDetails } from '@/lib/types/admin'
import type { PaymentStatus, PaymentMethod } from '@/lib/types/sessions'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const USER_PAGE_SIZE = 25

/** One row of a user's play-session history, as rendered in the admin slide-out. */
export interface UserSignupHistoryRow {
  id: string
  session_date: string
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  amount_cents: number
  currency: string
  title_en: string | null
  title_es: string | null
  start_time: string | null
}

/**
 * Search users by name, email, or phone. Returns paginated results.
 * Uses admin_users_view (Postgres view joining profiles + auth.users)
 * to eliminate the N+1 query pattern that previously fetched all users.
 */
export async function searchUsersAction(
  query: string,
  page: number = 1
): Promise<{ users: UserWithDetails[]; total: number; page: number }> {
  await requireAdmin()

  const offset = (page - 1) * USER_PAGE_SIZE
  const trimmed = query.trim()

  let q = supabaseAdmin
    .from('admin_users_view')
    .select('id, first_name, last_name, phone, country, is_local, email, last_sign_in_at, banned_until, created_at', { count: 'exact' })

  if (trimmed) {
    // Escape PostgREST special characters to prevent filter injection
    const escaped = trimmed.replace(/[%_\\,().]/g, '')
    const term = `%${escaped}%`
    q = q.or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`)
  }

  const { data, count, error } = await q
    .order('created_at', { ascending: false })
    .range(offset, offset + USER_PAGE_SIZE - 1)

  if (error) {
    console.error('[users] searchUsers error:', error.message)
    throw new Error('Operation failed')
  }
  if (!data) return { users: [], total: 0, page }

  const users: UserWithDetails[] = data.map((u) => {
    return {
      id: u.id,
      email: u.email ?? '',
      first_name: u.first_name,
      last_name: u.last_name,
      phone: u.phone,
      country: u.country ?? null,
      created_at: u.created_at,
      membership_status: null,
      membership_plan: null,
      is_banned: u.banned_until ? new Date(u.banned_until).getTime() > Date.now() : false,
      is_local: u.is_local ?? false,
    }
  })

  return { users, total: count ?? 0, page }
}

/**
 * Fetch full user details for the admin slide-out panel.
 * Uses admin_users_view for email/ban fields instead of auth admin API.
 */
export async function getUserDetailsAction(userId: string) {
  await requireAdmin()
  if (!UUID_RE.test(userId)) throw new Error('Invalid user ID')

  // Fetch user from admin_users_view (profile + auth fields in one query)
  const { data: viewUser, error: viewError } = await supabaseAdmin
    .from('admin_users_view')
    .select('id, first_name, last_name, phone, country, is_local, email, banned_until, created_at')
    .eq('id', userId)
    .single()

  if (viewError || !viewUser) throw new Error('User not found')

  // Fetch play-session sign-up history (last 20).
  //
  // session_signups has no user_id — sign-ups are open to anyone with an email,
  // members included — so email is the only link back to an account. Stored
  // lowercased by book_session_spot(), and matched that way here.
  const email = viewUser.email?.toLowerCase() ?? null
  const { data: signupRows } = email
    ? await supabaseAdmin
        .from('session_signups')
        .select('id, session_date, payment_status, payment_method, amount_cents, currency, play_sessions(title_en, title_es, start_time)')
        .eq('email', email)
        .order('session_date', { ascending: false })
        .limit(20)
    : { data: [] }

  // Flatten the joined play_sessions row — PostgREST types the embed as an
  // array even on a to-one relationship.
  const signups: UserSignupHistoryRow[] = (signupRows ?? []).map((row) => {
    const session = Array.isArray(row.play_sessions) ? row.play_sessions[0] : row.play_sessions
    return {
      id: row.id,
      session_date: row.session_date,
      payment_status: row.payment_status as PaymentStatus,
      payment_method: row.payment_method as PaymentMethod,
      amount_cents: row.amount_cents,
      currency: row.currency,
      title_en: session?.title_en ?? null,
      title_es: session?.title_es ?? null,
      start_time: session?.start_time ?? null,
    }
  })

  return {
    id: viewUser.id,
    first_name: viewUser.first_name,
    last_name: viewUser.last_name,
    email: viewUser.email ?? '',
    phone: viewUser.phone,
    country: viewUser.country ?? null,
    created_at: viewUser.created_at,
    is_banned: viewUser.banned_until
      ? new Date(viewUser.banned_until).getTime() > Date.now()
      : false,
    is_local: viewUser.is_local ?? false,
    membership: null,
    signups: signups ?? [],
  }
}

/**
 * Disable a user account (ban) and cancel their upcoming session sign-ups,
 * freeing those spots for other players.
 */
export async function disableUserAction(userId: string) {
  await requireAdmin()
  if (!UUID_RE.test(userId)) throw new Error('Invalid user ID')

  // Look up the email before banning — it's the only link to session_signups.
  const { data: viewUser } = await supabaseAdmin
    .from('admin_users_view')
    .select('email')
    .eq('id', userId)
    .single()

  // Ban the user for ~100 years
  const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: '876000h',
  })
  if (banError) throw banError

  // Cancel upcoming sign-ups. session_date is a plain date, so compare against
  // today in club time rather than a UTC timestamp.
  const email = viewUser?.email?.toLowerCase()
  if (email) {
    const clubToday = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santo_Domingo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())

    await supabaseAdmin
      .from('session_signups')
      .update({ payment_status: 'cancelled', hold_expires_at: null, updated_at: new Date().toISOString() })
      .eq('email', email)
      .gte('session_date', clubToday)
      .in('payment_status', ['pending', 'paid'])
  }

  return { success: true }
}

/**
 * Re-enable a disabled (banned) user account.
 */
export async function enableUserAction(userId: string) {
  await requireAdmin()
  if (!UUID_RE.test(userId)) throw new Error('Invalid user ID')

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  })
  if (error) throw error

  return { success: true }
}

/**
 * Trigger a password reset email for a user via Resend.
 */
export async function triggerPasswordResetAction(userId: string) {
  await requireAdmin()
  if (!UUID_RE.test(userId)) throw new Error('Invalid user ID')

  // Get user email from admin_users_view
  const { data: viewUser, error: viewError } = await supabaseAdmin
    .from('admin_users_view')
    .select('email')
    .eq('id', userId)
    .single()

  if (viewError || !viewUser) throw new Error('User not found')

  const email = viewUser.email
  if (!email) throw new Error('User has no email address')

  // Generate recovery link
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
  })
  if (linkError) throw linkError

  const recoveryLink = linkData.properties.action_link

  // Send via Resend with bilingual template
  try {
    await resend.emails.send({
      from: 'NELL Pickleball Club <onboarding@resend.dev>',
      to: email,
      subject: 'Password Reset / Restablecer Contrasena — NELL Pickleball Club',
      text: `Password Reset / Restablecer Contrasena\n\nClick the link below to reset your password:\nHaz clic en el enlace para restablecer tu contrasena:\n\n${recoveryLink}\n\nThis link expires in 24 hours.\nEste enlace expira en 24 horas.\n\n— NELL Pickleball Club`,
    })
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    throw new Error('Failed to send password reset email')
  }

  return { success: true }
}

/**
 * Update a user's country (admin only).
 */
export async function updateUserCountryAction(userId: string, country: string) {
  await requireAdmin()
  if (!UUID_RE.test(userId)) throw new Error('Invalid user ID')

  if (!/^[A-Z]{2}$/.test(country)) throw new Error('Invalid country code')

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ country })
    .eq('id', userId)

  if (error) {
    console.error('[users] updateUserCountry error:', error.message)
    throw new Error('Operation failed')
  }

  return { success: true }
}

/**
 * Toggle a user's local status (admin only).
 * Locals pay the base session price; non-locals pay base + tourist surcharge.
 */
export async function toggleLocalStatusAction(userId: string, isLocal: boolean) {
  await requireAdmin()
  if (!UUID_RE.test(userId)) throw new Error('Invalid user ID')

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ is_local: isLocal })
    .eq('id', userId)

  if (error) {
    console.error('[users] toggleLocalStatus error:', error.message)
    throw new Error('Operation failed')
  }

  return { success: true }
}
