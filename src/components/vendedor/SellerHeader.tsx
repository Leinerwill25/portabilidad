'use client'

import React from 'react'
import { 
  Bell, 
  Search, 
  Menu,
  ChevronDown
} from 'lucide-react'

export default function SellerHeader({ session }: { session: any }) {
  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-6 lg:px-10 flex items-center justify-between">
      {/* Search Bar - Corporate Style */}
      <div className="hidden md:flex items-center gap-4 bg-slate-100/50 border border-slate-200 rounded-2xl px-5 py-2.5 w-full max-w-sm group focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/5 transition-all">
         <Search size={18} className="text-slate-400 group-focus-within:text-blue-600 transition-colors" />
         <input 
          type="text" 
          placeholder="Buscar registros, DNs..." 
          className="bg-transparent border-none outline-none text-[13px] font-medium text-slate-600 w-full placeholder:text-slate-400"
         />
      </div>

      <div className="lg:hidden flex items-center gap-3">
         <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
            <Menu size={20} />
         </div>
      </div>

      <div className="flex items-center gap-6">
         <button className="relative p-2.5 text-slate-400 hover:text-slate-900 transition-colors">
            <Bell size={20} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
         </button>

         <div className="h-8 w-[1px] bg-slate-200" />

         <div className="flex items-center gap-3 group cursor-pointer">
            <div className="text-right hidden sm:block">
               <p className="text-[13px] font-black text-slate-900 leading-none">{session.name}</p>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Socio Comercial</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
               {session.name?.[0].toUpperCase()}
            </div>
            <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
         </div>
      </div>
    </header>
  )
}
