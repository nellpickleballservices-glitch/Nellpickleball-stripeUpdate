import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/chat/rate-limit'
import { checkIpRateLimit } from '@/lib/chat/ip-rate-limit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ---------------------------------------------------------------------------
// POST /api/chat
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // IP burst rate limit (in-memory, 10 req/60s per IP)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
  if (!checkIpRateLimit(ip).allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many requests. Please wait a moment.' },
      { status: 429 },
    )
  }

  // Validate API key
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: 'configuration_error', message: 'Nell is unavailable right now. Please try again later.' },
      { status: 500 },
    )
  }

  const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  })

  let body: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    locale: string
    sessionId: string
  }

  try {
    body = await req.json()
  } catch (e) {
    console.error('[chat] JSON parse error:', e)
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { messages, locale, sessionId } = body

  if (!messages || !Array.isArray(messages) || !sessionId) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  // Validate sessionId format
  if (!UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  // Rate limiting (DB-backed, persists across serverless cold starts)
  const rateCheck = await checkRateLimit(supabaseAdmin, sessionId)
  if (!rateCheck.allowed) {
    const msg =
      locale === 'es'
        ? `Has enviado muchos mensajes. Intenta de nuevo en ${rateCheck.retryAfterMinutes} minutos.`
        : `You've sent too many messages. Try again in ${rateCheck.retryAfterMinutes} minutes.`
    return NextResponse.json({ error: 'rate_limited', message: msg }, { status: 429 })
  }

  // ---------------------------------------------------------------------------
  // Fetch content_blocks + upcoming events for system prompt
  // ---------------------------------------------------------------------------
  let knowledge = ''
  let eventsText = 'No upcoming events listed.'

  try {
    const { data: blocks } = await supabaseAdmin
      .from('content_blocks')
      .select('block_key, content_es, content_en')

    if (blocks && blocks.length > 0) {
      knowledge = blocks
        .map((b) => {
          const content = locale === 'es' ? b.content_es : b.content_en
          return `[${b.block_key}]: ${content ?? '(no content)'}`
        })
        .join('\n')
    }

    const today = new Date().toISOString().split('T')[0]
    const { data: events } = await supabaseAdmin
      .from('events')
      .select(
        'title_es, title_en, description_es, description_en, event_date, event_type, start_time, end_time',
      )
      .gte('event_date', today)
      .order('event_date')
      .limit(10)

    if (events && events.length > 0) {
      eventsText = events
        .map((e) => {
          const title = locale === 'es' ? e.title_es : e.title_en
          const desc = locale === 'es' ? e.description_es : e.description_en
          const time =
            e.start_time && e.end_time ? `${e.start_time} - ${e.end_time}` : 'Time TBD'
          return `- ${title} (${e.event_type}) on ${e.event_date} at ${time}${desc ? ': ' + desc : ''}`
        })
        .join('\n')
    }
  } catch (e) {
    console.error('[chat] CMS fetch error:', e)
    // If CMS fetch fails, continue with empty knowledge — Nell still works
  }

  // ---------------------------------------------------------------------------
  // System prompt
  // ---------------------------------------------------------------------------
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? ''

  const systemPrompt = `You are Nell, the friendly AI assistant for NELL Pickleball Club in Bavaro, Dominican Republic.
Your name plays on the club name NELL, inspired by founder Maria Nelly Mercedes Carrasco.

RULES:
- Detect the language of the user's message and ALWAYS respond in that same language
- You help visitors with: pickleball rules, package pricing, upcoming events, and club info
- Be warm, enthusiastic, and encouraging about pickleball
- Keep responses concise (2-3 paragraphs max)
- If asked about something outside club topics, politely redirect: "I'm here to help with NELL Pickleball Club! For other questions, feel free to reach out via WhatsApp."
- Never make up information not in the knowledge base
- For reservations, direct users to contact us via WhatsApp at +${whatsapp}

PACKAGES & PRICING (towels and water included; paddle rentals: $5 USD tourists, $250 DOP locals):
Tourists (1.5 hours per session):
  - Private Lesson: $25 USD
  - Group (2–4 people): $20 USD
  - Academy (1 hour): $18 USD/person
Locals (1.5 hours per session):
  - Private Lesson (1 hour): $750 DOP
  - Group (2–4 people): $600 DOP
Churches & Schools (1 hour per session):
  - Group (2–4 people): $500 DOP
Tournaments (per person):
  - Tourists: Team of 2 $50 USD, Team of 4 $40 USD
  - Locals: Team of 2 $1,500 DOP, Team of 4 $1,200 DOP
  - Churches & Schools: Team of 2 $1,300 DOP, Team of 4 $1,000 DOP

MEMBERSHIPS:
- The membership system is coming soon. If users ask about memberships, let them know it's coming soon and that they can reach out via WhatsApp at +${whatsapp} for any questions.

CLUB KNOWLEDGE BASE:
${knowledge || 'No content available.'}

UPCOMING EVENTS:
${eventsText}`

  // ---------------------------------------------------------------------------
  // OpenAI streaming call
  // ---------------------------------------------------------------------------
  const MAX_MSG_LEN = 1000
  const recentMessages = messages.slice(-10).map((m) => ({
    ...m,
    content: typeof m.content === 'string' ? m.content.slice(0, MAX_MSG_LEN) : '',
  }))

  try {
    const completion = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      stream: false,
      max_tokens: 500,
      temperature: 0.7,
      messages: [
        { role: 'system' as const, content: systemPrompt },
        ...recentMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    })

    const text = completion.choices[0]?.message?.content ?? ''

    // Send as SSE to keep the client-side parsing working
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (e) {
    console.error('[chat] Groq API error:', e)
    return NextResponse.json(
      { error: 'api_error', message: 'Nell is unavailable right now. Please try again later.' },
      { status: 500 },
    )
  }
}
