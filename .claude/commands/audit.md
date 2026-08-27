---
description: Full-site audit of the NELL Pickleball codebase — security, organization, and efficiency
argument-hint: "[optional: security | organization | efficiency | path to scope it]"
---

# Full site audit

Audit this codebase for **security**, **organization**, and **efficiency**. If `$ARGUMENTS`
names one of those three areas or a path, scope the audit to it; otherwise cover all three
across the whole project.

## Ground rules

These matter more than coverage. A confident wrong finding costs more than a missed one.

1. **Verify every finding in the actual code before reporting it.** Open the file, read the
   surrounding logic, and confirm the problem is real. No pattern-matching from filenames,
   no "this is often a problem" findings.
2. **Give each finding a concrete failure scenario** — specific inputs or state that lead to
   a specific bad outcome. If you can't write one, it isn't a finding.
3. **Do not change any code.** This is a read-only review. Report, then wait for direction on
   what to fix.
4. **Say what you did not check.** An honest gap beats implied completeness.
5. **Rank by real-world impact**, not by how easy something is to describe. Three genuine
   issues beat thirty style nits.
6. **Skip anything under `_disabled-*` directories** — that code is intentionally parked and
   is excluded from the build.

## Stack context

Next.js 15 App Router · React 19 · TypeScript (strict) · Supabase (Postgres + Auth + Storage) ·
Stripe Checkout · next-intl (es default, en prefixed) · Tailwind v4 · Vercel · Vitest + Playwright

## 1. Security

**Secrets and credentials**
- Anything sensitive reachable from the browser. `SUPABASE_SERVICE_ROLE_KEY` and
  `STRIPE_SECRET_KEY` must never appear in a client component or a `NEXT_PUBLIC_` variable.
- Trace `lib/supabase/admin.ts` and `lib/stripe.ts` imports: confirm every importer is
  server-only. A `'use client'` file anywhere in that chain is a critical finding.
- Secrets committed to git or present in files that ship to the client bundle.

**Authorization**
- Every server action in `app/actions/admin/**` must call `requireAdmin()` before touching
  data. Find any that don't.
- Server actions in `app/actions/*.ts` are public HTTP endpoints — anyone can call them with
  arbitrary arguments. Check each one validates its inputs and doesn't leak data or allow
  privileged operations to unauthenticated callers.
- Confirm `requireAdmin()` itself can't be bypassed, including via `DEV_BYPASS_AUTH`
  (which must be inert in production).

**Data exposure**
- Supabase RLS policies in `supabase/migrations/`: any table readable by `anon` that holds
  personal data. `session_signups` holds names, emails, and phone numbers and must not be
  publicly readable.
- Server actions returning more fields than the caller needs — especially anything keyed by
  a UUID that an unauthenticated visitor can supply.

**Payments**
- `app/api/stripe/session-webhook/route.ts`: signature verification present and correct,
  raw body never parsed before verification, replay/duplicate deliveries handled idempotently.
- The capacity guarantee in `book_session_spot` (migration 0025) — confirm nothing can
  oversell a session, and that no code path bypasses the RPC to insert sign-ups directly.
- Whether payment amounts are ever taken from client input rather than the database.

**Input handling and abuse**
- Injection risk, unsafe HTML rendering (`dangerouslySetInnerHTML`), unvalidated redirects.
- Upload actions: MIME allowlists, size caps, and filenames that can't escape their bucket.
- Rate limiting and honeypots on public endpoints — contact form, expedition interests,
  session sign-ups, chat.
- Middleware route protection in `middleware.ts` and `lib/middleware/route-helpers.ts`:
  look for paths that should be protected but aren't matched.

## 2. Organization

- Duplicated logic that should be shared — especially between the expeditions and sessions
  features, which were built from the same patterns.
- Dead code: unused exports, components nobody renders, actions nobody calls, orphaned
  message keys in `messages/*.json`.
- **`messages/en.json` and `messages/es.json` must have identical key sets.** A key present
  in one and missing from the other throws at runtime for users in that locale. Check this
  programmatically, not by eye.
- Files doing too many unrelated things, or logic sitting at the wrong layer (business rules
  in components, presentation in server actions).
- Naming and structure that contradict how the rest of the codebase is organized.
- TypeScript escape hatches: `any`, unjustified `as` casts, `@ts-ignore`.

## 3. Efficiency

- **Caching correctness first.** `unstable_cache` and `revalidateTag` usage: anything that
  could serve a stale spot count or stale availability is a correctness bug, not a perf nit.
- Sequential `await`s in loops that should be parallel; N+1 query patterns against Supabase.
- Missing database indexes for the queries actually being run.
- Client bundle weight: heavy dependencies pulled into client components, missing
  `next/dynamic` for large editors, `'use client'` on components that don't need it.
- Images not using `next/image`, or missing `sizes` on `fill` images.
- Unnecessary `force-dynamic` on routes that could be cached, and cached routes that
  must not be.

## Output

Report findings grouped by area, ranked most severe first within each. For each:

- **What** — the defect, in one sentence
- **Where** — `file_path:line_number`
- **Why it matters** — the concrete failure scenario
- **Fix** — the specific change, not a general principle

Then close with:
- A short overall assessment — is this codebase in good shape or not?
- What you checked and what you deliberately did not
- The three things worth fixing first, if only three get done

If an area is genuinely clean, say so plainly rather than manufacturing findings to fill it out.
