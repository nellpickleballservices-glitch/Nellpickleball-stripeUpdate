import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/'
  // Prevent open redirect: must be a relative path, no protocol or double-slash
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Ensure a profile row exists for OAuth users (Google, etc.)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id, country')
          .eq('id', user.id)
          .single()

        if (!existingProfile) {
          // New OAuth user — create profile without country
          const meta = user.user_metadata ?? {}
          const { error: insertError } = await supabaseAdmin.from('profiles').insert({
            id: user.id,
            first_name: meta.full_name?.split(' ')[0] ?? meta.name?.split(' ')[0] ?? '',
            last_name: meta.full_name?.split(' ').slice(1).join(' ') ?? meta.name?.split(' ').slice(1).join(' ') ?? '',
            phone: null,
            locale_pref: 'es',
            country: null,
          })
          if (insertError) {
            console.error('OAuth profile insert failed:', insertError)
          }
          return NextResponse.redirect(`${origin}/signup/complete-profile`)
        }

        // Existing profile but country never set — send to complete profile
        if (existingProfile.country === null) {
          return NextResponse.redirect(`${origin}/signup/complete-profile`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
