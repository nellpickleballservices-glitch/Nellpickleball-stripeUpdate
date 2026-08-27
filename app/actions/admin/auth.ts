'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Layer 3 admin protection: validates admin role in Server Actions.
 * Complements Layer 1 (proxy.ts) and Layer 2 (admin layout.tsx).
 * Redirects non-admin users to home page.
 */
export async function requireAdmin() {
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.DEV_BYPASS_AUTH === 'true'
  ) {
    return { id: 'dev-bypass', app_metadata: { role: 'admin' } } as never
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  if (user.app_metadata?.role !== 'admin') {
    redirect('/')
  }

  return user
}
