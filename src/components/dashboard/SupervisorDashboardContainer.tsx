'use client'

import React, { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import SupervisorTabs from './SupervisorTabs'
import CoordinatorDailyGlobalTable from './CoordinatorDailyGlobalTable'
import CoordinatorStatsTable from './CoordinatorStatsTable'
import CoordinatorRankingTable from './CoordinatorRankingTable'
import CoordinatorSalesTable from './CoordinatorSalesTable'
import RejectionStatsTable from './RejectionStatsTable'
import { Users, FileSpreadsheet, Search as SearchIcon } from 'lucide-react'

interface SupervisorDashboardContainerProps {
  initialTab?: string
  supervisorId?: string
  stats: {
    sellersCount: number
    sheetsCount: number
    todaySearchesCount: number
  }
}

export default function SupervisorDashboardContainer({ 
  initialTab = 'ventas',
  supervisorId,
  stats
}: SupervisorDashboardContainerProps) {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || initialTab)

  const handleTabChange = (id: string) => {
    setActiveTab(id)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', id)
    window.history.replaceState(null, '', `?${params.toString()}`)
  }

  const statCards = [
    { label: 'Vendedores Totales', value: stats.sellersCount, icon: Users, color: 'blue' },
    { label: 'Sheets Registrados', value: stats.sheetsCount, icon: FileSpreadsheet, color: 'green' },
    { label: 'Búsquedas Hoy', value: stats.todaySearchesCount, icon: SearchIcon, color: 'violet' },
  ]

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Metrics Summary Cards - Always visible for Supervisor */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, i) => (
          <div 
            key={i} 
            className="group bg-white p-6 rounded-2xl border border-[#e2e8f0] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500 opacity-[0.03] rounded-bl-full group-hover:opacity-[0.08] transition-opacity`} />
            
            <div className="flex items-center gap-4 relative">
              <div className={`p-3 rounded-xl bg-${stat.color}-100 text-${stat.color}-600 group-hover:scale-110 transition-transform duration-500`}>
                <stat.icon size={22} />
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] font-black text-[#64748b] uppercase tracking-widest">{stat.label}</span>
                <span className="text-[28px] font-black text-[#1e293b] leading-tight">{stat.value}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <SupervisorTabs activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="mt-4 transition-all duration-300 min-h-[400px]">
        {activeTab === 'ventas' && <CoordinatorSalesTable supervisorId={supervisorId} />}
        {activeTab === 'daily' && <CoordinatorDailyGlobalTable supervisorId={supervisorId} />}
        {activeTab === 'monthly' && <CoordinatorStatsTable supervisorId={supervisorId} />}
        {activeTab === 'ranking' && <CoordinatorRankingTable supervisorId={supervisorId} />}
        {activeTab === 'rejections' && <RejectionStatsTable supervisorId={supervisorId} />}
      </div>
    </div>
  )
}
