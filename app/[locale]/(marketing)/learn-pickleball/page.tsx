import { getLocale, getTranslations } from 'next-intl/server'
import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { HeroEntrance } from '@/components/motion/HeroEntrance'
import { TableOfContents } from '@/components/public/TableOfContents'
import { CourtDiagram } from '@/components/public/CourtDiagram'
import { SubpageHeroAccents } from '@/components/effects/SubpageHeroAccents'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const t = await getTranslations('Public')

  return {
    title: t('learnMetaTitle'),
    description: t('learnMetaDescription'),
    openGraph: {
      title: t('learnMetaTitle'),
      description: t('learnMetaDescription'),
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'es_DO',
      images: [{ url: '/images/siteImages/players_in_action.jpeg', width: 1200, height: 630, alt: 'NELL Pickleball Club' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('learnMetaTitle'),
      description: t('learnMetaDescription'),
      images: ['/images/siteImages/players_in_action.jpeg'],
    },
    alternates: {
      canonical: `/${locale}/learn-pickleball`,
      languages: {
        en: '/en/learn-pickleball',
        es: '/es/learn-pickleball',
      },
    },
  }
}

/* ─── Static content by locale ─── */

const content = {
  en: {
    heroTitle: 'Learn Pickleball',
    heroSub:
      'Everything you need to know about the fastest-growing sport in the world.',
    sections: [
      { id: 'what', label: 'What is Pickleball?' },
      { id: 'origin', label: 'History & Origin' },
      { id: 'rules', label: 'Basic Rules' },
      { id: 'scoring', label: 'Scoring' },
      { id: 'court', label: 'Court Dimensions' },
      { id: 'equipment', label: 'Equipment' },
      { id: 'shots', label: 'Essential Shots' },
      { id: 'strategy', label: 'Strategy & Tips' },
      { id: 'etiquette', label: 'Court Etiquette' },
      { id: 'faq', label: 'FAQ' },
    ],
  },
  es: {
    heroTitle: 'Aprende Pickleball',
    heroSub:
      'Todo lo que necesitas saber sobre el deporte de más rápido crecimiento en el mundo.',
    sections: [
      { id: 'what', label: '¿Qué es el Pickleball?' },
      { id: 'origin', label: 'Historia y Origen' },
      { id: 'rules', label: 'Reglas Básicas' },
      { id: 'scoring', label: 'Puntuación' },
      { id: 'court', label: 'Dimensiones de la Cancha' },
      { id: 'equipment', label: 'Equipamiento' },
      { id: 'shots', label: 'Golpes Esenciales' },
      { id: 'strategy', label: 'Estrategia y Consejos' },
      { id: 'etiquette', label: 'Etiqueta en la Cancha' },
      { id: 'faq', label: 'Preguntas Frecuentes' },
    ],
  },
}

/* ─── Stat Card ─── */

function StatCard({
  value,
  label,
}: {
  value: string
  label: string
}) {
  return (
    <div className="bg-charcoal/60 border border-charcoal rounded-xl p-5 text-center">
      <div className="font-bebas-neue text-3xl sm:text-4xl gradient-text-static inline-block mb-1">
        {value}
      </div>
      <div className="text-white/90 text-sm">{label}</div>
    </div>
  )
}

/* ─── Info Card ─── */

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="bg-charcoal/40 border border-charcoal rounded-xl p-5 hover:border-lime/30 transition-colors">
      <div className="text-2xl mb-3">{icon}</div>
      <h4 className="text-offwhite font-semibold text-base mb-2">{title}</h4>
      <p className="text-white/90 text-sm leading-relaxed">{description}</p>
    </div>
  )
}

/* ─── Section wrapper ─── */

function SectionHeading({ label }: { label: string }) {
  return (
    <h2 className="font-bebas-neue text-4xl sm:text-5xl text-offwhite tracking-widest mb-6">
      <span className="gradient-text-static inline-block">|</span> {label}
    </h2>
  )
}

/* ─── Page ─── */

export default async function LearnPickleballPage() {
  const locale = await getLocale()
  const t = locale === 'en' ? content.en : content.es
  const isEn = locale === 'en'

  return (
    <main className="min-h-screen bg-midnight">
      {/* ━━━ Hero ━━━ */}
      <section className="relative flex flex-col items-center justify-center py-32 px-6 text-center overflow-hidden">
        <SubpageHeroAccents />

        <HeroEntrance className="relative z-10 flex flex-col items-center">
          <h1 className="font-bebas-neue text-[clamp(3rem,10vw,7rem)] leading-none tracking-widest gradient-text mb-4 inline-block">
            {t.heroTitle}
          </h1>
          <p className="text-white text-base sm:text-lg max-w-xl leading-relaxed mb-8">
            {t.heroSub}
          </p>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl w-full">
            <StatCard
              value={isEn ? '36M+' : '36M+'}
              label={isEn ? 'Players in the US' : 'Jugadores en EE.UU.'}
            />
            <StatCard
              value={isEn ? '#1' : '#1'}
              label={isEn ? 'Fastest Growing Sport' : 'Deporte de Mayor Crecimiento'}
            />
            <StatCard
              value={isEn ? '1965' : '1965'}
              label={isEn ? 'Year Invented' : 'Año de Invención'}
            />
            <StatCard
              value={isEn ? '70+' : '70+'}
              label={isEn ? 'Countries Playing' : 'Países que lo Juegan'}
            />
          </div>
        </HeroEntrance>
      </section>

      {/* ━━━ Content + TOC ━━━ */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8">
          <TableOfContents sections={t.sections} />

          <div className="flex-1 min-w-0">
            {/* ─── What is Pickleball? ─── */}
            <div id="what" className="mb-20 scroll-mt-24">
              <ScrollReveal>
                <SectionHeading label={t.sections[0].label} />

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <p className="text-white text-base leading-relaxed mb-4">
                      {isEn
                        ? 'Pickleball is a dynamic paddle sport that combines elements of tennis, badminton, and table tennis. Played on a court roughly one-third the size of a tennis court, it uses a perforated polymer ball and solid paddles made from composite materials.'
                        : 'El pickleball es un deporte dinámico de paleta que combina elementos del tenis, bádminton y tenis de mesa. Se juega en una cancha de aproximadamente un tercio del tamaño de una cancha de tenis, utilizando una pelota de polímero perforada y paletas sólidas de materiales compuestos.'}
                    </p>
                    <p className="text-white text-base leading-relaxed mb-4">
                      {isEn
                        ? 'The sport is accessible to players of all ages and skill levels, making it perfect for families, seniors, and competitive athletes alike. Games are typically played to 11 points (win by 2) and can be enjoyed as singles or doubles.'
                        : 'El deporte es accesible para jugadores de todas las edades y niveles, lo que lo hace perfecto para familias, adultos mayores y atletas competitivos por igual. Los juegos generalmente se juegan a 11 puntos (ganar por 2) y se pueden disfrutar en individuales o dobles.'}
                    </p>
                    <p className="text-white text-base leading-relaxed">
                      {isEn
                        ? 'What makes pickleball special is its low barrier to entry — most beginners can rally within minutes — while still offering deep strategic play for advanced competitors.'
                        : 'Lo que hace especial al pickleball es su baja barrera de entrada — la mayoría de los principiantes pueden pelotear en minutos — mientras ofrece un juego estratégico profundo para competidores avanzados.'}
                    </p>
                  </div>
                  <div className="relative w-full overflow-hidden rounded-2xl aspect-video">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/siteImages/players_in_action.jpeg"
                      alt={isEn ? 'Players in action' : 'Jugadores en acción'}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                </div>

                {/* Why people love it */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <InfoCard
                    icon="👥"
                    title={isEn ? 'Social & Fun' : 'Social y Divertido'}
                    description={
                      isEn
                        ? 'The smaller court size means you\'re always close to your opponents, creating a social atmosphere and natural conversation.'
                        : 'El tamaño reducido de la cancha significa que siempre estás cerca de tus oponentes, creando un ambiente social y conversación natural.'
                    }
                  />
                  <InfoCard
                    icon="🏃"
                    title={isEn ? 'Great Exercise' : 'Gran Ejercicio'}
                    description={
                      isEn
                        ? 'A typical game burns 350-475 calories per hour while being easier on joints than tennis or running.'
                        : 'Un juego típico quema 350-475 calorías por hora mientras es más suave para las articulaciones que el tenis o correr.'
                    }
                  />
                  <InfoCard
                    icon="⚡"
                    title={isEn ? 'Easy to Learn' : 'Fácil de Aprender'}
                    description={
                      isEn
                        ? 'Simple rules and an underhand serve make pickleball one of the easiest racquet sports to pick up.'
                        : 'Reglas simples y un servicio por debajo hacen del pickleball uno de los deportes de raqueta más fáciles de aprender.'
                    }
                  />
                </div>
              </ScrollReveal>
            </div>

            {/* ─── History & Origin ─── */}
            <div id="origin" className="mb-20 scroll-mt-24">
              <ScrollReveal>
                <SectionHeading label={t.sections[1].label} />

                <div className="relative w-full overflow-hidden rounded-2xl aspect-video">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/siteImages/pickleball_history.png"
                    alt={isEn ? 'Historic photo — Bainbridge Island, 1965' : 'Foto histórica — Isla Bainbridge, 1965'}
                    className="w-full h-full object-cover object-center"
                  />
                </div>

                <div className="mt-8 space-y-4">
                  <p className="text-white text-base leading-relaxed">
                    {isEn
                      ? 'Pickleball was invented in the summer of 1965 on Bainbridge Island, Washington, by three fathers — Joel Pritchard, Bill Bell, and Barney McCallum — who were looking for a way to entertain their bored children during a weekend getaway.'
                      : 'El pickleball fue inventado en el verano de 1965 en la Isla Bainbridge, Washington, por tres padres — Joel Pritchard, Bill Bell y Barney McCallum — quienes buscaban una forma de entretener a sus hijos aburridos durante un fin de semana.'}
                  </p>
                  <p className="text-white text-base leading-relaxed">
                    {isEn
                      ? 'They improvised with ping-pong paddles, a perforated plastic ball, and a badminton court with a lowered net. The game was such a hit that the families began crafting official rules, and the sport quickly spread through their community.'
                      : 'Improvisaron con paletas de ping-pong, una pelota de plástico perforada y una cancha de bádminton con una red más baja. El juego fue tan exitoso que las familias comenzaron a crear reglas oficiales, y el deporte se extendió rápidamente por su comunidad.'}
                  </p>
                  <p className="text-white text-base leading-relaxed">
                    {isEn
                      ? 'As for the name? The most popular theory credits Joan Pritchard, Joel\'s wife, who thought the combination of sports reminded her of a "pickle boat" in crew — a boat crewed by leftover rowers from other boats.'
                      : 'En cuanto al nombre, la teoría más popular atribuye el crédito a Joan Pritchard, esposa de Joel, quien pensó que la combinación de deportes le recordaba a un "pickle boat" en remo — un bote tripulado por remeros sobrantes de otros botes.'}
                  </p>
                </div>

                {/* Timeline */}
                <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(isEn
                    ? [
                        { year: '1965', text: 'Invented on Bainbridge Island, WA' },
                        { year: '1972', text: 'First known corporation formed to protect the sport' },
                        { year: '1984', text: 'USA Pickleball Association founded' },
                        { year: '2024', text: '36+ million players in the US alone' },
                      ]
                    : [
                        { year: '1965', text: 'Inventado en la Isla Bainbridge, WA' },
                        { year: '1972', text: 'Primera corporación para proteger el deporte' },
                        { year: '1984', text: 'Fundación de USA Pickleball Association' },
                        { year: '2024', text: '36+ millones de jugadores solo en EE.UU.' },
                      ]
                  ).map((item) => (
                    <div
                      key={item.year}
                      className="bg-charcoal/40 border border-charcoal rounded-xl p-4 border-l-4 border-l-lime"
                    >
                      <div className="font-bebas-neue text-2xl gradient-text-static inline-block mb-1">
                        {item.year}
                      </div>
                      <p className="text-white/90 text-sm">{item.text}</p>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>

            {/* ─── Basic Rules ─── */}
            <div id="rules" className="mb-20 scroll-mt-24">
              <ScrollReveal>
                <SectionHeading label={t.sections[2].label} />

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="relative w-full overflow-hidden rounded-2xl aspect-video">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/siteImages/server.png"
                      alt={isEn ? 'Serve in action' : 'Servicio en acción'}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-offwhite font-semibold text-lg mb-3">
                      {isEn ? 'The Serve' : 'El Servicio'}
                    </h3>
                    <ul className="space-y-2">
                      {(isEn
                        ? [
                            'Must be made underhand with the paddle contacting the ball below the waist',
                            'Served diagonally cross-court, clearing the non-volley zone',
                            'Only one serve attempt is allowed (no "let" re-serves on net serves since 2021)',
                            'The server must keep both feet behind the baseline during the serve',
                          ]
                        : [
                            'Debe hacerse por debajo con la paleta contactando la pelota debajo de la cintura',
                            'Se sirve en diagonal cruzando la cancha, pasando la zona de no volea',
                            'Solo se permite un intento de servicio (sin repeticiones por red desde 2021)',
                            'El servidor debe mantener ambos pies detrás de la línea de base',
                          ]
                      ).map((rule) => (
                        <li key={rule} className="flex items-start gap-2 text-white text-sm leading-relaxed">
                          <span className="text-lime mt-1 shrink-0">&#9656;</span>
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Two-bounce rule & kitchen */}
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="bg-charcoal/40 border border-charcoal rounded-xl p-6">
                    <h3 className="text-offwhite font-semibold text-lg mb-3 flex items-center gap-2">
                      <span className="text-lime text-xl">2x</span>
                      {isEn ? 'Two-Bounce Rule' : 'Regla de Dos Botes'}
                    </h3>
                    <p className="text-white text-sm leading-relaxed">
                      {isEn
                        ? 'After the serve, the receiving side must let the ball bounce once before returning. Then the serving side must also let the return bounce once. After these two bounces, the ball can be volleyed or played off the bounce.'
                        : 'Después del servicio, el lado receptor debe dejar que la pelota bote una vez antes de devolverla. Luego, el lado que sirve también debe dejar que la devolución bote una vez. Después de estos dos botes, la pelota puede ser voleada o jugada después del bote.'}
                    </p>
                  </div>
                  <div className="bg-charcoal/40 border border-charcoal rounded-xl p-6">
                    <h3 className="text-offwhite font-semibold text-lg mb-3 flex items-center gap-2">
                      <span className="text-turquoise text-xl">&#9888;</span>
                      {isEn ? 'The Kitchen (Non-Volley Zone)' : 'La Kitchen (Zona de No Volea)'}
                    </h3>
                    <p className="text-white text-sm leading-relaxed">
                      {isEn
                        ? 'The 7-foot zone on each side of the net is called the "kitchen." Players cannot volley (hit the ball out of the air) while standing in the kitchen. You can enter the kitchen to play a ball that has bounced.'
                        : 'La zona de 7 pies a cada lado de la red se llama la "kitchen." Los jugadores no pueden volear (golpear la pelota en el aire) mientras están parados en la kitchen. Puedes entrar a la kitchen para jugar una pelota que ha botado.'}
                    </p>
                  </div>
                </div>

                {/* Faults */}
                <div className="mt-6 bg-charcoal/40 border border-charcoal rounded-xl p-6">
                  <h3 className="text-offwhite font-semibold text-lg mb-3">
                    {isEn ? 'Common Faults' : 'Faltas Comunes'}
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                    {(isEn
                      ? [
                          'Ball hit out of bounds',
                          'Ball not clearing the net',
                          'Volleying from the kitchen',
                          'Violating the two-bounce rule',
                          'Ball touching a player or their clothing',
                          'Serving to the wrong court',
                        ]
                      : [
                          'Pelota golpeada fuera de los límites',
                          'Pelota que no cruza la red',
                          'Volear desde la kitchen',
                          'Violar la regla de dos botes',
                          'Pelota que toca a un jugador o su ropa',
                          'Servir a la cancha incorrecta',
                        ]
                    ).map((fault) => (
                      <div key={fault} className="flex items-center gap-2 text-white/90 text-sm py-1">
                        <span className="text-danger">&#10005;</span>
                        {fault}
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* ─── Scoring ─── */}
            <div id="scoring" className="mb-20 scroll-mt-24">
              <ScrollReveal>
                <SectionHeading label={t.sections[3].label} />

                <p className="text-white text-base leading-relaxed mb-6">
                  {isEn
                    ? 'Pickleball uses side-out scoring in recreational play (only the serving team can score) and rally scoring in some competitive formats. Here\'s how it works:'
                    : 'El pickleball usa puntuación por cambio de servicio en juego recreativo (solo el equipo que sirve puede anotar) y puntuación por rally en algunos formatos competitivos. Así es como funciona:'}
                </p>

                {/* Score anatomy */}
                <div className="bg-charcoal/60 border border-charcoal rounded-xl p-6 mb-8">
                  <h3 className="text-offwhite font-semibold text-lg mb-4 text-center">
                    {isEn ? 'Reading the Score' : 'Leyendo el Marcador'}
                  </h3>
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <div className="text-center">
                      <div className="font-bebas-neue text-5xl text-lime">4</div>
                      <div className="text-white/80 text-xs mt-1">
                        {isEn ? 'Server Score' : 'Puntos del Servidor'}
                      </div>
                    </div>
                    <div className="font-bebas-neue text-3xl text-offwhite/30">—</div>
                    <div className="text-center">
                      <div className="font-bebas-neue text-5xl text-turquoise">2</div>
                      <div className="text-white/80 text-xs mt-1">
                        {isEn ? 'Receiver Score' : 'Puntos del Receptor'}
                      </div>
                    </div>
                    <div className="font-bebas-neue text-3xl text-offwhite/30">—</div>
                    <div className="text-center">
                      <div className="font-bebas-neue text-5xl text-sunset">2</div>
                      <div className="text-white/80 text-xs mt-1">
                        {isEn ? 'Server Number' : 'Número del Servidor'}
                      </div>
                    </div>
                  </div>
                  <p className="text-white/80 text-sm text-center max-w-md mx-auto">
                    {isEn
                      ? 'In doubles, the score is called as three numbers. The third number indicates which server (1st or 2nd) is serving.'
                      : 'En dobles, el marcador se anuncia con tres números. El tercer número indica cuál servidor (1ero o 2do) está sirviendo.'}
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="bg-charcoal/40 border border-charcoal rounded-xl p-5">
                    <h4 className="text-offwhite font-semibold mb-2">
                      {isEn ? 'Side-Out Scoring (Traditional)' : 'Puntuación por Cambio (Tradicional)'}
                    </h4>
                    <ul className="space-y-2">
                      {(isEn
                        ? [
                            'Games played to 11 points, win by 2',
                            'Only the serving team can score points',
                            'In doubles, both partners serve before a side-out',
                            'At the start of the game, only one partner serves',
                          ]
                        : [
                            'Juegos a 11 puntos, ganar por 2',
                            'Solo el equipo que sirve puede anotar',
                            'En dobles, ambos compañeros sirven antes del cambio',
                            'Al inicio, solo un compañero sirve',
                          ]
                      ).map((item) => (
                        <li key={item} className="flex items-start gap-2 text-white/90 text-sm">
                          <span className="text-lime mt-0.5 shrink-0">&#9656;</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-charcoal/40 border border-charcoal rounded-xl p-5">
                    <h4 className="text-offwhite font-semibold mb-2">
                      {isEn ? 'Rally Scoring (MLP / Competitive)' : 'Puntuación Rally (MLP / Competitivo)'}
                    </h4>
                    <ul className="space-y-2">
                      {(isEn
                        ? [
                            'Every rally results in a point, regardless of who served',
                            'Games typically played to 21, win by 2',
                            'Speeds up matches and reduces game length variability',
                            'Used in Major League Pickleball (MLP) events',
                          ]
                        : [
                            'Cada rally resulta en un punto, sin importar quién sirvió',
                            'Juegos típicamente a 21, ganar por 2',
                            'Acelera los partidos y reduce la variabilidad en la duración',
                            'Usado en eventos de Major League Pickleball (MLP)',
                          ]
                      ).map((item) => (
                        <li key={item} className="flex items-start gap-2 text-white/90 text-sm">
                          <span className="text-turquoise mt-0.5 shrink-0">&#9656;</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* ─── Court Dimensions ─── */}
            <div id="court" className="mb-20 scroll-mt-24">
              <ScrollReveal>
                <SectionHeading label={t.sections[4].label} />

                <p className="text-white text-base leading-relaxed mb-8">
                  {isEn
                    ? 'A standard pickleball court is 20 feet wide by 44 feet long — the same size for both singles and doubles play. The net stands 36 inches high at the sidelines and 34 inches at the center.'
                    : 'Una cancha estándar de pickleball mide 20 pies de ancho por 44 pies de largo — el mismo tamaño para individuales y dobles. La red mide 36 pulgadas de alto en los laterales y 34 pulgadas en el centro.'}
                </p>

                <div className="mb-8">
                  <CourtDiagram locale={locale} />
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <InfoCard
                    icon="📐"
                    title={isEn ? 'Court Size' : 'Tamaño de Cancha'}
                    description={
                      isEn
                        ? '20\' x 44\' — about 1/3 the size of a tennis court. Requires less movement and is easier on the body.'
                        : '20\' x 44\' — aproximadamente 1/3 del tamaño de una cancha de tenis. Requiere menos movimiento y es más suave para el cuerpo.'
                    }
                  />
                  <InfoCard
                    icon="🥅"
                    title={isEn ? 'Net Height' : 'Altura de la Red'}
                    description={
                      isEn
                        ? '36" at the sidelines and 34" at the center. Slightly lower than a tennis net, encouraging more net play.'
                        : '36" en los laterales y 34" en el centro. Ligeramente más baja que una red de tenis, fomentando más juego en la red.'
                    }
                  />
                  <InfoCard
                    icon="🚫"
                    title={isEn ? 'Kitchen Zone' : 'Zona Kitchen'}
                    description={
                      isEn
                        ? '7 feet on each side of the net. No volleying allowed in this zone — the most unique rule in pickleball.'
                        : '7 pies a cada lado de la red. No se permite volear en esta zona — la regla más única del pickleball.'
                    }
                  />
                </div>
              </ScrollReveal>
            </div>

            {/* ─── Equipment ─── */}
            <div id="equipment" className="mb-20 scroll-mt-24">
              <ScrollReveal>
                <SectionHeading label={t.sections[5].label} />

                <p className="text-white text-base leading-relaxed mb-8">
                  {isEn
                    ? 'Getting started with pickleball requires minimal equipment. Here\'s what you need to know about each piece of gear:'
                    : 'Comenzar con el pickleball requiere un equipamiento mínimo. Esto es lo que necesitas saber sobre cada pieza del equipo:'}
                </p>

                {/* Equipment grid */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {/* Paddles */}
                  <div className="bg-charcoal/40 border border-charcoal rounded-xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/siteImages/pickleball_paddle.jpg"
                      alt={isEn ? 'Pickleball paddles' : 'Paletas de pickleball'}
                      className="w-full h-48 object-cover object-center"
                    />
                    <div className="p-5">
                      <h3 className="text-offwhite font-semibold text-lg mb-2">
                        {isEn ? 'Paddles' : 'Paletas'}
                      </h3>
                      <p className="text-white/90 text-sm leading-relaxed mb-3">
                        {isEn
                          ? 'Paddles are solid (no strings) and made from composite materials like fiberglass, carbon fiber, or graphite. They range from $15 for beginner models to $250+ for premium competition paddles.'
                          : 'Las paletas son sólidas (sin cuerdas) y están hechas de materiales compuestos como fibra de vidrio, fibra de carbono o grafito. Van desde $15 para modelos de principiante hasta $250+ para paletas premium de competición.'}
                      </p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-white/80">
                          <span>{isEn ? 'Weight' : 'Peso'}</span>
                          <span className="text-white">6–14 oz</span>
                        </div>
                        <div className="flex justify-between text-white/80">
                          <span>{isEn ? 'Length' : 'Largo'}</span>
                          <span className="text-white">{isEn ? 'Up to 17"' : 'Hasta 17"'}</span>
                        </div>
                        <div className="flex justify-between text-white/80">
                          <span>{isEn ? 'Width' : 'Ancho'}</span>
                          <span className="text-white">{isEn ? 'Up to 7.5"' : 'Hasta 7.5"'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Balls */}
                  <div className="bg-charcoal/40 border border-charcoal rounded-xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/siteImages/pickleball_ball.jpg"
                      alt={isEn ? 'Pickleballs — indoor & outdoor' : 'Pelotas — interior y exterior'}
                      className="w-full h-48 object-cover object-[40%_center]"
                    />
                    <div className="p-5">
                      <h3 className="text-offwhite font-semibold text-lg mb-2">
                        {isEn ? 'Balls' : 'Pelotas'}
                      </h3>
                      <p className="text-white/90 text-sm leading-relaxed mb-3">
                        {isEn
                          ? 'Pickleballs are lightweight, perforated polymer balls similar to wiffle balls. Indoor and outdoor balls differ in the number and size of holes, weight, and durability.'
                          : 'Las pelotas de pickleball son pelotas de polímero perforadas y livianas, similares a las pelotas wiffle. Las pelotas de interior y exterior difieren en el número y tamaño de los agujeros, peso y durabilidad.'}
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-midnight/50 rounded-lg p-3">
                          <div className="text-white font-medium mb-1">
                            {isEn ? 'Indoor' : 'Interior'}
                          </div>
                          <div className="text-white/80 text-xs">
                            {isEn ? '26 larger holes, softer, slower play' : '26 agujeros grandes, más suave, juego lento'}
                          </div>
                        </div>
                        <div className="bg-midnight/50 rounded-lg p-3">
                          <div className="text-white font-medium mb-1">
                            {isEn ? 'Outdoor' : 'Exterior'}
                          </div>
                          <div className="text-white/80 text-xs">
                            {isEn ? '40 smaller holes, harder, faster play' : '40 agujeros pequeños, más dura, juego rápido'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shoes & apparel */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <InfoCard
                    icon="👟"
                    title={isEn ? 'Court Shoes' : 'Zapatos de Cancha'}
                    description={
                      isEn
                        ? 'Court shoes with non-marking soles provide lateral support and traction. Avoid running shoes — they lack side-to-side stability.'
                        : 'Zapatos de cancha con suelas que no marquen proporcionan soporte lateral y tracción. Evita zapatos de correr — les falta estabilidad lateral.'
                    }
                  />
                  <InfoCard
                    icon="👕"
                    title={isEn ? 'Apparel' : 'Vestimenta'}
                    description={
                      isEn
                        ? 'Moisture-wicking athletic clothing is recommended. Many players wear shorts/skirts, a breathable top, and a hat or visor for outdoor play.'
                        : 'Se recomienda ropa deportiva que absorba la humedad. Muchos jugadores usan shorts/faldas, una camiseta transpirable y gorra para juegos al aire libre.'
                    }
                  />
                  <InfoCard
                    icon="🎒"
                    title={isEn ? 'Accessories' : 'Accesorios'}
                    description={
                      isEn
                        ? 'Overgrips for better handle feel, protective eyewear, sweatbands, and a paddle bag to protect your equipment.'
                        : 'Overgrips para mejor agarre, gafas protectoras, muñequeras y una funda para proteger tu equipo.'
                    }
                  />
                </div>
              </ScrollReveal>
            </div>

            {/* ─── Essential Shots ─── */}
            <div id="shots" className="mb-20 scroll-mt-24">
              <ScrollReveal>
                <SectionHeading label={t.sections[6].label} />

                <p className="text-white text-base leading-relaxed mb-8">
                  {isEn
                    ? 'Mastering these fundamental shots will give you a solid foundation for competitive play:'
                    : 'Dominar estos golpes fundamentales te dará una base sólida para el juego competitivo:'}
                </p>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {(isEn
                    ? [
                        {
                          name: 'Dink',
                          icon: '🪶',
                          desc: 'A soft, controlled shot that arcs over the net and lands in the opponent\'s kitchen. The cornerstone of advanced play.',
                          difficulty: 'Beginner',
                        },
                        {
                          name: 'Third Shot Drop',
                          icon: '📉',
                          desc: 'A soft shot from the baseline that drops into the kitchen, allowing the serving team to approach the net.',
                          difficulty: 'Intermediate',
                        },
                        {
                          name: 'Drive',
                          icon: '💨',
                          desc: 'A hard, flat shot aimed low over the net. Used to put pressure on opponents or create offensive opportunities.',
                          difficulty: 'Beginner',
                        },
                        {
                          name: 'Volley',
                          icon: '✋',
                          desc: 'Hitting the ball out of the air before it bounces. Essential for fast exchanges at the kitchen line.',
                          difficulty: 'Beginner',
                        },
                        {
                          name: 'Lob',
                          icon: '🌈',
                          desc: 'A high, arcing shot sent over opponents who are positioned at the net. Effective when timed correctly.',
                          difficulty: 'Intermediate',
                        },
                        {
                          name: 'Erne',
                          icon: '🦅',
                          desc: 'An advanced shot where a player jumps around or over the kitchen to volley a ball near the net from outside the court.',
                          difficulty: 'Advanced',
                        },
                      ]
                    : [
                        {
                          name: 'Dink',
                          icon: '🪶',
                          desc: 'Un golpe suave y controlado que se arquea sobre la red y cae en la kitchen del oponente. La piedra angular del juego avanzado.',
                          difficulty: 'Principiante',
                        },
                        {
                          name: 'Third Shot Drop',
                          icon: '📉',
                          desc: 'Un golpe suave desde la línea de base que cae en la kitchen, permitiendo al equipo servidor acercarse a la red.',
                          difficulty: 'Intermedio',
                        },
                        {
                          name: 'Drive',
                          icon: '💨',
                          desc: 'Un golpe fuerte y plano dirigido bajo sobre la red. Se usa para presionar a los oponentes o crear oportunidades ofensivas.',
                          difficulty: 'Principiante',
                        },
                        {
                          name: 'Volea',
                          icon: '✋',
                          desc: 'Golpear la pelota en el aire antes de que bote. Esencial para intercambios rápidos en la línea de la kitchen.',
                          difficulty: 'Principiante',
                        },
                        {
                          name: 'Lob',
                          icon: '🌈',
                          desc: 'Un golpe alto y arqueado enviado sobre los oponentes posicionados en la red. Efectivo cuando se ejecuta correctamente.',
                          difficulty: 'Intermedio',
                        },
                        {
                          name: 'Erne',
                          icon: '🦅',
                          desc: 'Un golpe avanzado donde el jugador salta alrededor o sobre la kitchen para volear una pelota cerca de la red desde fuera de la cancha.',
                          difficulty: 'Avanzado',
                        },
                      ]
                  ).map((shot) => (
                    <div
                      key={shot.name}
                      className="bg-charcoal/40 border border-charcoal rounded-xl p-5 hover:border-lime/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl">{shot.icon}</span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            shot.difficulty === 'Beginner' || shot.difficulty === 'Principiante'
                              ? 'bg-lime/10 text-lime'
                              : shot.difficulty === 'Intermediate' || shot.difficulty === 'Intermedio'
                                ? 'bg-turquoise/10 text-turquoise'
                                : 'bg-sunset/10 text-sunset'
                          }`}
                        >
                          {shot.difficulty}
                        </span>
                      </div>
                      <h4 className="text-offwhite font-semibold text-base mb-2">{shot.name}</h4>
                      <p className="text-white/90 text-sm leading-relaxed">{shot.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 relative w-full overflow-hidden rounded-2xl aspect-[21/9]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/siteImages/serve_demonstration.png"
                    alt={isEn ? 'Shot technique demonstrations' : 'Demostraciones de técnicas de golpes'}
                    className="w-full h-full object-cover object-center"
                  />
                </div>
              </ScrollReveal>
            </div>

            {/* ─── Strategy & Tips ─── */}
            <div id="strategy" className="mb-20 scroll-mt-24">
              <ScrollReveal>
                <SectionHeading label={t.sections[7].label} />

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-4">
                    <p className="text-white text-base leading-relaxed">
                      {isEn
                        ? 'Pickleball strategy revolves around one key principle: control the kitchen line. The team that controls the net has a significant advantage. Here are essential strategies for improving your game:'
                        : 'La estrategia del pickleball gira en torno a un principio clave: controlar la línea de la kitchen. El equipo que controla la red tiene una ventaja significativa. Aquí hay estrategias esenciales para mejorar tu juego:'}
                    </p>
                  </div>
                  <div className="relative w-full overflow-hidden rounded-2xl aspect-video">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/siteImages/strategy_demo.png"
                      alt={isEn ? 'Doubles strategy positioning' : 'Posicionamiento estratégico en dobles'}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {(isEn
                    ? [
                        {
                          num: '01',
                          title: 'Get to the Kitchen Line',
                          text: 'After the return of serve, move toward the net as quickly as possible. The kitchen line is the most advantageous position on the court.',
                        },
                        {
                          num: '02',
                          title: 'Keep the Ball Low',
                          text: 'Shots that stay low over the net force your opponents to hit upward, giving you opportunities for put-away shots.',
                        },
                        {
                          num: '03',
                          title: 'Be Patient',
                          text: 'Don\'t try to hit winners on every shot. Build points through consistent dinking and wait for your opponent to make a mistake.',
                        },
                        {
                          num: '04',
                          title: 'Target the Middle',
                          text: 'In doubles, hitting to the middle creates confusion about who should take the shot and reduces the angle of return.',
                        },
                        {
                          num: '05',
                          title: 'Move as a Team',
                          text: 'In doubles, stay aligned with your partner. Move together laterally to cover the court without leaving gaps.',
                        },
                      ]
                    : [
                        {
                          num: '01',
                          title: 'Llega a la Línea de Kitchen',
                          text: 'Después de la devolución del servicio, muévete hacia la red lo más rápido posible. La línea de la kitchen es la posición más ventajosa.',
                        },
                        {
                          num: '02',
                          title: 'Mantén la Pelota Baja',
                          text: 'Los golpes que se mantienen bajos sobre la red obligan a tus oponentes a golpear hacia arriba, dándote oportunidades de definición.',
                        },
                        {
                          num: '03',
                          title: 'Ten Paciencia',
                          text: 'No intentes hacer golpes ganadores en cada tiro. Construye puntos con dinking consistente y espera a que tu oponente cometa un error.',
                        },
                        {
                          num: '04',
                          title: 'Apunta al Centro',
                          text: 'En dobles, golpear al centro crea confusión sobre quién debe tomar el tiro y reduce el ángulo de devolución.',
                        },
                        {
                          num: '05',
                          title: 'Muévanse en Equipo',
                          text: 'En dobles, mantente alineado con tu compañero. Muévanse juntos lateralmente para cubrir la cancha sin dejar espacios.',
                        },
                      ]
                  ).map((tip) => (
                    <div
                      key={tip.num}
                      className="flex gap-4 bg-charcoal/30 border border-charcoal rounded-xl p-5 hover:border-lime/20 transition-colors"
                    >
                      <div className="font-bebas-neue text-3xl gradient-text-static shrink-0 w-10">
                        {tip.num}
                      </div>
                      <div>
                        <h4 className="text-offwhite font-semibold text-base mb-1">{tip.title}</h4>
                        <p className="text-white/90 text-sm leading-relaxed">{tip.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>

            {/* ─── Court Etiquette ─── */}
            <div id="etiquette" className="mb-20 scroll-mt-24">
              <ScrollReveal>
                <SectionHeading label={t.sections[8].label} />

                <p className="text-white text-base leading-relaxed mb-8">
                  {isEn
                    ? 'Pickleball has a strong culture of sportsmanship. Following these unwritten rules will make you a welcome player at any court:'
                    : 'El pickleball tiene una fuerte cultura de deportividad. Seguir estas reglas no escritas te hará un jugador bienvenido en cualquier cancha:'}
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  {(isEn
                    ? [
                        { icon: '🤝', title: 'Paddle Tap', text: 'Tap paddles with all players before and after each game — it\'s the pickleball handshake.' },
                        { icon: '📢', title: 'Call the Score', text: 'Always announce the score clearly before serving. This keeps everyone on the same page.' },
                        { icon: '✋', title: 'Call Your Lines', text: 'If you\'re closest to the line, make the call. When in doubt, the ball is in. Give your opponents the benefit.' },
                        { icon: '⏰', title: 'Rotate Fairly', text: 'During open play, rotate off the court after each game so waiting players get a turn.' },
                        { icon: '🚶', title: 'Cross Behind Courts', text: 'Never walk behind a court during active play. Wait for the point to end, then cross quickly.' },
                        { icon: '🎉', title: 'Celebrate Respectfully', text: 'Celebrate your great shots but avoid celebrating opponents\' errors. Keep the vibe positive.' },
                      ]
                    : [
                        { icon: '🤝', title: 'Toque de Paletas', text: 'Toca paletas con todos los jugadores antes y después de cada juego — es el saludo del pickleball.' },
                        { icon: '📢', title: 'Anuncia el Marcador', text: 'Siempre anuncia el marcador claramente antes de servir. Esto mantiene a todos sincronizados.' },
                        { icon: '✋', title: 'Llama tus Líneas', text: 'Si estás más cerca de la línea, haz la llamada. En caso de duda, la pelota está dentro.' },
                        { icon: '⏰', title: 'Rota Justamente', text: 'Durante juego abierto, sal de la cancha después de cada juego para que otros jugadores tengan su turno.' },
                        { icon: '🚶', title: 'Cruza por Detrás', text: 'Nunca camines detrás de una cancha durante el juego activo. Espera que termine el punto.' },
                        { icon: '🎉', title: 'Celebra con Respeto', text: 'Celebra tus grandes tiros pero evita celebrar los errores del oponente. Mantén la vibra positiva.' },
                      ]
                  ).map((item) => (
                    <div key={item.title} className="flex gap-3 bg-charcoal/30 border border-charcoal rounded-xl p-4">
                      <span className="text-xl shrink-0">{item.icon}</span>
                      <div>
                        <h4 className="text-offwhite font-semibold text-sm mb-1">{item.title}</h4>
                        <p className="text-white/90 text-xs leading-relaxed">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>

            {/* ─── FAQ ─── */}
            <div id="faq" className="mb-20 scroll-mt-24">
              <ScrollReveal>
                <SectionHeading label={t.sections[9].label} />

                <div className="space-y-4">
                  {(isEn
                    ? [
                        {
                          q: 'How long does a typical game last?',
                          a: 'A recreational game usually takes 15-25 minutes. Tournament matches can last 30-60 minutes depending on the format.',
                        },
                        {
                          q: 'Can I play pickleball on a tennis court?',
                          a: 'Yes! You can set up temporary pickleball lines on a tennis court. In fact, you can fit up to 4 pickleball courts on a single tennis court.',
                        },
                        {
                          q: 'Is pickleball good exercise?',
                          a: 'Absolutely. Pickleball provides a full-body workout that improves cardiovascular health, balance, agility, and hand-eye coordination — burning 350-475 calories per hour.',
                        },
                        {
                          q: 'What\'s the difference between indoor and outdoor pickleball?',
                          a: 'Indoor pickleball uses a softer ball with larger holes (slower play) on gym floors. Outdoor uses a harder ball with smaller holes (faster play) and is affected by wind.',
                        },
                        {
                          q: 'How much does it cost to get started?',
                          a: 'A beginner paddle costs $15-50, and balls are around $3-5 each. Many community centers and clubs provide equipment for beginners to try.',
                        },
                        {
                          q: 'Can kids play pickleball?',
                          a: 'Yes! Pickleball is excellent for children. The smaller court, lighter equipment, and simple rules make it accessible for kids as young as 5-6 years old.',
                        },
                      ]
                    : [
                        {
                          q: '¿Cuánto dura un juego típico?',
                          a: 'Un juego recreativo generalmente dura 15-25 minutos. Los partidos de torneo pueden durar 30-60 minutos dependiendo del formato.',
                        },
                        {
                          q: '¿Puedo jugar pickleball en una cancha de tenis?',
                          a: '¡Sí! Puedes instalar líneas temporales de pickleball en una cancha de tenis. De hecho, puedes caber hasta 4 canchas de pickleball en una sola cancha de tenis.',
                        },
                        {
                          q: '¿Es buen ejercicio el pickleball?',
                          a: 'Absolutamente. El pickleball proporciona un entrenamiento completo que mejora la salud cardiovascular, el equilibrio, la agilidad y la coordinación — quemando 350-475 calorías por hora.',
                        },
                        {
                          q: '¿Cuál es la diferencia entre pickleball interior y exterior?',
                          a: 'El pickleball interior usa una pelota más suave con agujeros más grandes (juego más lento). El exterior usa una pelota más dura con agujeros más pequeños (juego más rápido) y se ve afectado por el viento.',
                        },
                        {
                          q: '¿Cuánto cuesta empezar?',
                          a: 'Una paleta para principiantes cuesta $15-50, y las pelotas son alrededor de $3-5 cada una. Muchos centros comunitarios y clubes proporcionan equipo para que los principiantes prueben.',
                        },
                        {
                          q: '¿Pueden los niños jugar pickleball?',
                          a: '¡Sí! El pickleball es excelente para niños. La cancha más pequeña, el equipo más liviano y las reglas simples lo hacen accesible para niños desde los 5-6 años.',
                        },
                      ]
                  ).map((faq) => (
                    <div key={faq.q} className="bg-charcoal/40 border border-charcoal rounded-xl p-5">
                      <h4 className="text-offwhite font-semibold text-base mb-2 flex items-start gap-2">
                        <span className="text-lime shrink-0">Q.</span>
                        {faq.q}
                      </h4>
                      <p className="text-white/90 text-sm leading-relaxed pl-6">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>

          </div>
        </div>
      </section>
    </main>
  )
}
