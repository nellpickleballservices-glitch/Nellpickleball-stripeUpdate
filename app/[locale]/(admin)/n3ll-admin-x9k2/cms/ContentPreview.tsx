'use client'

import { useMemo } from 'react'
import DOMPurify from 'dompurify'
import { useTranslations } from 'next-intl'

const ALLOWED_TAGS = ['p', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'code', 'pre', 'br']
const ALLOWED_ATTR = ['href', 'target', 'rel']

interface ContentPreviewProps {
  html: string
}

export function ContentPreview({ html }: ContentPreviewProps) {
  const t = useTranslations('Admin')
  const sanitized = useMemo(
    () => DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR }),
    [html],
  )

  return (
    <div>
      <p className="text-xs text-gray-600 mb-2 font-medium">{t('preview')}</p>
      <div
        className="bg-offwhite text-charcoal p-6 rounded-lg prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    </div>
  )
}
