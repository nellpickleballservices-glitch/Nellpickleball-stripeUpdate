# NELL Pickleball Site — Project Notes

A practical reference for finding and editing things. Read this first when you sit down to make a change.

---

## Tech stack at a glance

| Piece | What for |
|---|---|
| **Next.js 15** (App Router) | The whole app — routes, server actions, API routes |
| **React 19** + TypeScript | UI components |
| **Tailwind v4** | All styling. Brand colors are CSS variables in `app/globals.css` |
| **Supabase** | Authentication + Postgres database + Storage (for uploaded images) |
| **next-intl** | Internationalization (Spanish + English) |
| **next/font/google** | Custom fonts (Bebas Neue, Poppins, Bungee, Train One, Rubik Dirt) |
| **Motion** (`motion/react`) | Page/component animations |
| **TipTap** | Rich-text editor in the admin CMS section |
| **OpenAI** | Powers the "Ask Nell" chatbot (server-side only) |
| **Resend** | Transactional email |
| **Stripe** | Membership payments (installed; integration in progress) |
| **Vercel Analytics + Speed Insights** | Production-only telemetry |

---

## How to run / build

```bash
npm run dev     # start the dev server (default http://localhost:3000)
npm run build   # production build
npm run start   # serve the production build
npm run lint    # next lint
npm test        # vitest
npm run test:e2e # playwright
```

Environment variables you'll need (see `.env.local.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` *(server only — never expose)*
- `OPENAI_API_KEY` *(chatbot)*
- `RESEND_API_KEY` *(email)*
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_WHATSAPP_PHONE`
- `DEV_BYPASS_AUTH=true` *(local dev only — pretends you're an admin)*

---

## Folder map

```
simplenellpickleballsite/
├── app/                                # Next.js App Router
│   ├── [locale]/                       # all routes are locale-aware
│   │   ├── layout.tsx                  # root layout — fonts, JSON-LD, Analytics
│   │   ├── page.tsx                    # HOMEPAGE
│   │   ├── (marketing)/                # route group → public pages
│   │   │   ├── learn-pickleball/
│   │   │   ├── gallery/
│   │   │   ├── contact/
│   │   │   ├── events/
│   │   │   └── expeditions/[id]/       # single expedition page
│   │   │   ├── sessions/[id]/          # play session page + sign-up
│   │   │   └── sessions/success/       # Stripe checkout return
│   │   ├── (auth)/                     # login / signup / reset
│   │   ├── (member)/                   # logged-in user pages (all disabled)
│   │   │   └── _disabled-dashboard/    # `_` prefix = excluded from routing
│   │   └── (admin)/n3ll-admin-x9k2/    # ADMIN PANEL (obscured URL)
│   │       ├── expeditions/
│   │       ├── gallery/
│   │       ├── sessions/               # play sessions + sign-up rosters
│   │       ├── users/
│   │       └── cms/                    # generic content blocks (TipTap)
│   ├── actions/                        # server actions (mutations + reads)
│   │   ├── admin/                      # admin-only actions
│   │   ├── auth.ts
│   │   ├── profile.ts
│   │   ├── membership.ts
│   │   └── sessions.ts                 # play session sign-up + payment
│   └── api/chat/                       # chatbot endpoint (uses OpenAI)
│
├── components/
│   ├── Navbar.tsx                      # public top bar
│   ├── Footer.tsx                      # public footer + icon credits
│   ├── LanguageSwitcher.tsx
│   ├── AddressAutocomplete.tsx         # Google Maps autocomplete
│   ├── CountrySelect.tsx
│   ├── public/                         # marketing components
│   │   ├── ValuesBanner.tsx
│   │   ├── ExpeditionsSection.tsx
│   │   ├── PackagesSection.tsx
│   │   ├── AboutSection.tsx
│   │   ├── ImageCarousel.tsx           # reusable carousel (swipe, thumbs, contain-fit)
│   │   ├── GalleryGrid.tsx             # gallery + lightbox modal (uses portal)
│   │   ├── ExpeditionContent.tsx       # block renderer for expedition body
│   │   ├── NavLink.tsx
│   │   ├── MobileNav.tsx
│   │   ├── ScrollProgress.tsx
│   │   ├── EventCard.tsx
│   │   ├── CourtDiagram.tsx
│   │   ├── TableOfContents.tsx
│   │   └── ImageCarousel.tsx
│   ├── admin/
│   │   ├── AdminSidebar.tsx
│   │   ├── StatCard.tsx
│   │   └── ConfirmDialog.tsx
│   ├── chatbot/                        # all lazy-loaded
│   │   ├── ChatWidgetLoader.tsx        # entry point (next/dynamic ssr: false)
│   │   ├── ChatWidget.tsx
│   │   ├── ChatBubble.tsx
│   │   └── ChatPanel.tsx
│   ├── effects/                        # visual effects
│   │   ├── HeroVideo.tsx
│   │   ├── GlowButton.tsx
│   │   ├── GlowCard.tsx
│   │   ├── LogoOrb.tsx
│   │   ├── FloatingParticles.tsx
│   │   └── SubpageHeroAccents.tsx
│   └── motion/                         # animation wrappers
│       ├── MotionProvider.tsx          # LazyMotion provider
│       ├── ScrollReveal.tsx
│       ├── HeroEntrance.tsx
│       ├── SectionReveal.tsx
│       └── StaggerChildren.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # browser-side
│   │   ├── server.ts                   # server-side (uses cookies)
│   │   └── admin.ts                    # service-role (bypasses RLS)
│   ├── types/
│   │   ├── admin.ts                    # Expedition, GalleryItem, etc.
│   │   └── expedition-blocks.ts        # PageBuilder block schema
│   ├── data/                           # static data (country list, etc.)
│   ├── queries/                        # DB queries
│   ├── chat/                           # chat system prompt
│   ├── resend/                         # email templates
│   ├── middleware/
│   │   └── route-helpers.ts            # public-vs-protected route logic
│   ├── content.ts                      # generic CMS block fetcher
│   ├── expeditions.ts                  # expedition helpers
│   ├── image-compress.ts               # client-side WebP compression
│   └── utils/                          # misc helpers
│
├── messages/
│   ├── en.json                         # ALL English UI text
│   └── es.json                         # ALL Spanish UI text
│
├── public/
│   └── images/
│       ├── icons/
│       │   ├── NellLogo.png
│       │   ├── nellyBot1.png
│       │   ├── calendar.svg
│       │   ├── values_icons/           # ValuesBanner PNGs (Freepik / Flaticon)
│       │   └── info_cards/             # PackagesSection PNGs
│       └── siteImages/                 # hero photos, etc.
│
├── supabase/
│   ├── migrations/                     # numbered SQL files (0001 … NNNN)
│   └── functions/                      # Supabase Edge Functions
│
├── i18n/
│   ├── routing.ts                      # locales config (es default, en prefixed)
│   ├── navigation.ts                   # locale-aware <Link>
│   └── request.ts                      # next-intl request config
│
├── tests/
├── middleware.ts                       # auth gating
├── next.config.ts                      # Next config + image domains + security headers
├── globals.css                         # see in app/
└── package.json
```

---

## How key things work

### Routing & locales

- The default locale is **Spanish** — it has **no URL prefix** (`nellpickleball.com/` = Spanish).
- English is **prefixed** (`nellpickleball.com/en/` = English).
- The `[locale]` segment captures the prefix when present.
- **Route groups** in parens (`(marketing)`, `(auth)`, etc.) **don't appear in the URL** — they're just for organizing files and applying shared layouts.
- Admin URLs use the obscured slug `n3ll-admin-x9k2` (deliberate — not a security boundary, but raises the bar). Booking is public: play sessions live at `/sessions/[id]` with the Stripe return at `/sessions/success`.

### i18n (text translations)

- **Every string the user sees** is in `messages/en.json` or `messages/es.json`.
- Keys are organized by namespace: `Nav`, `Home`, `Auth.login`, `Public`, `Admin`, etc.
- **In server components:** `const t = await getTranslations('Home'); t('heroCta')`
- **In client components:** `const t = useTranslations('Home'); t('heroCta')`
- Pluralization: `"duration": "{days, plural, one {# day} other {# days}}"`
- To change a label: edit **both** `en.json` and `es.json`.

### Authentication

- Supabase Auth via `@supabase/ssr`.
- `lib/supabase/server.ts` → reads cookies in server components / actions.
- `lib/supabase/client.ts` → browser usage.
- `lib/supabase/admin.ts` → service-role client; **bypasses RLS**, only call from server actions.
- `middleware.ts` short-circuits on public routes for speed; only runs the Supabase round-trip on protected routes (see `lib/middleware/route-helpers.ts`).
- Dev shortcut: set `DEV_BYPASS_AUTH=true` in `.env.local` to act as a fake admin (only works when `NODE_ENV !== 'production'`).

### Database

- Postgres on Supabase. Schema lives in `supabase/migrations/*.sql`.
- Migrations are numbered (`0001_…sql`, `0002_…sql`, etc.). Apply via the Supabase dashboard or CLI.
- RLS (Row Level Security) is enabled on tables — write policies in each migration.
- **Public reads** (homepage expeditions, gallery items) go through `unstable_cache` with the `expeditions` tag, revalidated on admin writes via `revalidateTag(…)`.

### Styling (Tailwind v4)

- Tailwind v4 imports through `app/globals.css` with `@import 'tailwindcss';`.
- All **brand colors are CSS variables** inside the `@theme` block at the top of `globals.css`. Change those to update colors across the whole site:
  - `--color-lime: #A3FF12` — pickleball brand
  - `--color-electric: #7ED957` — secondary lime
  - `--color-sunset: #FF6B2C` — orange accent
  - `--color-turquoise: #38BDF8` — cyan accent
  - `--color-midnight: #1C305D` — main dark blue (the site bg)
  - `--color-charcoal: #2A4378` — one step lighter (cards on midnight)
  - `--color-slate: #3F5995` — even lighter (hover / dividers)
  - `--color-navy: #0E1E3D` — deepest blue
  - `--color-offwhite: #FFFFFF`, `--color-dim: #F1F5F9`, `--color-muted: #CBD5E1`
  - `--color-danger: #EF4444`
- Use these as Tailwind utilities: `bg-midnight`, `text-lime`, `border-charcoal`, etc.
- The **navbar** uses a separate cream color `#f5f3ed` (hardcoded in `Navbar.tsx`) because the NELL logo is white.
- Custom mobile rules also live in `globals.css`: marquee animation, no-scrollbar utility, prefers-reduced-motion, iOS form-input zoom fix, admin-scope (light-theme overrides for admin date inputs).

### Fonts

All loaded via `next/font/google` in `app/[locale]/layout.tsx`. Register the CSS variable in the `@theme` block in `globals.css`, then use as `font-{name}` utility:

| Font | Used for |
|---|---|
| `font-bebas-neue` | most large headlines |
| `font-poppins` | body text (default) |
| `font-bungee` | NavLink + nav buttons + some accents |
| `font-train-one` | Reserve Your Court Today button |
| `font-rubik-dirt` | Hero headline ("Playing With Purpose") |

### Images

- **All public images** use `next/image` for AVIF/WebP + lazy loading + responsive `srcset`.
- Admin uploads go through `lib/image-compress.ts` — compresses to WebP @ 82% quality, max 1920px, **before** the upload hits Supabase.
- `next.config.ts` lists the allowed image hostnames (`*.supabase.co`, `*.googleusercontent.com`, `img.youtube.com`, etc.).

### Animations

- Use `motion/react` (Framer Motion successor) via the `m` import, wrapped in `LazyMotion` from `components/motion/MotionProvider.tsx`.
- Reusable helpers in `components/motion/`:
  - `<ScrollReveal delay={…}>` — fade-up on viewport enter
  - `<SectionReveal direction="left|right|up">` — directional fade
  - `<HeroEntrance>` — splash entrance on a hero
  - `<StaggerChildren>` — stagger children
- All animations honor `prefers-reduced-motion` (see globals.css).

### Chatbot

- "Ask Nell" floating bubble + panel powered by OpenAI.
- The entire bundle is **lazy-loaded** via `components/chatbot/ChatWidgetLoader.tsx` (`next/dynamic({ ssr: false, loading: () => null })`) so the chat code never lands in the initial JS chunk.
- The actual OpenAI call happens **server-side** in `app/api/chat/route.ts`.
- System prompt lives in `lib/chat/`.

---

## Where the content lives

| What | Where |
|---|---|
| All button labels, page text, navbar labels | `messages/en.json` / `messages/es.json` |
| Hero headline / sub-headline / CTA | `messages/*.json` → `Home.heroHeadline`, `Home.heroSubheadline`, `Home.heroCta` |
| The 6 values in the ValuesBanner | Keys hardcoded in `components/public/ValuesBanner.tsx` + labels in `messages/*.json` (`Public.aboutValueLoveTitle` … `aboutValueIntegrityTitle`) |
| Vision / Mission text | `messages/*.json` → `Public.aboutVisionText`, `aboutMissionText` |
| Packages cards (Tourists/Locals/Churches) | Inline arrays in `components/public/PackagesSection.tsx` |
| Learn Pickleball article | Inline `const content = { en: {…}, es: {…} }` at the top of `app/[locale]/(marketing)/learn-pickleball/page.tsx` |
| Expedition cards | Supabase `expeditions` table — manage in admin at `/n3ll-admin-x9k2/expeditions` |
| Gallery items | Supabase `gallery_items` table — manage in admin at `/n3ll-admin-x9k2/gallery` |
| CMS content blocks (FAQ etc.) | Supabase `cms_content_blocks` table — manage in admin at `/n3ll-admin-x9k2/cms` |
| Footer social links | Supabase CMS block `footer_social_links` (with hardcoded fallbacks in `components/Footer.tsx`) |
| Icon attributions | `components/Footer.tsx` (bottom credits row) |
| Site bg colors / fonts | `app/globals.css` `@theme` block |
| Auth-gated routes | `lib/middleware/route-helpers.ts` (`PROTECTED_PREFIXES`) |

---

## Common edits — where to look first

### "Change the homepage hero text"
1. Open `messages/en.json` + `messages/es.json`.
2. Find the `Home` namespace.
3. Edit `heroHeadline`, `heroSubheadline`, `heroCta`, `heroNoMembership`.

### "Change a brand color sitewide"
1. Open `app/globals.css`.
2. Edit the appropriate `--color-*` variable in the `@theme` block.
3. If it's hardcoded somewhere (e.g., the navbar's cream `#f5f3ed`), search the codebase for the hex.

### "Replace an icon"
1. Drop the new PNG/SVG into `public/images/icons/...`
2. For ValuesBanner icons: edit `components/public/ValuesBanner.tsx` (the inline icon functions).
3. For PackagesSection icons: edit `components/public/PackagesSection.tsx` (the `packages` / `tournaments` arrays).
4. Add the Flaticon (or other) attribution in `components/Footer.tsx` credits row.

### "Add or update an expedition"
1. Log into admin (`/n3ll-admin-x9k2`).
2. Go to **Expeditions**.
3. Click **Add Expedition** or click an existing one to edit.
4. Upload images (auto-compressed before upload).
5. Use the **Page Builder** to add heading / paragraph / image / image+text / gallery / quote / link / divider blocks.
6. Set **Start / End / Expiration Date** + Sort Order + Published.
7. Hit save — the homepage cache is invalidated automatically.

### "Add a new gallery photo"
1. Admin → **Gallery** → **Add Gallery Item**.
2. Pick media type (image / video).
3. Upload (image gets compressed) or paste URL.
4. Pick a grid size (1×1 / 1×2 / 2×1 / 2×2).
5. Set sort order + visibility.

### "Change which menu items show in the navbar"
- Desktop: edit the JSX in `components/Navbar.tsx`.
- Mobile: edit the `publicLinks` array in `components/public/MobileNav.tsx`.

### "Change which routes need login"
- Edit `PROTECTED_PREFIXES` (or related constants) in `lib/middleware/route-helpers.ts`.

### "Adjust the hero CTA"
- Button text: `Home.heroCta` in `messages/*.json`.
- Where the button goes: the `href` on `<GlowButton>` in `app/[locale]/page.tsx`. Currently `#packages` (smooth scrolls to the in-page packages section).
- Size variant: `size="sm"` on the `GlowButton` (see `components/effects/GlowButton.tsx`).

### "Edit the chat assistant's behavior"
- System prompt: `lib/chat/`.
- Server endpoint: `app/api/chat/route.ts`.
- UI: `components/chatbot/ChatPanel.tsx`.

### "Add a new translation key"
1. Add to **both** `messages/en.json` and `messages/es.json` (under the matching namespace).
2. Reference via `t('myKey')` in the component.

---

## How the gallery lightbox works (because it's tricky)

- Click a thumbnail → opens a **full-screen modal** that covers the navbar.
- The modal is rendered via `createPortal(…, document.body)` so it escapes the gallery section's z-index stacking context (otherwise the sticky navbar at `z-50` would win over the modal's `z-9999`).
- Navigation: arrow keys (`←` / `→`), prev/next buttons, swipe (mobile).
- Tap anywhere except the prev/next arrows = close.
- Body scroll is locked while the modal is open.

---

## Performance touches already in place

- Lazy chatbot (no chat JS in the initial bundle).
- Middleware skips Supabase round-trip on public routes.
- Cached public expedition reads (`unstable_cache` with `revalidateTag('expeditions')`).
- TipTap (admin CMS) and PageBuilder are dynamic-imported only when an editor is opened.
- ImageCarousel only renders the current slide + neighbors — off-screen photos aren't fetched.
- Client-side image compression before Supabase upload.
- `next/image` everywhere for AVIF/WebP + responsive `srcset`.
- Mobile: 16px input font (no iOS auto-zoom), `100dvh` instead of `100vh`, safe-area insets, swipe gestures.

---

## Recent visual / brand decisions

- **Main dark surface color** = `#1C305D` (set as `--color-midnight`). Charcoal, slate, navy are all in the same blue family now.
- **Navbar** = cream `#f5f3ed` (because the NELL logo is white). Nav links + language switcher = `#162649` (dark blue), `#2A4789` (lighter blue on hover/active).
- **Hero font** = Rubik Dirt (distressed display face).
- **CTA button font** = Train One (chunky display face), text color = midnight (#1C305D, the brand navy).
- **Expeditions section** has a separate light beach palette (cream → seafoam) to stand out from the dark surrounding sections.
- **Admin panel** uses a **light theme** (cards on `bg-gray-50`, blue accent for primary actions). Public site stays dark.

---

## Known follow-ups / nice-to-haves

- The old court-reservation system has been **deleted** (member routes, server actions, types, queries, i18n). Its database objects were deliberately left in place and are now **unused**: `reservations`, `court_config`, `court_pricing`, `session_pricing`, plus the `btree_gist` extension. Drop them once the play-session system is proven in production.
- `app/[locale]/(member)/_disabled-dashboard/` still holds a "Coming Soon" page and the account-settings forms (profile + password). The `_` prefix keeps them out of routing, so they are **unreachable dead code** — either wire them back up or delete them.
- `proxy.ts` is the Next 16 middleware, staged but inert on Next 15 — `middleware.ts` is what actually runs. The two must be kept in sync until the upgrade lands.
- `stripe` npm package is installed but **not currently imported** anywhere. Either wire up Stripe payments or uninstall the package.
- ~119 translation keys are likely unused (across all namespaces in `messages/*.json`). Mostly from features that were removed or never shipped.
- The `dominican-republic.png` icon (Locals card) has **no attribution** in the footer — add one if you didn't make the icon yourself.

---

## When something breaks

1. **Build / type errors:** run `npm run build` locally — most issues surface there.
2. **Hydration mismatches:** usually means a server-only API in a client component, or `Date.now()` / `Math.random()` outside `useEffect`. Check the browser console for a hint.
3. **Image not loading via `next/image`:** the hostname needs to be allow-listed in `next.config.ts` → `images.remotePatterns`.
4. **Supabase auth bouncing you to login when you shouldn't be:** check `lib/middleware/route-helpers.ts` — make sure the path isn't unintentionally matched by `PROTECTED_PREFIXES`.
5. **Translation showing as `Home.heroCta` instead of the actual text:** the key doesn't exist in `messages/{locale}.json`. Add it.
6. **Admin form not saving:** check the browser console + server logs. Server actions throw plain `Error('Operation failed')` for safety; the real error is in `console.error`.
7. **Local dev hot reload is slow:** TipTap and PageBuilder are heavy. They're now dynamic-imported, but the first time you open an editor in dev it still re-bundles.

---

## Deployments

- Deploy target: **Vercel** (assumed — Speed Insights / Analytics are baked in).
- `themeColor` in `app/[locale]/layout.tsx` controls the mobile browser status bar color.
- Vercel image optimization handles AVIF/WebP conversion at the CDN edge.

---

Last updated: June 2026.
