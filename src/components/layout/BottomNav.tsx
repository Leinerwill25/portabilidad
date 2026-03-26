'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Search, MoreHorizontal } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Inicio', href: '/dashboard' },
  { icon: Users, label: 'Vendedores', href: '/sellers' },
  { icon: Search, label: 'Consultar', href: '/search' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e7eb] px-4 pb-safe pt-2 z-40 flex items-center justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 py-1 px-3 min-w-[64px] transition-all duration-200",
              isActive ? "text-[#1a56db]" : "text-[#64748b] active:scale-90"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-xl transition-colors",
              isActive ? "bg-[#eff6ff]" : "bg-transparent"
            )}>
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider",
              isActive ? "opacity-100" : "opacity-70"
            )}>
              {item.label}
            </span>
          </Link>
        )
      })}
      
      <button 
        className="flex flex-col items-center gap-1 py-1 px-3 min-w-[64px] text-[#64748b] active:scale-90"
        onClick={() => {
           // This could trigger the sidebar/drawer for more options
           const sidebarBtn = document.querySelector('button[aria-label="Toggle Sidebar"]') as HTMLButtonElement;
           if (sidebarBtn) sidebarBtn.click();
        }}
      >
        <div className="p-1.5 rounded-xl bg-transparent">
          <MoreHorizontal size={22} strokeWidth={2} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
          Más
        </span>
      </button>
    </nav>
  )
}
