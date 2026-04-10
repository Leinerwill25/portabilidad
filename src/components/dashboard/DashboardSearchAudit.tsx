'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { 
  Check, 
  Clock, 
  ArrowUpRight, 
  ChevronDown, 
  ChevronUp,
  UserCheck,
  TrendingUp,
  Target,
  Calendar,
  RefreshCw,
  Search,
  CheckCircle2
} from 'lucide-react'
import { getGoogleSheetsWeek } from '@/lib/sheets/scraper'
import { toast } from 'sonner'

export interface SearchResult {
  sellerName: string
  row: Record<string, string>
}

export interface SearchAudit {
  id: string
  dn_code: string
  results: SearchResult[]
  searched_at: string
  ip_address: string
}

interface DashboardSearchAuditProps {
  initialSearches: SearchAudit[]
  totalSearchesOverall: number
}

export default function DashboardSearchAudit({ initialSearches, totalSearchesOverall }: DashboardSearchAuditProps) {
  const [selectedWeek, setSelectedWeek] = useState<number>(getGoogleSheetsWeek())
  const [isSyncing, setIsSyncing] = useState(false)
  const [revalidatedData, setRevalidatedData] = useState<Record<string, any>>({})
  
  // New states for DB-driven stats
  const [weeklyStats, setWeeklyStats] = useState<{ sellerStats: any[], totalImpacted: number } | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  // Generate week options (Last 12 weeks)
  const weekOptions = useMemo(() => {
    const current = getGoogleSheetsWeek()
    return Array.from({ length: 12 }, (_, i) => current - i).filter(w => w > 0)
  }, [])

  // Fetch stats from DB whenever week changes
  React.useEffect(() => {
    async function fetchStats() {
      setIsLoadingStats(true)
      try {
        const res = await fetch(`/api/admin/audit/stats?week=${selectedWeek}`)
        if (res.ok) {
          const data = await res.json()
          setWeeklyStats(data)
        }
      } catch (error) {
        console.error('Error fetching weekly stats:', error)
      } finally {
        setIsLoadingStats(false)
      }
    }
    fetchStats()
  }, [selectedWeek])

  // List always shows top 20 global activity as per user request
  const displayedSearches = useMemo(() => {
    // Deduplicate by DN for the recent list as well to maintain consistency
    const seenDNs = new Set<string>()
    return initialSearches.filter(s => {
      if (seenDNs.has(s.dn_code)) return false
      seenDNs.add(s.dn_code)
      return true
    }).slice(0, 20)
  }, [initialSearches])

  const handleLiveSync = async () => {
    if (displayedSearches.length === 0) return
    
    setIsSyncing(true)
    const toastId = toast.loading(`Sincronizando DNs recientes con las fuentes de datos...`)
    
    try {
      const dns = displayedSearches.map(s => s.dn_code)
      const response = await fetch('/api/admin/audit/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dns, week: selectedWeek })
      })
      
      if (!response.ok) throw new Error('Error en la sincronización')
      
      const { validationMap } = await response.json()
      setRevalidatedData(validationMap)
      toast.success('Auditoría sincronizada exitosamente.', { id: toastId })
    } catch (error) {
      console.error(error)
      toast.error('No se pudo completar la sincronización.', { id: toastId })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="px-8 py-6 border-b border-[#f1f5f9] flex flex-col lg:flex-row lg:items-center justify-between bg-white gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-100">
            <Clock className="text-white" size={20} />
          </div>
          <div>
            <h3 className="text-[17px] font-black text-[#0f172a] uppercase tracking-tight">
              Historial de Auditoría
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium italic">
              Actividad global constante (20 registros más recientes).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Week Selector - Only affects executive stats footer */}
          <div className="relative">
             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Calendar size={14} />
             </div>
             <select 
               value={selectedWeek}
               onChange={(e) => {
                 setSelectedWeek(parseInt(e.target.value))
                 setRevalidatedData({}) 
               }}
               className="pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer hover:bg-slate-100 transition-all min-w-[140px]"
             >
               {weekOptions.map(w => (
                 <option key={w} value={w}>Estadísticas Sem. {w}</option>
               ))}
             </select>
             <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
          </div>

          <button
            onClick={handleLiveSync}
            disabled={isSyncing || displayedSearches.length === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm ${
              isSyncing 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
            }`}
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Lista'}
          </button>

          <Link href="/search" className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all shadow-sm hover:shadow-md">
            Nueva Consulta
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
      
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-[#f1f5f9]">
              <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Número DN</th>
              <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] text-center">Consultor / Vendedor</th>
              <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] text-center">Validación Estatus</th>
              <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Sincronización</th>
              <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] text-right">Metadatos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9]">
            {displayedSearches.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-slate-400 text-[13px] font-medium">
                   <div className="flex flex-col items-center gap-3">
                      <Target className="opacity-20" size={32} />
                      No hay actividad de búsqueda reciente.
                   </div>
                </td>
              </tr>
            ) : (
              displayedSearches.map((s) => {
                 const liveRes = revalidatedData[s.dn_code]?.results || s.results
                 const hasAlta = liveRes?.some((r: any) => {
                   const est = r.row?.ESTATUS?.toString().toUpperCase() || r.row?.Estatus?.toString().toUpperCase()
                   return est === 'ALTA'
                 })
                 const isSynced = !!revalidatedData[s.dn_code]

                 return (
                   <tr key={s.id} className="hover:bg-slate-50/50 transition-all group">
                     <td className="px-8 py-5">
                       <div className="flex flex-col">
                         <span className="text-[#0f172a] font-black font-mono text-[15px] leading-none tracking-tighter">{s.dn_code}</span>
                         {isSynced && (
                            <span className="text-[8px] font-black text-indigo-500 uppercase mt-1 flex items-center gap-1">
                              <CheckCircle2 size={8} /> Sincronizado
                            </span>
                         )}
                       </div>
                     </td>
                     <td className="px-8 py-5 text-center">
                       <span className="text-slate-700 font-bold text-[13px] px-3 py-1 bg-slate-100 rounded-lg">
                         {liveRes?.[0]?.sellerName || s.results?.[0]?.sellerName || 'S/ID'}
                       </span>
                     </td>
                     <td className="px-8 py-5 text-center">
                       <div className="flex flex-col items-center gap-1.5">
                         <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-wider transition-all ${
                           liveRes && liveRes.length > 0 
                             ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                             : 'bg-slate-50 text-slate-500 border-slate-100'
                         }`}>
                           {liveRes && liveRes.length > 0 ? (
                             <><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {liveRes.length} Coincidencias</>
                           ) : 'Sin Hallazgos'}
                         </div>
                         {hasAlta && (
                           <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                             <Check size={8} strokeWidth={4} /> Validado ALTA
                           </span>
                         )}
                       </div>
                     </td>
                     <td className="px-8 py-5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[12px] font-bold text-slate-700">
                             {new Date(s.searched_at).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">
                             {new Date(s.searched_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                     </td>
                     <td className="px-8 py-5 text-[11px] text-slate-400 text-right font-mono opacity-60">
                       {s.ip_address}
                     </td>
                   </tr>
                 )
               })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile view optimization */}
      <div className="sm:hidden divide-y divide-slate-100">
        {displayedSearches.map((s) => (
          <div key={s.id} className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[16px] font-black text-[#0f172a] font-mono tracking-tighter">{s.dn_code}</span>
              <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                s.results && s.results.length > 0 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                  : 'bg-slate-50 text-slate-500 border-slate-100'
              }`}>
                {s.results && s.results.length > 0 ? `${s.results.length} Hallazgos` : 'Sin registros'}
              </div>
            </div>
            <div className="flex items-end justify-between">
               <div className="flex flex-col gap-1">
                  <span className="text-[12px] font-bold text-slate-700">Vand: {s.results?.[0]?.sellerName || 'N/A'}</span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(s.searched_at).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
               </div>
               {s.results && s.results.some(r => {
                  const est = r.row?.ESTATUS?.toString().toUpperCase() || r.row?.Estatus?.toString().toUpperCase()
                  return est === 'ALTA'
               }) && (
                 <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">Validado ALTA</span>
               )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-50/80 p-10 border-t border-[#e2e8f0]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className={isLoadingStats ? 'animate-pulse' : ''}>
            <div className={`inline-flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg mb-3 shadow-lg shadow-blue-200 transition-opacity ${isLoadingStats ? 'opacity-50' : 'opacity-100'}`}>
               <Target size={14} strokeWidth={3} />
               <span className="text-[10px] font-black uppercase tracking-[0.1em]">Reporte de Rendimiento Ejecutivo</span>
            </div>
            <h4 className="text-[20px] font-[950] text-[#0f172a] leading-tight tracking-tight uppercase">Conversión Bruta (Semana {selectedWeek})</h4>
            <p className="text-[12px] text-slate-500 font-medium mt-1 uppercase tracking-tight">Estadísticas completas de la base de datos para este periodo.</p>
          </div>
          <div className="flex items-center gap-6">
             <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Impacto Único (Sem)</p>
                <p className={`text-[22px] font-black text-[#0f172a] leading-none ${isLoadingStats ? 'animate-pulse' : ''}`}>
                  {isLoadingStats ? '...' : `${weeklyStats?.totalImpacted || 0} DNs`}
                </p>
             </div>
             <div className="h-10 w-[1px] bg-slate-200 shadow-sm" />
             <div className="text-right">
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Histórico Total</p>
                <p className="text-[22px] font-black text-blue-600 leading-none">{totalSearchesOverall}</p>
             </div>
          </div>
        </div>
        
        {isLoadingStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white border border-slate-100 p-6 rounded-2xl h-32" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(weeklyStats?.sellerStats || []).map((seller: any, i: number) => (
              <div key={i} className="bg-white border border-[#e2e8f0] p-6 rounded-2xl flex flex-col gap-4 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 relative group">
                 <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-[13px] font-black text-[#0f172a] uppercase tracking-tight group-hover:text-blue-600 transition-colors truncate max-w-[140px]">{seller.name}</span>
                      <div className="flex items-center gap-1.5 opacity-60">
                         <UserCheck size={10} className="text-slate-400" />
                         <span className="text-[9px] font-bold text-slate-400 uppercase">Auditado</span>
                      </div>
                    </div>
                    <div className={`text-[12px] font-black ${
                      seller.rate >= 70 ? 'text-emerald-500' : 
                      seller.rate >= 40 ? 'text-amber-500' : 
                      'text-rose-500'
                    }`}>
                      {seller.rate}%
                    </div>
                 </div>
                 
                 <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-tight">
                      <span className="text-slate-400">Efectividad</span>
                      <span className="text-slate-900">{seller.altas} / {seller.total}</span>
                    </div>
                    <div className="w-full bg-[#f1f5f9] h-2 rounded-full overflow-hidden p-[1px]">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(0,0,0,0.1)] ${
                          seller.rate >= 70 ? 'bg-emerald-500' : 
                          seller.rate >= 40 ? 'bg-amber-500' : 
                          'bg-rose-500'
                        }`} 
                        style={{ width: `${seller.rate}%` }}
                      />
                    </div>
                 </div>
  
                 <p className="text-[9px] font-bold text-slate-500 uppercase leading-none opacity-0 group-hover:opacity-100 transition-opacity">
                   {seller.total} DNs únicos semanales
                 </p>
              </div>
            ))}
            {(!weeklyStats || weeklyStats.sellerStats.length === 0) && (
              <div className="col-span-full py-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
                <span className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">No hay registros para la semana {selectedWeek}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-12 flex items-center justify-center">
           <div className="inline-flex items-center gap-4 bg-[#0f172a] text-white px-6 py-3 rounded-2xl shadow-2xl">
              <TrendingUp size={16} className="text-emerald-400" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] border-l border-white/20 pl-4">Auditoría Directa de Base de Datos v2.1</span>
           </div>
        </div>
      </div>
    </div>
  )
}
