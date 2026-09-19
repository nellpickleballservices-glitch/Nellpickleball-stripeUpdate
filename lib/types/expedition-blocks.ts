export type HeadingLevel = 1 | 2 | 3
export type Side = 'left' | 'right'
export type GalleryColumns = 2 | 3
export type LinkStyle = 'button' | 'text'
export type BlockVisibility = 'public' | 'paid'

export type Block =
  | { id: string; type: 'heading'; level: HeadingLevel; text: string; visibility?: BlockVisibility }
  | { id: string; type: 'paragraph'; text: string; visibility?: BlockVisibility }
  | { id: string; type: 'image'; url: string; caption: string; visibility?: BlockVisibility }
  | { id: string; type: 'image_text'; url: string; text: string; side: Side; caption: string; visibility?: BlockVisibility }
  | { id: string; type: 'gallery'; columns: GalleryColumns; images: { url: string; caption: string }[]; visibility?: BlockVisibility }
  | { id: string; type: 'quote'; text: string; author: string; visibility?: BlockVisibility }
  | { id: string; type: 'link'; text: string; url: string; style: LinkStyle; newTab: boolean; visibility?: BlockVisibility }
  | { id: string; type: 'divider'; visibility?: BlockVisibility }

export type BlockType = Block['type']

export function parseBlocks(raw: string | null | undefined): Block[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Block[]) : []
  } catch {
    return []
  }
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}

export function createBlock(type: BlockType): Block {
  switch (type) {
    case 'heading':     return { id: newId(), type, level: 2, text: '' }
    case 'paragraph':   return { id: newId(), type, text: '' }
    case 'image':       return { id: newId(), type, url: '', caption: '' }
    case 'image_text':  return { id: newId(), type, url: '', text: '', side: 'left', caption: '' }
    case 'gallery':     return { id: newId(), type, columns: 3, images: [] }
    case 'quote':       return { id: newId(), type, text: '', author: '' }
    case 'link':        return { id: newId(), type, text: '', url: '', style: 'button', newTab: true }
    case 'divider':     return { id: newId(), type }
  }
}
