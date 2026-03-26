'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Search, LogOut, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const MENU_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Users, label: 'Vendedores', href: '/sellers' },
  { icon: Search, label: 'Buscar DN', href: '/search' },
]

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-[240px] bg-white border-r border-[#e5e7eb] transition-transform duration-300 transform",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          <div className="h-[60px] flex items-center px-6 border-b border-[#e5e7eb]">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-[#1a56db] rounded-[4px] flex items-center justify-center text-white">
                <Search size={14} />
              </div>
              <span className="text-[15px] font-bold text-[#1a2744] tracking-tight">DN Control</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col p-4">
            <p className="px-4 text-[11px] font-semibold text-[#6b7280] uppercase tracking-[0.06em] mb-4 mt-2">Menú principal</p>
            
            <nav className="space-y-1">
              {MENU_ITEMS.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium transition-all duration-150 rounded-md",
                      isActive 
                        ? "bg-[#eff6ff] text-[#1a56db] border-l-[3px] border-[#1a56db] rounded-l-none" 
                        : "text-[#374151] hover:bg-[#f1f5f9] hover:text-[#1a2744]"
                    )}
                  >
                    <item.icon size={16} className={cn(isActive ? "text-[#1a56db]" : "text-[#6b7280]")} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="mt-auto pt-4 border-t border-[#e5e7eb]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[#6b7280] hover:bg-[#fef2f2] hover:text-[#991b1b] rounded-md transition-all duration-150"
              >
                <LogOut size={16} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
