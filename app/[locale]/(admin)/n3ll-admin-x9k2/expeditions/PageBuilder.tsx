'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { uploadExpeditionImageAction } from '@/app/actions/admin/expeditions'
import { compressImage } from '@/lib/image-compress'
import { type Block, type BlockType, type HeadingLevel, type GalleryColumns, type LinkStyle, createBlock } from '@/lib/types/expedition-blocks'

/** Upload a single image file and return its public URL. */
export type UploadImageFn = (formData: FormData) => Promise<{ url: string }>

interface PageBuilderProps {
  blocks: Block[]
  onChange: (blocks: Block[]) => void
  /**
   * Which storage bucket uploaded images land in. Defaults to expeditions;
   * sessions pass their own so the two don't share a bucket.
   */
  uploadImage?: UploadImageFn
}

const BLOCK_TYPES: { type: BlockType; labelKey: string }[] = [
  { type: 'heading',    labelKey: 'blockHeading' },
  { type: 'paragraph',  labelKey: 'blockParagraph' },
  { type: 'image',      labelKey: 'blockImage' },
  { type: 'image_text', labelKey: 'blockImageText' },
  { type: 'gallery',    labelKey: 'blockGallery' },
  { type: 'quote',      labelKey: 'blockQuote' },
  { type: 'link',       labelKey: 'blockLink' },
  { type: 'divider',    labelKey: 'blockDivider' },
]

export function PageBuilder({
  blocks,
  onChange,
  uploadImage = uploadExpeditionImageAction,
}: PageBuilderProps) {
  const t = useTranslations('Admin')
  const [adding, setAdding] = useState(false)

  function addBlock(type: BlockType) {
    onChange([...blocks, createBlock(type)])
    setAdding(false)
  }

  function updateBlock(id: string, patch: Partial<Block>) {
    onChange(blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)))
  }

  function removeBlock(id: string) {
    onChange(blocks.filter((b) => b.id !== id))
  }

  function moveBlock(id: string, delta: -1 | 1) {
    const idx = blocks.findIndex((b) => b.id === id)
    const target = idx + delta
    if (idx === -1 || target < 0 || target >= blocks.length) return
    const next = [...blocks]
    const [item] = next.splice(idx, 1)
    next.splice(target, 0, item)
    onChange(next)
  }

  return (
    <div className="space-y-4">
      {blocks.length === 0 && (
        <p className="text-sm text-gray-500 italic text-center py-6 border border-dashed border-gray-300 rounded-lg bg-white">
          {t('pageBuilderEmpty')}
        </p>
      )}

      {blocks.map((block, i) => (
        <BlockCard
          key={block.id}
          block={block}
          isFirst={i === 0}
          isLast={i === blocks.length - 1}
          uploadImage={uploadImage}
          onUpdate={(patch) => updateBlock(block.id, patch)}
          onRemove={() => removeBlock(block.id)}
          onMoveUp={() => moveBlock(block.id, -1)}
          onMoveDown={() => moveBlock(block.id, 1)}
        />
      ))}

      <div className="relative">
        {adding ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3 rounded-lg border border-gray-300 bg-white shadow-sm">
            {BLOCK_TYPES.map((bt) => (
              <button
                key={bt.type}
                type="button"
                onClick={() => addBlock(bt.type)}
                className="px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-300 rounded transition-colors"
              >
                {t(bt.labelKey)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900"
            >
              {t('cancel')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full px-4 py-3 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-dashed border-blue-300 rounded-lg transition-colors"
          >
            + {t('pageBuilderAddBlock')}
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Per-block editor card
// ─────────────────────────────────────────────────────────────────────────

interface BlockCardProps {
  block: Block
  isFirst: boolean
  isLast: boolean
  uploadImage: UploadImageFn
  onUpdate: (patch: Partial<Block>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function BlockCard({ block, isFirst, isLast, uploadImage, onUpdate, onRemove, onMoveUp, onMoveDown }: BlockCardProps) {
  const t = useTranslations('Admin')

  return (
    <div className="rounded-lg border border-gray-300 bg-white shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <span className="text-xs font-semibold text-midnight uppercase tracking-widest">
          {t(`block_${block.type}`)}
        </span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onMoveUp} disabled={isFirst} aria-label="Move up"
            className="grid place-items-center w-7 h-7 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">↑</button>
          <button type="button" onClick={onMoveDown} disabled={isLast} aria-label="Move down"
            className="grid place-items-center w-7 h-7 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">↓</button>
          <button type="button" onClick={onRemove} aria-label="Remove"
            className="grid place-items-center w-7 h-7 rounded text-red-600 hover:text-red-700 hover:bg-red-50">×</button>
        </div>
      </div>
      <div className="p-4">
        <BlockEditor block={block} onUpdate={onUpdate} uploadImage={uploadImage} />
      </div>
    </div>
  )
}

const fieldCls = 'bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none'
const inputCls = `${fieldCls} w-full`
const labelCls = 'block text-xs text-gray-600 mb-1'

function BlockEditor({
  block,
  onUpdate,
  uploadImage,
}: {
  block: Block
  onUpdate: (patch: Partial<Block>) => void
  uploadImage: UploadImageFn
}) {
  switch (block.type) {
    case 'heading':
      return (
        <div className="flex gap-3">
          <select
            value={block.level}
            onChange={(e) => onUpdate({ level: Number(e.target.value) as HeadingLevel } as Partial<Block>)}
            className={`${fieldCls} w-24 shrink-0`}
          >
            <option value={1}>H1</option>
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <input
            type="text"
            value={block.text}
            onChange={(e) => onUpdate({ text: e.target.value } as Partial<Block>)}
            placeholder="Heading text"
            className={`${fieldCls} flex-1 min-w-0`}
          />
        </div>
      )

    case 'paragraph':
      return (
        <textarea
          value={block.text}
          onChange={(e) => onUpdate({ text: e.target.value } as Partial<Block>)}
          rows={4}
          placeholder="Paragraph text..."
          className={inputCls}
        />
      )

    case 'image':
      return (
        <div className="space-y-3">
          <ImageInput
            url={block.url}
            uploadImage={uploadImage}
            onChange={(url) => onUpdate({ url } as Partial<Block>)}
          />
          <input
            type="text"
            value={block.caption}
            onChange={(e) => onUpdate({ caption: e.target.value } as Partial<Block>)}
            placeholder="Caption (optional)"
            className={inputCls}
          />
        </div>
      )

    case 'image_text':
      return (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onUpdate({ side: 'left' } as Partial<Block>)}
              className={`px-3 py-1.5 text-xs rounded border ${block.side === 'left' ? 'bg-blue-50 text-blue-700 border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              Image Left
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ side: 'right' } as Partial<Block>)}
              className={`px-3 py-1.5 text-xs rounded border ${block.side === 'right' ? 'bg-blue-50 text-blue-700 border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              Image Right
            </button>
          </div>
          <ImageInput
            url={block.url}
            uploadImage={uploadImage}
            onChange={(url) => onUpdate({ url } as Partial<Block>)}
          />
          <input
            type="text"
            value={block.caption}
            onChange={(e) => onUpdate({ caption: e.target.value } as Partial<Block>)}
            placeholder="Image caption (optional)"
            className={inputCls}
          />
          <textarea
            value={block.text}
            onChange={(e) => onUpdate({ text: e.target.value } as Partial<Block>)}
            rows={5}
            placeholder="Text content..."
            className={inputCls}
          />
        </div>
      )

    case 'gallery':
      return <GalleryEditor block={block} onUpdate={onUpdate} uploadImage={uploadImage} />

    case 'quote':
      return (
        <div className="space-y-3">
          <textarea
            value={block.text}
            onChange={(e) => onUpdate({ text: e.target.value } as Partial<Block>)}
            rows={3}
            placeholder="Quote text..."
            className={inputCls}
          />
          <input
            type="text"
            value={block.author}
            onChange={(e) => onUpdate({ author: e.target.value } as Partial<Block>)}
            placeholder="Author (optional)"
            className={inputCls}
          />
        </div>
      )

    case 'link':
      return (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Button Text</label>
            <input
              type="text"
              value={block.text}
              onChange={(e) => onUpdate({ text: e.target.value } as Partial<Block>)}
              placeholder="e.g. Reserve your spot"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>URL</label>
            <input
              type="url"
              value={block.url}
              onChange={(e) => onUpdate({ url: e.target.value } as Partial<Block>)}
              placeholder="https://..."
              className={inputCls}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-gray-600">Style:</span>
            {(['button', 'text'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onUpdate({ style: s as LinkStyle } as Partial<Block>)}
                className={`px-3 py-1 text-xs rounded border ${block.style === s ? 'bg-blue-50 text-blue-700 border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                {s === 'button' ? 'Button' : 'Text Link'}
              </button>
            ))}
            <label className="ml-auto inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={block.newTab}
                onChange={(e) => onUpdate({ newTab: e.target.checked } as Partial<Block>)}
                className="w-4 h-4 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500"
              />
              Open in new tab
            </label>
          </div>
        </div>
      )

    case 'divider':
      return <p className="text-xs text-gray-500 italic">A horizontal divider will appear here.</p>
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Image upload helper
// ─────────────────────────────────────────────────────────────────────────

function ImageInput({
  url,
  onChange,
  uploadImage,
}: {
  url: string
  onChange: (url: string) => void
  uploadImage: UploadImageFn
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setFeedback(null)
    try {
      const optimized = await compressImage(file)
      const fd = new FormData()
      fd.append('file', optimized)
      const { url: uploadedUrl } = await uploadImage(fd)
      onChange(uploadedUrl)
    } catch {
      setFeedback('Upload failed.')
      setTimeout(() => setFeedback(null), 3000)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... or upload below"
          className={inputCls}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0 px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          {uploading ? '...' : 'Upload'}
        </button>
      </div>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full max-w-xs h-32 object-cover rounded border border-gray-300" />
      )}
      {feedback && <p className="text-xs text-red-600">{feedback}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Gallery sub-editor
// ─────────────────────────────────────────────────────────────────────────

function GalleryEditor({
  block,
  onUpdate,
  uploadImage,
}: {
  block: Extract<Block, { type: 'gallery' }>
  onUpdate: (patch: Partial<Block>) => void
  uploadImage: UploadImageFn
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    try {
      const newImages = [...block.images]
      for (const file of files) {
        const optimized = await compressImage(file)
        const fd = new FormData()
        fd.append('file', optimized)
        const { url } = await uploadImage(fd)
        newImages.push({ url, caption: '' })
      }
      onUpdate({ images: newImages } as Partial<Block>)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function updateImage(index: number, patch: Partial<{ url: string; caption: string }>) {
    const next = block.images.map((img, i) => (i === index ? { ...img, ...patch } : img))
    onUpdate({ images: next } as Partial<Block>)
  }

  function removeImage(index: number) {
    onUpdate({ images: block.images.filter((_, i) => i !== index) } as Partial<Block>)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-600">Columns:</label>
        {([2, 3] as const).map((cols) => (
          <button
            key={cols}
            type="button"
            onClick={() => onUpdate({ columns: cols as GalleryColumns } as Partial<Block>)}
            className={`px-3 py-1 text-xs rounded border ${block.columns === cols ? 'bg-blue-50 text-blue-700 border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            {cols}
          </button>
        ))}
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFiles}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="ml-auto px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : '+ Add Images'}
        </button>
      </div>

      {block.images.length === 0 ? (
        <p className="text-xs text-gray-500 italic">No images yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {block.images.map((img, i) => (
            <div key={i} className="rounded border border-gray-300 bg-gray-50 p-2 space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="w-full h-24 object-cover rounded" />
              <input
                type="text"
                value={img.caption}
                onChange={(e) => updateImage(i, { caption: e.target.value })}
                placeholder="Caption"
                className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="w-full text-xs text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
