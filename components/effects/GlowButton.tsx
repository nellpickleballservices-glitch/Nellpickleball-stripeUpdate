'use client'

import Link from 'next/link'
import { m } from 'motion/react'
import type { ReactNode } from 'react'

interface GlowButtonProps {
  href: string
  children: ReactNode
  variant?: 'lime' | 'sunset'
  size?: 'sm' | 'md'
  className?: string
}

/**
 * CTA button with animated glow ring and hover scale.
 * The glow pulses subtly to draw attention.
 */
export function GlowButton({
  href,
  children,
  variant = 'lime',
  size = 'md',
  className = '',
}: GlowButtonProps) {
  const isLime = variant === 'lime'
  const sizeCls = size === 'sm' ? 'py-2.5 px-7 text-sm' : 'py-4 px-12 text-lg'

  return (
    <m.div
      className="relative inline-block group"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {/* Animated glow ring */}
      <div
        className={`absolute -inset-1 rounded-full blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-500 ${
          isLime
            ? 'bg-gradient-to-r from-lime via-electric to-lime'
            : 'bg-gradient-to-r from-sunset via-orange-400 to-sunset'
        }`}
        style={{
          animation: 'glow-pulse 3s ease-in-out infinite',
        }}
      />

      <Link
        href={href}
        className={`relative inline-block font-bold rounded-full whitespace-nowrap tracking-wide transition-all duration-200 ${sizeCls} ${
          isLime
            ? 'bg-lime text-white hover:bg-electric'
            : 'bg-sunset text-offwhite hover:bg-orange-500'
        } ${className}`}
      >
        {children}
      </Link>
    </m.div>
  )
}
