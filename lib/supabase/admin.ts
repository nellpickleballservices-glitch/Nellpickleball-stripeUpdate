// SERVER-ONLY: Never import from client components. SUPABASE_SERVICE_ROLE_KEY bypasses RLS.
import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Admin client uses service_role — bypasses ALL RLS.
// NEVER import this file from client components or expose SUPABASE_SERVICE_ROLE_KEY to browser.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,  // No NEXT_PUBLIC_ prefix — server only
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function assignAdminRole(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: { role: 'admin' },
  })
  if (error) throw error
}

export { supabaseAdmin }
