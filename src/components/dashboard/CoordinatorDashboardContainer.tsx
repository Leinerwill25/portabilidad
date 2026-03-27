'use client'

import React, { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Clock, ArrowUpRight, Check } from 'lucide-react'
import CoordinatorTabs from './CoordinatorTabs'
import CoordinatorDailyGlobalTable from './CoordinatorDailyGlobalTable'
import CoordinatorStatsTable from './CoordinatorStatsTable'
import RejectionStatsTable from './RejectionStatsTable'
import SupervisorManager from './SupervisorManager'

interface SearchAudit {
  id: string
  dn_code: string
  results: unknown
  searched_at: string
  ip_address: string
}

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

            <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              <div className="px-6 py-4 border-b border-[#e5e7eb] flex items-center justify-between bg-white">
                <h3 className="text-[15px] font-bold text-[#1a2744] flex items-center gap-2">
                  <Clock className="text-[#3b82f6]" size={16} />
                  Búsquedas Recientes
                </h3>
                <Link href="/search" className="text-[13px] text-[#1a56db] font-bold hover:underline flex items-center gap-1 group">
                  Ejecutar nueva consulta
                  <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
              </div>
              
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-[#e5e7eb]">
                      <th className="px-6 py-3 text-[11px] font-black text-black uppercase tracking-widest">Código DN</th>
                      <th className="px-6 py-3 text-[11px] font-black text-black uppercase tracking-widest">Estado</th>
                      <th className="px-6 py-3 text-[11px] font-black text-black uppercase tracking-widest">Fecha y Hora</th>
                      <th className="px-6 py-3 text-[11px] font-black text-black uppercase tracking-widest text-right">Origen IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e7eb]">
                    {recentSearches.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-[#9ca3af] text-[13px]">
                          No se registran actividades de búsqueda recientes en el sistema.
                        </td>
                      </tr>
                    ) : (
                      recentSearches.map((s) => (
                        <tr key={s.id} className="hover:bg-[#f1f5f9] transition-colors group">
                          <td className="px-6 py-4">
                            <span className="text-[#1a2744] font-bold font-mono tracking-tight">{s.dn_code}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              s.results && Array.isArray(s.results) && s.results.length > 0 
                                ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]' 
                                : 'bg-[#f9fafb] text-[#374151] border-[#e5e7eb]'
                            }`}>
                              {s.results && Array.isArray(s.results) && s.results.length > 0 ? (
                                <><Check size={10} /> {s.results.length} Hallazgos</>
                              ) : 'Sin registros'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[13px] text-[#4b5563]">
                            {new Date(s.searched_at).toLocaleString('es-VE', { 
                              day: '2-digit', month: '2-digit', year: 'numeric', 
                              hour: '2-digit', minute: '2-digit' 
                            })}
                          </td>
                          <td className="px-6 py-4 text-[12px] text-[#6b7280] text-right font-mono">
                            {s.ip_address}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden divide-y divide-[#e5e7eb] border-b border-[#e5e7eb]">
                {recentSearches.length === 0 ? (
                  <div className="px-6 py-12 text-center text-[#9ca3af] text-[13px]">
                    No se registran actividades recientes.
                  </div>
                ) : (
                  recentSearches.map((s) => (
                    <div key={s.id} className="p-4 flex flex-col gap-3 active:bg-[#f8fafc] transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-[15px] font-bold text-[#1a2744] font-mono">{s.dn_code}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          (s.results as unknown[])?.length > 0 
                            ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]' 
                            : 'bg-[#f9fafb] text-[#374151] border-[#e5e7eb]'
                        }`}>
                          {(s.results as unknown[])?.length > 0 ? `${(s.results as unknown[]).length} Hallazgos` : 'Sin registros'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#6b7280]">
                        <span>{new Date(s.searched_at).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="font-mono text-[10px] opacity-70">IP: {s.ip_address}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Total Summary Footer */}
              <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#e5e7eb] flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-[#64748b] uppercase tracking-widest">Total histórico de consultas</span>
                 </div>
                 <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-[#e2e8f0] shadow-sm">
                    <span className="text-[14px] font-black text-[#1e293b]">{totalSearchesOverall || 0}</span>
                    <span className="text-[10px] font-bold text-[#64748b] uppercase">Vistas</span>
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
