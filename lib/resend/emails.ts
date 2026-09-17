import { resend } from './index'

const FROM_ADDRESS = 'NELL Pickleball Club <onboarding@resend.dev>'

const translations = {
  confirmation: {
    en: {
      subject: 'Booking Confirmed — NELL Pickleball Club',
      body: (courtName: string, date: string, time: string) =>
        `Your booking has been confirmed!\n\nCourt: ${courtName}\nDate: ${date}\nTime: ${time}\n\nSee you on the court!\n\n— NELL Pickleball Club`,
    },
    es: {
      subject: 'Reserva Confirmada — NELL Pickleball Club',
      body: (courtName: string, date: string, time: string) =>
        `Tu reserva ha sido confirmada!\n\nCancha: ${courtName}\nFecha: ${date}\nHora: ${time}\n\nNos vemos en la cancha!\n\n— NELL Pickleball Club`,
    },
  },
  reminder: {
    en: {
      subject: 'Session Ending Soon — NELL Pickleball Club',
      body: (courtName: string) =>
        `Your pickleball session on ${courtName} ends in 10 minutes. Please prepare to exit the court so the next group can begin.\n\n— NELL Pickleball Club`,
    },
    es: {
      subject: 'Sesion Terminando Pronto — NELL Pickleball Club',
      body: (courtName: string) =>
        `Tu sesion de pickleball en ${courtName} termina en 10 minutos. Por favor preparate para salir de la cancha para que el proximo grupo pueda comenzar.\n\n— NELL Pickleball Club`,
    },
  },
} as const

type SupportedLocale = 'en' | 'es'

function getLocale(locale: string): SupportedLocale {
  return locale === 'en' ? 'en' : 'es'
}

export async function sendConfirmationEmail(
  to: string,
  courtName: string,
  date: string,
  time: string,
  locale: string
): Promise<void> {
  try {
    const l = getLocale(locale)
    const t = translations.confirmation[l]

    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: t.subject,
      text: t.body(courtName, date, time),
    })
  } catch (error) {
    console.error('Failed to send confirmation email:', error)
  }
}

export async function sendReminderEmail(
  to: string,
  courtName: string,
  locale: string
): Promise<void> {
  try {
    const l = getLocale(locale)
    const t = translations.reminder[l]

    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: t.subject,
      text: t.body(courtName),
    })
  } catch (error) {
    console.error('Failed to send reminder email:', error)
  }
}

export interface ExpeditionInterestEmail {
  expeditionTitle: string
  name: string
  email: string
  phone: string | null
  partySize: number | null
  message: string | null
}

/**
 * Notifies the operator that a new expedition interest was submitted.
 * Target inbox comes from CLIENT_NOTIFICATION_EMAIL env var.
 */
export async function sendExpeditionInterestEmail(
  payload: ExpeditionInterestEmail
): Promise<void> {
  const to = process.env.CLIENT_NOTIFICATION_EMAIL
  if (!to) {
    console.warn(
      '[interest-email] CLIENT_NOTIFICATION_EMAIL not set — skipping email notification.'
    )
    return
  }

  try {
    const lines = [
      `A new lead has shown interest in: ${payload.expeditionTitle}`,
      '',
      `Name:        ${payload.name}`,
      `Email:       ${payload.email}`,
      payload.phone ? `Phone:       ${payload.phone}` : null,
      payload.partySize ? `Party size:  ${payload.partySize}` : null,
      '',
      payload.message ? `Message:\n${payload.message}` : null,
      '',
      '— Sent automatically by the NELL Pickleball site.',
    ].filter(Boolean) as string[]

    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      replyTo: payload.email,
      subject: `New expedition interest: ${payload.expeditionTitle}`,
      text: lines.join('\n'),
    })
  } catch (error) {
    console.error('Failed to send expedition interest email:', error)
  }
}

export interface SessionSignupEmail {
  sessionTitle: string
  sessionDate: string
  startTime: string
  endTime: string
  name: string
  email: string
  phone: string | null
  paymentMethod: 'stripe' | 'cash'
  amountCents: number
  currency: string
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

/**
 * Sends the player their confirmation and the operator their heads-up, in one
 * call. Both sends are individually guarded: a failure to notify the operator
 * must never cost the player their confirmation, and neither can fail the
 * booking that already succeeded.
 */
export async function sendSessionSignupEmails(payload: SessionSignupEmail): Promise<void> {
  const when = `${payload.sessionDate} · ${payload.startTime.slice(0, 5)}–${payload.endTime.slice(0, 5)}`
  const paid = payload.paymentMethod === 'stripe'
  const amount = formatMoney(payload.amountCents, payload.currency)

  // ── Player confirmation ──
  try {
    const lines = [
      `Hi ${payload.name},`,
      '',
      `You're signed up for ${payload.sessionTitle}.`,
      '',
      `When:   ${when}`,
      paid
        ? `Paid:   ${amount} — payment received, you're all set.`
        : `To pay: ${amount} in cash at the court. Please arrive a few minutes early.`,
      '',
      'Spots are limited, so let us know as soon as possible if your plans change.',
      '',
      'See you on the court!',
      '— NELL Pickleball Club',
    ]

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: payload.email,
      subject: `You're signed up — ${payload.sessionTitle}`,
      text: lines.join('\n'),
    })
  } catch (error) {
    console.error('Failed to send session confirmation email:', error)
  }

  // ── Operator notification ──
  const to = process.env.CLIENT_NOTIFICATION_EMAIL
  if (!to) {
    console.warn('[session-email] CLIENT_NOTIFICATION_EMAIL not set — skipping operator notification.')
    return
  }

  try {
    const lines = [
      `New sign-up for: ${payload.sessionTitle}`,
      '',
      `When:     ${when}`,
      `Name:     ${payload.name}`,
      `Email:    ${payload.email}`,
      payload.phone ? `Phone:    ${payload.phone}` : null,
      `Payment:  ${paid ? `${amount} paid online` : `${amount} CASH — collect at the court`}`,
      '',
      '— Sent automatically by the NELL Pickleball site.',
    ].filter(Boolean) as string[]

    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      replyTo: payload.email,
      subject: `${paid ? 'Paid' : 'Cash'} sign-up: ${payload.sessionTitle} (${payload.sessionDate})`,
      text: lines.join('\n'),
    })
  } catch (error) {
    console.error('Failed to send session operator email:', error)
  }
}

export interface SpecialEventSignupEmail {
  eventTitle: string
  eventDate: string
  startTime: string
  endTime: string
  name: string
  email: string
  paymentMethod: 'stripe' | 'cash'
  amountCents: number
  currency: string
}

export async function sendSpecialEventSignupEmails(payload: SpecialEventSignupEmail): Promise<void> {
  const when = `${payload.eventDate} · ${payload.startTime.slice(0, 5)}–${payload.endTime.slice(0, 5)}`
  const paid = payload.paymentMethod === 'stripe'
  const amount = formatMoney(payload.amountCents, payload.currency)

  try {
    const lines = [
      `Hi ${payload.name},`,
      '',
      `You're signed up for ${payload.eventTitle}.`,
      '',
      `When:   ${when}`,
      paid
        ? `Paid:   ${amount} — payment received, you're all set.`
        : `To pay: ${amount} in cash at the door. Please arrive a few minutes early.`,
      '',
      'See you there!',
      '— NELL Pickleball Club',
    ]

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: payload.email,
      subject: `You're signed up — ${payload.eventTitle}`,
      text: lines.join('\n'),
    })
  } catch (error) {
    console.error('Failed to send special event confirmation email:', error)
  }

  const to = process.env.CLIENT_NOTIFICATION_EMAIL
  if (!to) return

  try {
    const lines = [
      `New sign-up for: ${payload.eventTitle}`,
      '',
      `When:     ${when}`,
      `Name:     ${payload.name}`,
      `Email:    ${payload.email}`,
      `Payment:  ${paid ? `${amount} paid online` : `${amount} CASH — collect at the door`}`,
      '',
      '— Sent automatically by the NELL Pickleball site.',
    ]

    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      replyTo: payload.email,
      subject: `${paid ? 'Paid' : 'Cash'} sign-up: ${payload.eventTitle} (${payload.eventDate})`,
      text: lines.join('\n'),
    })
  } catch (error) {
    console.error('Failed to send special event operator email:', error)
  }
}

export interface ContactMessageEmail {
  firstName: string
  lastName: string
  email: string
  question: string
}

/**
 * Notifies the operator that a new contact-form message was submitted.
 * Target inbox comes from CLIENT_NOTIFICATION_EMAIL env var.
 */
export async function sendContactMessageEmail(
  payload: ContactMessageEmail
): Promise<void> {
  const to = process.env.CLIENT_NOTIFICATION_EMAIL
  if (!to) {
    console.warn(
      '[contact-email] CLIENT_NOTIFICATION_EMAIL not set — skipping email notification.'
    )
    return
  }

  try {
    const lines = [
      'A new message was submitted through the contact form.',
      '',
      `Name:   ${payload.firstName} ${payload.lastName}`,
      `Email:  ${payload.email}`,
      '',
      `Question:\n${payload.question}`,
      '',
      '— Sent automatically by the NELL Pickleball site.',
    ]

    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      replyTo: payload.email,
      subject: `New contact message from ${payload.firstName} ${payload.lastName}`,
      text: lines.join('\n'),
    })
  } catch (error) {
    console.error('Failed to send contact message email:', error)
  }
}
