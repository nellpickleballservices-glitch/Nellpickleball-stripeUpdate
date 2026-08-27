'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from './auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { ContentBlock } from '@/lib/types/admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface GroupedContentBlocks {
  home: ContentBlock[]
  about: ContentBlock[]
  learn: ContentBlock[]
  faq: ContentBlock[]
  contact: ContentBlock[]
}

export async function getContentBlocksAction(): Promise<GroupedContentBlocks> {
  await requireAdmin()

  const { data, error } = await supabaseAdmin
    .from('content_blocks')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[cms] getContentBlocks error:', error.message)
    throw new Error('Operation failed')
  }

  const blocks = (data ?? []) as ContentBlock[]
  const grouped: GroupedContentBlocks = { home: [], about: [], learn: [], faq: [], contact: [] }

  for (const block of blocks) {
    if (block.block_key.startsWith('home_')) grouped.home.push(block)
    else if (block.block_key === 'about_values') continue // values rendered by ValuesBanner from translation keys, not CMS
    else if (block.block_key.startsWith('about_')) grouped.about.push(block)
    else if (block.block_key.startsWith('learn_')) grouped.learn.push(block)
    else if (block.block_key.startsWith('faq_')) grouped.faq.push(block)
    else if (block.block_key.startsWith('contact_')) grouped.contact.push(block)
  }

  return grouped
}

export async function updateContentBlockAction(
  blockId: string,
  content_es: string,
  content_en: string
): Promise<{ success: boolean }> {
  await requireAdmin()

  const { error } = await supabaseAdmin
    .from('content_blocks')
    .update({
      content_es,
      content_en,
      updated_at: new Date().toISOString(),
    })
    .eq('id', blockId)

  if (error) {
    console.error('[cms] updateContentBlock error:', error.message)
    throw new Error('Operation failed')
  }

  // Trigger ISR cache invalidation so public pages see fresh content
  revalidatePath('/')

  return { success: true }
}

/**
 * Reorder content blocks atomically using batch RPC.
 * Replaces sequential N+1 update loop with a single database call.
 */
export async function reorderContentBlocksAction(
  blockIds: string[]
): Promise<{ success: boolean }> {
  await requireAdmin()

  if (blockIds.length > 200) {
    throw new Error('Operation failed')
  }
  if (!blockIds.every((id) => UUID_RE.test(id))) {
    throw new Error('Operation failed')
  }

  const { error } = await supabaseAdmin.rpc('batch_reorder_content_blocks', {
    items: blockIds.map((id, i) => ({ id, sort_order: i + 1 }))
  })

  if (error) {
    console.error('[cms] reorderContentBlocks error:', error.message)
    throw new Error('Operation failed')
  }
  return { success: true }
}
