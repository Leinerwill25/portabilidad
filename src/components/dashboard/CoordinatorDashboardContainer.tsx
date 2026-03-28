'use client'

import React, { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Clock } from 'lucide-react'
import CoordinatorTabs from './CoordinatorTabs'
import CoordinatorDailyGlobalTable from './CoordinatorDailyGlobalTable'
import CoordinatorStatsTable from './CoordinatorStatsTable'
import RejectionStatsTable from './RejectionStatsTable'
import SupervisorManager from './SupervisorManager'
import CoordinatorRankingTable from './CoordinatorRankingTable'
import DashboardSearchAudit, { type SearchAudit } from './DashboardSearchAudit'

interface CoordinatorDashboardContainerProps {
  initialTab?: string
  recentSearches: SearchAudit[]
  totalSearchesOverall: number
}

export default function CoordinatorDashboardContainer({ 
  initialTab = 'global',
  recentSearches,
  totalSearchesOverall
}: CoordinatorDashboardContainerProps) {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || initialTab)

  // Sync state with URL but without full page reload
  const handleTabChange = (id: string) => {
    setActiveTab(id)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', id)
    // Usamos replace para no llenar el historial y scroll:false para evitar saltos
    window.history.replaceState(null, '', `?${params.toString()}`)
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <CoordinatorTabs activeTab={activeTab} onTabChange={handleTabChange} />
      
      <div className="mt-4 transition-all duration-300 min-h-[400px]">
        {activeTab === 'global' && <CoordinatorDailyGlobalTable />}
        {activeTab === 'stats' && <CoordinatorStatsTable />}
        {activeTab === 'ranking' && <CoordinatorRankingTable />}
        {activeTab === 'rejections' && <RejectionStatsTable />}
        {activeTab === 'team' && <SupervisorManager />}
        
        {activeTab === 'searches' && (
          <div className="space-y-6">
            {/* Informative Legend */}
            <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-8 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm mb-4">
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200">
                 <Clock className="text-slate-600" size={24} />
              </div>
              <div className="flex-1">
                 <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-tight mb-1">Guía de Auditoría de Búsquedas</h4>
                 <p className="text-[12px] text-slate-600 leading-relaxed max-w-3xl">
                    Seguimiento en tiempo real de las consultas realizadas en el portal público. 
                    Visualiza el historial detallado de números (**DN**) consultados, los resultados obtenidos y metadatos de acceso (IP y Fecha). 
                    <strong> Beneficio:</strong> Proporciona trazabilidad completa sobre el uso de la plataforma, permitiendo auditar la actividad y asegurar el uso correcto de la herramienta.
                 </p>
              </div>
            </div>
            
            <DashboardSearchAudit 
              initialSearches={recentSearches}
              totalSearchesOverall={totalSearchesOverall}
            />
          </div>
        )}
      </div>
    </div>
  )
}
