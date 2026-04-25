import DashboardShell from '@/components/layout/DashboardShell'
import Header from '@/components/layout/Header'
import BottomNav from '@/components/layout/BottomNav'
import SalesFloatingWidget from '@/components/dashboard/SalesFloatingWidget'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  const canSeeWidget = ['superadmin', 'coordinator', 'admin'].includes(profile?.role || '')

  return (
    <DashboardShell 
      header={<Header />}
      bottomNav={<BottomNav />}
      floatingWidget={canSeeWidget ? <SalesFloatingWidget /> : null}
    >
      {children}
    </DashboardShell>
  )
}
