'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  PlusSquare, 
  User, 
  LogOut,
  ShieldCheck,
  TrendingUp,
  ChevronRight
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SellerSidebarProps {
  session: any
}

const navItems = [
  { href: '/vendedor/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { href: '/vendedor/rendimiento', label: 'Mi Rendimiento', icon: TrendingUp },
  { href: '/vendedor/nuevo-registro', label: 'Nueva Venta', icon: PlusSquare },
]

export default function SellerSidebar({ session }: SellerSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-[260px] bg-[#0f172a] h-screen fixed left-0 top-0 text-white z-50">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-10">
           <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck size={24} />
           </div>
           <div>
              <h2 className="text-lg font-black tracking-tight leading-none">DN CONTROL</h2>
              <span className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em]">Partner Admin</span>
           </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "group flex items-center justify-between p-3.5 rounded-xl transition-all relative overflow-hidden",
                  isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3 relative z-10">
                  <item.icon size={20} className={cn("transition-transform", isActive ? "scale-110" : "group-hover:scale-110")} />
                  <span className="text-[14px] font-bold">{item.label}</span>
                </div>
                {isActive && (
                  <motion.div 
                    layoutId="activeNav"
                    className="absolute inset-0 bg-blue-600"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <ChevronRight size={14} className={cn("opacity-0 group-hover:opacity-100 transition-opacity", isActive ? "opacity-100" : "")} />
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-white/5">
        <div className="bg-white/5 p-4 rounded-2xl flex items-center gap-3 mb-6">
           <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-black text-blue-400 text-xs">
              {session.name?.[0].toUpperCase()}
           </div>
           <div className="overflow-hidden">
               <p className="text-[13px] font-bold truncate">{session.name}</p>
               <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Vendedor Activo</p>
           </div>
        </div>

        <form action="/api/auth/seller/logout" method="POST">
          <button className="w-full flex items-center gap-3 p-3.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all font-bold text-[13px]">
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </form>
      </div>
    </aside>
  )
}
