'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendExpeditionInterestEmail } from '@/lib/resend/emails'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface CreateExpeditionInterestInput {
  expedition_id: string
  name: string
  email: string
  phone?: string
  party_size?: number
  message?: string
  // Honeypot — bots usually fill every field. Real users never see this.
  hp?: string
}

export async function createExpeditionInterestAction(
  input: CreateExpeditionInterestInput
): Promise<{ success: true } | { success: false; error: string }> {
  // Silent honeypot reject — pretend success so bots don't retry.
  if (input.hp && input.hp.trim().length > 0) {
    return { success: true }
  }

  const name = input.name?.trim() ?? ''
  const email = input.email?.trim().toLowerCase() ?? ''
  const phone = input.phone?.trim() || null
  const message = input.message?.trim() || null
  const partySize = Number.isFinite(input.party_size) && input.party_size! > 0
    ? Math.min(Math.floor(input.party_size!), 200)
    : null

  if (!UUID_RE.test(input.expedition_id)) {
    return { success: false, error: 'Invalid expedition' }
  }
  if (name.length < 2 || name.length > 120) {
    return { success: false, error: 'Please enter your name' }
  }
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return { success: false, error: 'Please enter a valid email' }
  }
  if (phone && phone.length > 40) {
    return { success: false, error: 'Phone number is too long' }
  }
  if (message && message.length > 2000) {
    return { success: false, error: 'Message is too long' }
  }

  // Look up the expedition title for the email + sanity-check the FK.
  const { data: expedition, error: expErr } = await supabaseAdmin
    .from('expeditions')
    .select('id, title_en, title_es')
    .eq('id', input.expedition_id)
    .maybeSingle()

  if (expErr || !expedition) {
    return { success: false, error: 'Expedition not found' }
  }

  const { error: insertErr } = await supabaseAdmin
    .from('expedition_interests')
    .insert({
      expedition_id: input.expedition_id,
      name,
      email,
      phone,
      party_size: partySize,
      message,
    })

  if (insertErr) {
    console.error('[expedition-interests] insert error:', insertErr.message)
    return { success: false, error: 'Could not save your submission' }
  }

  // Fire-and-forget — don't block the user response on the email send.
  void sendExpeditionInterestEmail({
    expeditionTitle: expedition.title_en ?? expedition.title_es ?? 'Expedition',
    name,
    email,
    phone,
    partySize,
    message,
  })

  return { success: true }
}
