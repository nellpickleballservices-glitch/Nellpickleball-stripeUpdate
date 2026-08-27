'use server'

import OpenAI from 'openai'
import { requireAdmin } from './auth'
import type { Block } from '@/lib/types/expedition-blocks'

export interface TranslatePayload {
  source: 'es' | 'en'
  title: string
  description: string
  blocks: Block[]
}

export interface TranslateResult {
  title: string
  description: string
  blocks: Block[]
}

/**
 * Translates the text fields of an expedition (title, short description,
 * and every block's text/caption/button label) to the opposite language.
 * Images, URLs, layout, link styles, gallery columns, etc. are preserved
 * exactly. Block IDs are also preserved so the result merges cleanly with
 * the existing structure.
 *
 * Uses OpenAI's JSON mode for reliable structured output.
 */
export async function translateExpeditionContentAction(
  payload: TranslatePayload,
): Promise<TranslateResult> {
  await requireAdmin()

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const target: 'es' | 'en' = payload.source === 'es' ? 'en' : 'es'

  // Pull every translatable string into a flat array of {key, value} pairs
  // so the LLM only has to translate strings, not understand block shapes.
  const items: { key: string; value: string }[] = []
  if (payload.title?.trim()) items.push({ key: 'title', value: payload.title })
  if (payload.description?.trim()) items.push({ key: 'description', value: payload.description })

  payload.blocks.forEach((block, bIndex) => {
    if ('text' in block && typeof block.text === 'string' && block.text.trim()) {
      items.push({ key: `block.${bIndex}.text`, value: block.text })
    }
    if ('caption' in block && typeof block.caption === 'string' && block.caption.trim()) {
      items.push({ key: `block.${bIndex}.caption`, value: block.caption })
    }
    if (block.type === 'gallery') {
      block.images.forEach((img, iIndex) => {
        if (img.caption?.trim()) {
          items.push({ key: `block.${bIndex}.image.${iIndex}.caption`, value: img.caption })
        }
      })
    }
  })

  if (items.length === 0) {
    // Nothing to translate — just return the input untouched.
    return {
      title: payload.title,
      description: payload.description,
      blocks: payload.blocks,
    }
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const sourceName = payload.source === 'es' ? 'Spanish' : 'English'
  const targetName = target === 'es' ? 'Spanish' : 'English'

  const systemPrompt = [
    `You translate website copy for a pickleball club's expedition pages.`,
    `Source language: ${sourceName}. Target language: ${targetName}.`,
    ``,
    `Rules:`,
    `- Keep tone friendly, concise, and slightly upbeat — this is marketing copy.`,
    `- Preserve any URLs, hashtags, dates, prices, and proper nouns exactly.`,
    `- Preserve line breaks in multi-line strings.`,
    `- Do NOT add or remove items. The output must have the exact same keys as the input.`,
    `- Return only valid JSON with the shape: { "items": [{ "key": string, "value": string }] }.`,
  ].join('\n')

  const userPrompt = JSON.stringify({ items }, null, 2)

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature: 0.2,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  const raw = completion.choices[0]?.message?.content
  if (!raw) throw new Error('Translation returned no content')

  let parsed: { items?: { key: string; value: string }[] }
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Translation returned invalid JSON')
  }

  const translated = new Map<string, string>()
  for (const item of parsed.items ?? []) {
    if (typeof item.key === 'string' && typeof item.value === 'string') {
      translated.set(item.key, item.value)
    }
  }

  // Re-assemble the result, falling back to the original string if the
  // model dropped a key for any reason.
  const nextTitle = translated.get('title') ?? payload.title
  const nextDescription = translated.get('description') ?? payload.description

  const nextBlocks: Block[] = payload.blocks.map((block, bIndex) => {
    const copy: Block = JSON.parse(JSON.stringify(block))

    if ('text' in copy && typeof copy.text === 'string' && copy.text.trim()) {
      copy.text = translated.get(`block.${bIndex}.text`) ?? copy.text
    }
    if ('caption' in copy && typeof copy.caption === 'string' && copy.caption.trim()) {
      copy.caption = translated.get(`block.${bIndex}.caption`) ?? copy.caption
    }
    if (copy.type === 'gallery') {
      copy.images = copy.images.map((img, iIndex) => ({
        ...img,
        caption: img.caption?.trim()
          ? translated.get(`block.${bIndex}.image.${iIndex}.caption`) ?? img.caption
          : img.caption,
      }))
    }

    return copy
  })

  return {
    title: nextTitle,
    description: nextDescription,
    blocks: nextBlocks,
  }
}
