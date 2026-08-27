import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const devBypass =
    process.env.NODE_ENV !== 'production' &&
    process.env.DEV_BYPASS_AUTH === 'true'

  if (!devBypass) {
    // Layer 2 admin protection: server-side role check before rendering
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')
    if (user.app_metadata?.role !== 'admin') redirect('/')
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar locale={locale} />
      <main className="admin-scope flex-1 bg-gray-50 text-gray-900 p-6 overflow-y-auto md:ml-64">
        {children}
      </main>
    </div>
  )
}
