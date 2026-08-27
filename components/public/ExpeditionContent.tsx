import Image from 'next/image'
import type { Block } from '@/lib/types/expedition-blocks'

export function ExpeditionContent({ blocks }: { blocks: Block[] }) {
  if (blocks.length === 0) return null

  return (
    <div className="space-y-10">
      {blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </div>
  )
}

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading': {
      const Tag = (`h${block.level}` as 'h1' | 'h2' | 'h3')
      const sizeCls =
        block.level === 1 ? 'text-3xl md:text-4xl' :
        block.level === 2 ? 'text-2xl md:text-3xl' :
        'text-xl md:text-2xl'
      return (
        <Tag className={`font-bungee text-midnight mt-4 ${sizeCls}`}>
          {block.text}
        </Tag>
      )
    }

    case 'paragraph':
      return <p className="text-slate text-lg leading-relaxed whitespace-pre-line">{block.text}</p>

    case 'image':
      if (!block.url) return null
      return (
        <figure className="space-y-2 px-2 sm:px-4">
          {/* Center horizontally + cap height so the image never dominates
              the page. `w-auto h-auto` lets Next/Image use its native ratio. */}
          <div className="flex justify-center">
            <Image
              src={block.url}
              alt={block.caption || ''}
              width={1600}
              height={1000}
              sizes="(max-width: 768px) 100vw, 800px"
              className="max-w-full max-h-[600px] w-auto h-auto rounded-xl shadow-lg object-contain"
            />
          </div>
          {block.caption && (
            <figcaption className="text-sm text-slate/70 italic text-center">{block.caption}</figcaption>
          )}
        </figure>
      )

    case 'image_text': {
      if (!block.url && !block.text) return null
      const imageCol = (
        <figure className="space-y-2 px-2">
          {block.url && (
            <div className="flex justify-center">
              <Image
                src={block.url}
                alt={block.caption || ''}
                width={1200}
                height={900}
                sizes="(max-width: 768px) 100vw, 400px"
                className="max-w-full max-h-[500px] w-auto h-auto rounded-xl shadow-lg object-contain"
              />
            </div>
          )}
          {block.caption && (
            <figcaption className="text-sm text-slate/70 italic text-center">{block.caption}</figcaption>
          )}
        </figure>
      )
      const textCol = (
        <div className="text-slate text-lg leading-relaxed whitespace-pre-line self-center">
          {block.text}
        </div>
      )
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {block.side === 'left' ? (
            <>{imageCol}{textCol}</>
          ) : (
            <>{textCol}{imageCol}</>
          )}
        </div>
      )
    }

    case 'gallery': {
      const visible = block.images.filter((img) => img.url)
      if (visible.length === 0) return null
      const gridCls = block.columns === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-2 md:grid-cols-3'
      return (
        <div className={`grid ${gridCls} gap-4`}>
          {visible.map((img, i) => (
            <figure key={i} className="space-y-1">
              {/* aspect-[4/3] keeps the grid tidy; object-contain + padding
                  shows the WHOLE image (no center-crop), with a soft tint
                  filling any letterbox space. */}
              <div className="relative w-full aspect-[4/3] overflow-hidden rounded-lg shadow bg-slate/5">
                <Image
                  src={img.url}
                  alt={img.caption || ''}
                  fill
                  sizes={block.columns === 2 ? '(max-width: 640px) 100vw, 50vw' : '(max-width: 640px) 50vw, 33vw'}
                  className="object-contain p-2"
                />
              </div>
              {img.caption && (
                <figcaption className="text-xs text-slate/70 italic text-center">{img.caption}</figcaption>
              )}
            </figure>
          ))}
        </div>
      )
    }

    case 'quote':
      if (!block.text) return null
      return (
        <blockquote className="border-l-4 border-[#38BDF8] bg-[#38BDF8]/5 pl-6 py-4 rounded-r-lg">
          <p className="text-slate text-xl italic leading-relaxed">"{block.text}"</p>
          {block.author && (
            <footer className="mt-3 text-sm text-slate/70 not-italic">— {block.author}</footer>
          )}
        </blockquote>
      )

    case 'link': {
      if (!block.url || !block.text) return null
      const isExternal = /^https?:\/\//i.test(block.url)
      const target = block.newTab ? '_blank' : undefined
      const rel = block.newTab && isExternal ? 'noopener noreferrer' : undefined
      const baseCls =
        block.style === 'button'
          ? 'inline-flex items-center gap-2 px-6 py-3 rounded-full font-bungee text-sm bg-lime text-midnight hover:opacity-90 transition-opacity shadow-md'
          : 'inline-flex items-center gap-1 text-[#0284C7] font-medium hover:underline'
      return (
        <div className={block.style === 'button' ? 'flex justify-center' : ''}>
          <a href={block.url} target={target} rel={rel} className={baseCls}>
            {block.text}
            {isExternal && block.newTab && (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clipRule="evenodd" />
              </svg>
            )}
          </a>
        </div>
      )
    }

    case 'divider':
      return (
        <hr className="border-0 h-px bg-gradient-to-r from-transparent via-slate/30 to-transparent" />
      )
  }
}
