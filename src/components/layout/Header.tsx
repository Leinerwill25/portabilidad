import { createClient } from '@/lib/supabase/server'
import { User } from 'lucide-react'

export default async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="h-[60px] border-b border-[#e5e7eb] bg-white flex items-center justify-between px-8 sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-medium text-[#374151]">Panel de Control</span>
      </div>

      <div className="flex items-center gap-5">
        <div className="text-right hidden sm:block">
          <p className="text-[13px] font-bold text-[#1a2744] leading-tight">{user?.user_metadata?.full_name || 'Admin'}</p>
          <p className="text-[11px] text-[#6b7280]">{user?.email}</p>
        </div>
        <div className="h-9 w-9 rounded-full bg-[#eff6ff] flex items-center justify-center border border-[#bfdbfe] shadow-sm">
          <User className="text-[#1a56db]" size={18} />
        </div>
      </div>
    </header>
  )
}
