import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
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

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      <Sidebar />
      <div className="flex-1 lg:ml-[240px] flex flex-col">
        <Header />
        <main className="p-8 pb-16 flex-1 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
