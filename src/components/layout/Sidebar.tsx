'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Search, LogOut, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useSidebar } from './SidebarContext'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const MENU_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Users, label: 'Vendedores', href: '/sellers' },
  { icon: Search, label: 'Buscar DN', href: '/search' },
]

export default function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { isCollapsed, toggle } = useSidebar()
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
      {/* Botón Móvil */}
      <button 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label="Toggle Sidebar Mobile"
        className="lg:hidden fixed top-3 left-4 z-50 p-2.5 bg-white border border-[#e5e7eb] rounded-xl text-[#374151] shadow-sm active:scale-95"
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Container */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 bg-white border-r border-[#e5e7eb] transition-all duration-300 transform shadow-xl lg:shadow-none",
        isCollapsed ? "w-[80px]" : "w-[240px]",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full relative">
          
          {/* Desktop Toggle Button */}
          <button
            onClick={toggle}
            className="hidden lg:flex absolute -right-3 top-20 h-6 w-6 bg-white border border-[#e5e7eb] rounded-full items-center justify-center text-[#1a2744] hover:bg-[#1a56db] hover:text-white transition-all shadow-md z-50"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {/* Logo Section */}
          <div className={cn(
            "h-[60px] flex items-center border-b border-[#e5e7eb] transition-all duration-300",
            isCollapsed ? "px-6" : "px-6"
          )}>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-gradient-to-br from-[#1a56db] to-[#1e40af] rounded-lg flex items-center justify-center text-white shadow-lg shrink-0">
                <Search size={16} strokeWidth={3} />
              </div>
              {!isCollapsed && (
                <span className="text-[15px] font-black text-[#1a2744] tracking-tight whitespace-nowrap animate-in fade-in duration-500">
                  DN CONTROL
                </span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 flex flex-col p-4 overflow-y-auto no-scrollbar">
            {!isCollapsed && (
              <p className="px-4 text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.2em] mb-4 mt-2 animate-in fade-in duration-500">
                Principal
              </p>
            )}
            
            <nav className="space-y-1.5">
              {MENU_ITEMS.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : ''}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 text-[13px] font-bold transition-all duration-200 rounded-xl group",
                      isActive 
                        ? "bg-[#eff6ff] text-[#1a56db] shadow-sm" 
                        : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#1a2744]"
                    )}
                  >
                    <item.icon size={20} className={cn(
                      "shrink-0 transition-transform duration-200 group-hover:scale-110",
                      isActive ? "text-[#1a56db]" : "text-[#94a3b8]"
                    )} />
                    {!isCollapsed && (
                      <span className="whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
                        {item.label}
                      </span>
                    )}
                    {isActive && !isCollapsed && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#1a56db] shadow-[0_0_8px_rgba(26,86,219,0.5)]" />
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Logout Section */}
            <div className="mt-auto pt-4 border-t border-[#e5e7eb]">
              <button
                onClick={handleLogout}
                title={isCollapsed ? 'Cerrar Sesión' : ''}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-bold text-[#ef4444] hover:bg-[#fef2f2] rounded-xl transition-all duration-200 group",
                  isCollapsed && "justify-center"
                )}
              >
                <LogOut size={20} className="shrink-0 group-hover:-translate-x-1 transition-transform" />
                {!isCollapsed && (
                  <span className="whitespace-nowrap animate-in fade-in duration-300">
                    Cerrar Sesión
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}
