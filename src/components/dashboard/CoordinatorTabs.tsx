'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  Globe, 
  BarChart3, 
  AlertCircle, 
  Search,
  BarChart,
  UserRoundCheck,
  ShieldCheck
} from 'lucide-react'

const TABS = [
  { id: 'global', label: 'Resumen Global', icon: Globe, color: '#3b82f6' },
  { id: 'stats', label: 'Estadísticas', icon: BarChart3, color: '#6366f1' },
  { id: 'rejections', label: 'Rechazos', icon: AlertCircle, color: '#d97706' },
  { id: 'team', label: 'Gestión Site', icon: ShieldCheck, color: '#059669' },
  { id: 'searches', label: 'Búsquedas', icon: Search, color: '#8b5cf6' },
]

interface CoordinatorTabsProps {
  activeTab: string
  onTabChange: (id: string) => void
}

export default function CoordinatorTabs({ activeTab, onTabChange }: CoordinatorTabsProps) {
  return (
    <div className="relative mb-10">
      {/* Premium Glass Container - Force single line with NO visible scrollbar */}
      <div className="flex flex-nowrap items-center gap-0.5 p-1.5 bg-slate-900 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.3)] border-2 border-slate-800 rounded-[2.5rem] overflow-x-auto no-scrollbar relative z-10 w-full xl:w-fit max-w-full">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2.5 px-5 py-3.5 rounded-[2rem] text-[10px] font-[900] uppercase tracking-[0.1em] transition-all duration-500 relative group whitespace-nowrap ${
                isActive 
                  ? 'text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {/* Active Background Pill (Framer Motion) */}
              {isActive && (
                <motion.div
                  layoutId="active-tab-pill"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-700 shadow-[0_10px_25px_-5px_rgba(37,99,235,0.4)] rounded-[1.5rem] z-0"
                />
              )}

              <div className={`relative z-10 transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                <Icon 
                  size={18} 
                  strokeWidth={isActive ? 3 : 2} 
                  style={{ color: isActive ? 'white' : tab.color }} 
                />
              </div>

              <span className="relative z-10">{tab.label}</span>

              {/* Hover Indicator */}
              {!isActive && (
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 rounded-[1.5rem] transition-opacity" />
              )}
            </button>
          )
        })}
      </div>

      {/* Decorative Glow Elements */}
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-amber-500/10 blur-[100px] pointer-events-none" />
    </div>
  )
}
