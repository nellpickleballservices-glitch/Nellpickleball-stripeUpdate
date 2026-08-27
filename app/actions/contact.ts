'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendContactMessageEmail } from '@/lib/resend/emails'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface CreateContactMessageInput {
  first_name: string
  last_name: string
  email: string
  question: string
  // Honeypot — bots usually fill every field. Real users never see this.
  hp?: string
}

export async function createContactMessageAction(
  input: CreateContactMessageInput
): Promise<{ success: true } | { success: false; error: string }> {
  // Silent honeypot reject — pretend success so bots don't retry.
  if (input.hp && input.hp.trim().length > 0) {
    return { success: true }
  }

  const firstName = input.first_name?.trim() ?? ''
  const lastName = input.last_name?.trim() ?? ''
  const email = input.email?.trim().toLowerCase() ?? ''
  const question = input.question?.trim() ?? ''

  if (firstName.length < 1 || firstName.length > 80) {
    return { success: false, error: 'Please enter your first name' }
  }
  if (lastName.length < 1 || lastName.length > 80) {
    return { success: false, error: 'Please enter your last name' }
  }
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return { success: false, error: 'Please enter a valid email' }
  }
  if (question.length < 2 || question.length > 2000) {
    return { success: false, error: 'Please enter your question' }
  }

  const { error: insertErr } = await supabaseAdmin
    .from('contact_messages')
    .insert({
      first_name: firstName,
      last_name: lastName,
      email,
      question,
    })

  if (insertErr) {
    console.error('[contact] insert error:', insertErr.message)
    return { success: false, error: 'Could not send your message' }
  }

  // Fire-and-forget — don't block the user response on the email send.
  void sendContactMessageEmail({
    firstName,
    lastName,
    email,
    question,
  })

  return { success: true }
}
