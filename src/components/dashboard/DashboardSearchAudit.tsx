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
  const [showAll, setShowAll] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState<number>(getGoogleSheetsWeek())
  const [isSyncing, setIsSyncing] = useState(false)
  const [revalidatedData, setRevalidatedData] = useState<Record<string, any>>({})

  // Generate week options (Last 12 weeks)
  const weekOptions = useMemo(() => {
    const current = getGoogleSheetsWeek()
    return Array.from({ length: 12 }, (_, i) => current - i).filter(w => w > 0)
  }, [])

  // 1. Filter by Selected Week
  const weeklySearches = useMemo(() => {
    return initialSearches.filter(s => {
      const date = new Date(s.searched_at)
      return getGoogleSheetsWeek(date) === selectedWeek
    })
  }, [initialSearches, selectedWeek])

  // 2. Deduplicate by DN: Keep only the most recent search for each DN within THIS week
  const uniqueSearchesRecent = useMemo(() => {
    const seenDNs = new Set<string>()
    return weeklySearches.filter(s => {
      if (seenDNs.has(s.dn_code)) return false
      seenDNs.add(s.dn_code)
      return true
    })
  }, [weeklySearches])

  const displayedSearches = useMemo(() => {
    return showAll ? uniqueSearchesRecent : uniqueSearchesRecent.slice(0, 20)
  }, [uniqueSearchesRecent, showAll])

  const sellerStats = useMemo(() => {
    const stats: Record<string, { total: number, altas: number }> = {}
    
    // Calculate stats ONLY based on unique DN searches as per user request
    uniqueSearchesRecent.forEach(s => {
      const seller = s.results?.[0]?.sellerName || 'N/A'
      if (!stats[seller]) stats[seller] = { total: 0, altas: 0 }
      
      stats[seller].total++
      
      const hasAlta = s.results?.some(r => {
        const est = r.row?.ESTATUS?.toString().toUpperCase() || r.row?.Estatus?.toString().toUpperCase()
        return est === 'ALTA'
      })
      
      if (hasAlta) stats[seller].altas++
    })
    
    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        ...data,
        rate: data.total > 0 ? Math.round((data.altas / data.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total)
  }, [uniqueSearchesRecent, revalidatedData])

  const handleLiveSync = async () => {
    if (uniqueSearchesRecent.length === 0) return
    
    setIsSyncing(true)
    const toastId = toast.loading(`Sincronizando ${uniqueSearchesRecent.length} DNs con las hojas de cálculo...`)
    
    try {
      const dns = uniqueSearchesRecent.map(s => s.dn_code)
      const response = await fetch('/api/admin/audit/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dns, week: selectedWeek })
      })
      
      if (!response.ok) throw new Error('Error en la sincronización')
      
      const { validationMap } = await response.json()
      setRevalidatedData(validationMap)
      toast.success('Auditoría sincronizada exitosamente con las fuentes de datos.', { id: toastId })
    } catch (error) {
      console.error(error)
      toast.error('No se pudo completar la sincronización en vivo.', { id: toastId })
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
              Historial de Auditoría Semanal
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium italic">
              Segmentado por DN únicos para la semana seleccionada.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Week Selector */}
          <div className="relative">
             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Calendar size={14} />
             </div>
             <select 
               value={selectedWeek}
               onChange={(e) => {
                 setSelectedWeek(parseInt(e.target.value))
                 setRevalidatedData({}) // Reset sync data when week changes
               }}
               className="pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer hover:bg-slate-100 transition-all min-w-[140px]"
             >
               {weekOptions.map(w => (
                 <option key={w} value={w}>Semana {w}</option>
               ))}
             </select>
             <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
          </div>

          <button
            onClick={handleLiveSync}
            disabled={isSyncing || uniqueSearchesRecent.length === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm ${
              isSyncing 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
            }`}
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar (En Vivo)'}
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
                      No se han detectado actividades de búsqueda únicas en este periodo.
                   </div>
                </td>
              </tr>
            ) : (
                uniqueSearchesRecent.map((s) => {
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

      {!showAll && uniqueSearchesRecent.length > 20 && (
        <button 
          onClick={() => setShowAll(true)}
          className="w-full py-5 bg-white hover:bg-slate-50 text-[#3b82f6] text-[11px] font-black uppercase tracking-[0.2em] border-t border-slate-100 flex items-center justify-center gap-3 transition-all"
        >
          Expandir Auditoría Completa ({uniqueSearchesRecent.length - 20} registros)
          <ChevronDown size={14} strokeWidth={3} />
        </button>
      )}

      {showAll && uniqueSearchesRecent.length > 20 && (
        <button 
          onClick={() => setShowAll(false)}
          className="w-full py-5 bg-white hover:bg-slate-50 text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] border-t border-slate-100 flex items-center justify-center gap-3 transition-all"
        >
          Contraer Lista
          <ChevronUp size={14} strokeWidth={3} />
        </button>
      )}

      {/* Executive Results Summary (Footer) */}
      <div className="bg-slate-50/80 p-10 border-t border-[#e2e8f0]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg mb-3 shadow-lg shadow-blue-200">
               <Target size={14} strokeWidth={3} />
               <span className="text-[10px] font-black uppercase tracking-[0.1em]">Reporte de Rendimiento Ejecutivo</span>
            </div>
            <h4 className="text-[20px] font-[950] text-[#0f172a] leading-tight tracking-tight uppercase">Conversión Bruta (Semana {selectedWeek})</h4>
            <p className="text-[12px] text-slate-500 font-medium mt-1 uppercase tracking-tight">Estadísticas exclusivas para los DNs únicos consultados en este periodo.</p>
          </div>
          <div className="flex items-center gap-6">
             <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Impactado</p>
                <p className="text-[22px] font-black text-[#0f172a] leading-none">{uniqueSearchesRecent.length} DNs</p>
             </div>
             <div className="h-10 w-[1px] bg-slate-200 shadow-sm" />
             <div className="text-right">
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Global Auditado</p>
                <p className="text-[22px] font-black text-blue-600 leading-none">{totalSearchesOverall}</p>
             </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sellerStats.map((seller, i) => (
            <div key={i} className="bg-white border border-[#e2e8f0] p-6 rounded-2xl flex flex-col gap-4 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 relative group">
               <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] font-black text-[#0f172a] uppercase tracking-tight group-hover:text-blue-600 transition-colors truncate max-w-[140px]">{seller.name}</span>
                    <div className="flex items-center gap-1.5 opacity-60">
                       <UserCheck size={10} className="text-slate-400" />
                       <span className="text-[9px] font-bold text-slate-400 uppercase">Vand. Senior</span>
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
                 {seller.total} Búsquedas únicas auditadas
               </p>
            </div>
          ))}
          {sellerStats.length === 0 && (
            <div className="col-span-full py-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
              <span className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">No hay registros suficientes para cálculos ejecutivos</span>
            </div>
          )}
        </div>

        <div className="mt-12 flex items-center justify-center">
           <div className="inline-flex items-center gap-4 bg-[#0f172a] text-white px-6 py-3 rounded-2xl shadow-2xl">
              <TrendingUp size={16} className="text-emerald-400" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] border-l border-white/20 pl-4">Panel de Credibilidad Corporativa v2.0</span>
           </div>
        </div>
      </div>
    </div>
  )
}
