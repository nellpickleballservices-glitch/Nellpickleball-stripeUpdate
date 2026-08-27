// Starter content for a new session page.
//
// A session renders fine with zero blocks — the detail page always draws the
// schedule, price, and sign-up card from structured fields. This template is
// what the admin gets when they click "Load default template": ordinary blocks,
// fully editable afterward, so the default layout is a starting point rather
// than something locked away in code.

import { createBlock, type Block } from '@/lib/types/expedition-blocks'

type Lang = 'es' | 'en'

const COPY: Record<Lang, { heading: string; intro: string; whatToBring: string; bringList: string; rules: string; rulesList: string }> = {
  es: {
    heading: 'Sobre esta sesión',
    intro:
      'Únete a nosotros para una sesión de pickleball con jugadores de todos los niveles. ' +
      'Las canchas, las pelotas y la organización corren por nuestra cuenta — tú solo trae ganas de jugar.',
    whatToBring: 'Qué traer',
    bringList:
      '• Ropa deportiva cómoda y tenis de cancha\n' +
      '• Tu propia paleta (tenemos algunas prestadas si te hace falta)\n' +
      '• Agua y protector solar\n' +
      '• Muchas ganas de divertirte',
    rules: 'Cómo funciona',
    rulesList:
      '• Los cupos son limitados y se asignan por orden de llegada\n' +
      '• Llega 10 minutos antes para calentar\n' +
      '• Si no puedes asistir, avísanos con tiempo para liberar tu cupo\n' +
      '• Puedes pagar en línea o en efectivo al llegar a la cancha',
  },
  en: {
    heading: 'About this session',
    intro:
      'Join us for a pickleball session open to players of every level. ' +
      'Courts, balls, and organizing are on us — all you need to bring is your game.',
    whatToBring: 'What to bring',
    bringList:
      '• Comfortable athletic wear and court shoes\n' +
      '• Your own paddle (we have loaners if you need one)\n' +
      '• Water and sunscreen\n' +
      '• A good attitude',
    rules: 'How it works',
    rulesList:
      '• Spots are limited and assigned first come, first served\n' +
      '• Arrive 10 minutes early to warm up\n' +
      '• Let us know ahead of time if you can\'t make it so we can free your spot\n' +
      '• Pay online or bring cash to the court',
  },
}

function heading(text: string, level: 2 | 3): Block {
  const b = createBlock('heading')
  return { ...b, level, text } as Block
}

function paragraph(text: string): Block {
  const b = createBlock('paragraph')
  return { ...b, text } as Block
}

/** The default session page, as editable blocks. */
export function defaultSessionBlocks(lang: Lang): Block[] {
  const c = COPY[lang]
  return [
    heading(c.heading, 2),
    paragraph(c.intro),
    createBlock('divider'),
    heading(c.whatToBring, 3),
    paragraph(c.bringList),
    heading(c.rules, 3),
    paragraph(c.rulesList),
  ]
}
