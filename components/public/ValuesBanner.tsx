import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

function HeartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  )
}

function AccessIcon() {
  // PNG ships with its own colors so the parent `text-*` class doesn't tint it.
  // Attribution lives in the footer (created by icon_small / Flaticon).
  return (
    <Image
      src="/images/icons/values_icons/accessibility.png"
      alt=""
      width={24}
      height={24}
      className="w-full h-full object-contain"
    />
  )
}

function BoltIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
  )
}

function CommunityIcon() {
  // PNG ships with its own colors so the parent `text-*` class doesn't tint it.
  // Attribution lives in the footer (created by Freepik / Flaticon).
  return (
    <Image
      src="/images/icons/values_icons/fair-trade.png"
      alt=""
      width={24}
      height={24}
      className="w-full h-full object-contain"
    />
  )
}

function SparklesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576L1.323 12.22a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 006.745 7.39l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" />
    </svg>
  )
}

const VALUES = [
  { key: 'Love',       icon: <HeartIcon />,      color: 'text-lime' },
  { key: 'Access',     icon: <AccessIcon />,     color: 'text-turquoise' },
  { key: 'Discipline', icon: <BoltIcon />,       color: 'text-sunset' },
  { key: 'Respect',    icon: <ShieldIcon />,     color: 'text-lime' },
  { key: 'Community',  icon: <CommunityIcon />,  color: 'text-turquoise' },
  { key: 'Integrity',  icon: <SparklesIcon />,   color: 'text-sunset' },
] as const

export async function ValuesBanner() {
  const t = await getTranslations('Public')

  return (
    <section className="relative w-full h-[120px] bg-midnight border-y border-charcoal overflow-hidden">
      {/* Subtle gradient accent hairlines at top + bottom */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sunset/50 to-transparent" />

      <div className="relative h-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 flex flex-col items-center justify-center gap-3">
        {/* Title */}
        <div className="flex flex-col items-center">
          <h2 className="font-bebas-neue text-xl sm:text-2xl tracking-[0.3em] uppercase text-offwhite leading-none">
            {t('aboutValuesTitle')}
          </h2>
          <div className="w-12 h-px bg-gradient-to-r from-lime/60 via-electric/60 to-sunset/60 mt-1.5" />
        </div>

        {/* Mobile (<md): right-to-left marquee with fade-edges. Values are duplicated so the loop is seamless. */}
        <div
          className="md:hidden w-screen relative -mx-6 sm:-mx-12 overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
          }}
        >
          <ul className="flex w-max items-center gap-6 animate-marquee" aria-hidden="false">
            {[...VALUES, ...VALUES].map((v, i) => (
              <li key={`${v.key}-${i}`} className="flex items-center gap-2 shrink-0">
                <div className={`w-4 h-4 shrink-0 ${v.color}`} aria-hidden="true">
                  {v.icon}
                </div>
                <span className="font-bungee text-xs text-offwhite tracking-wide uppercase whitespace-nowrap">
                  {t(`aboutValue${v.key}Title`)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Desktop (md+): static, evenly-spaced row */}
        <ul className="hidden md:flex w-full items-center justify-center gap-6 lg:gap-8">
          {VALUES.map((v) => (
            <li key={v.key} className="flex items-center gap-2 shrink-0">
              <div className={`w-5 h-5 shrink-0 ${v.color}`} aria-hidden="true">
                {v.icon}
              </div>
              <span className="font-bungee text-sm text-offwhite tracking-wide uppercase whitespace-nowrap">
                {t(`aboutValue${v.key}Title`)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
