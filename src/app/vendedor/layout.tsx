import { getSellerSession } from '@/lib/auth/seller'
import { redirect } from 'next/navigation'
import SellerSidebar from '@/components/vendedor/SellerSidebar'
import SellerHeader from '@/components/vendedor/SellerHeader'

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSellerSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row">
      {/* Sidebar Moderno */}
      <SellerSidebar session={session} />
      
      <div className="flex-1 lg:ml-[260px] flex flex-col min-h-screen">
        {/* Header Premium */}
        <SellerHeader session={session} />
        
        <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
