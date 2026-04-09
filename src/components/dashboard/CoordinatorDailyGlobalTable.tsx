'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  RotateCw, 
  TrendingUp, 
  BarChart3, 
  LayoutDashboard,
  Globe,
  ChevronDown,
  Users,
  UserCheck,
  ChevronUp,
  Camera
} from 'lucide-react'
import { copyElementToClipboard } from '@/lib/utils/screenshot'

const DAYS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO']

interface DayStat {
  ventas: number
  fvc: number
  van: number
  no_enrolado?: number
  aa?: number
  promesa?: number
  sin_status?: number
  pct: string
  pctRaw: number
}

interface SupervisorDaily {
  id: string
  name: string
  days: Record<string, DayStat>
}

interface DailyGlobalResponse {
  selectedWeek: string
  availableWeeks: string[]
  supervisors: SupervisorDaily[]
  dailyTotals: Record<string, DayStat>
}

interface SellerDaily {
  name: string
  days: Record<string, DayStat>
}

export default function CoordinatorDailyGlobalTable({ supervisorId }: { supervisorId?: string }) {
  const [data, setData] = useState<DailyGlobalResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeDay, setActiveDay] = useState<string>('')
  const [weekFilter, setWeekFilter] = useState<string>('')
  
  // Drill-down state
  const [expandedSupId, setExpandedSupId] = useState<string | null>(null)
  const [expandedSellers, setExpandedSellers] = useState<SellerDaily[]>([])
  const [loadingSellers, setLoadingSellers] = useState(false)

  const fetchGlobalStats = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true)
    else setLoading(true)

    try {
      const ts = Date.now()
      let url = `/api/admin/stats/daily-global?t=${ts}`
      if (supervisorId) url += `&supervisorId=${supervisorId}`
      if (weekFilter) url += `&week=${weekFilter}`
      if (isManual) url += `&update=true`

      const res = await fetch(url)
      const result = await res.json()
      setData(result)

      if (!activeDay || !DAYS.includes(activeDay)) {
        const todayIdx = new Date().getDay()
        const mappedIdx = todayIdx === 0 ? 5 : todayIdx - 1
        const initialDay = DAYS[Math.min(mappedIdx, 5)]
        setActiveDay(initialDay)
      }
    } catch (error) {
      console.error('[CoordinatorDailyGlobalTable] Error:', error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [weekFilter, activeDay, supervisorId])

  const fetchSellerDetails = useCallback(async (supId: string) => {
    // If already expanded, collapse it
    if (expandedSupId === supId) {
      setExpandedSupId(null)
      return
    }

    setExpandedSupId(supId)
    setLoadingSellers(true)
    try {
      const ts = Date.now()
      let url = `/api/dashboard/daily-stats?t=${ts}&supervisorId=${supId}`
      if (weekFilter) url += `&week=${weekFilter}`
      
      const res = await fetch(url)
      const result = await res.json()
      setExpandedSellers(result.sellers || [])
    } catch (error) {
      console.error('Error fetching seller details:', error)
    } finally {
      setLoadingSellers(false)
    }
  }, [expandedSupId, weekFilter])

  useEffect(() => {
    fetchGlobalStats()
  }, [fetchGlobalStats])

  if (loading && !data) {
    return (
      <div className="bg-white border-2 border-slate-900 rounded-2xl p-16 flex flex-col items-center justify-center gap-4 mb-12 shadow-xl animate-pulse">
        <RotateCw className="text-slate-900 animate-spin" size={40} strokeWidth={3} />
        <p className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em]">
          {isRefreshing ? 'Sincronizando...' : 'Consolidando Reporte Global...'}
        </p>
      </div>
    )
  }

  const selectedDayStats = data?.dailyTotals[activeDay] || { fvc: 0, van: 0, pct: '0%', pctRaw: 0 }

  return (
    <div className="flex flex-col gap-8 mb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      
      {/* 1. Global Legend / Guidance */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-[2rem] p-8 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm">
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-blue-200">
           <LayoutDashboard className="text-blue-600" size={24} />
        </div>
        <div className="flex-1">
           <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-tight mb-1">Guía de Resumen Diario</h4>
           <p className="text-[12px] text-slate-600 leading-relaxed max-w-3xl">
              Vista unificada que compara las ventas ingresadas (**FVC**) contra las **Altas** efectivas procesadas en el día. 
              Esta visualización permite un control de mermas en tiempo real por cada Site vinculado.
              <strong> Beneficio:</strong> Te permite intervenir de inmediato en equipos con baja **Conversión** antes del cierre operativo.
           </p>
        </div>
      </div>

      {/* 2. Global Daily Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {DAYS.map((day) => {
          const dayTotal = data?.dailyTotals[day]
          const isSelected = activeDay === day
          
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`flex flex-col p-6 rounded-2xl border-2 transition-all text-left relative overflow-hidden group/card ${
                isSelected 
                  ? 'bg-blue-600 border-blue-600 shadow-2xl scale-[1.05] z-10' 
                  : 'bg-white border-slate-100 hover:border-blue-600 shadow-lg hover:shadow-2xl'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                 <span className={`text-[10px] font-black uppercase tracking-widest ${
                   isSelected ? 'text-white/70' : 'text-slate-400'
                 }`}>
                   {day}
                 </span>
                 {isSelected && <Globe size={12} className="text-white/40 animate-pulse" />}
              </div>
              
              <div className="flex items-baseline gap-1.5">
                <span className={`text-[26px] font-black tabular-nums tracking-tighter ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                   {dayTotal?.fvc || 0}
                </span>
                <span className={`text-[12px] font-bold ${isSelected ? 'text-white/40' : 'text-slate-400'}`}>
                   / {dayTotal?.van || 0}
                </span>
              </div>

              <div className={`mt-4 inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-black shadow-inner transition-colors ${
                isSelected 
                  ? 'bg-white/20 text-white' 
                  : (dayTotal?.pctRaw || 0) >= 80 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                    (dayTotal?.pctRaw || 0) >= 50 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                    'bg-rose-50 text-rose-600 border border-rose-100'
              }`}>
                {dayTotal?.pct || '0%'}
              </div>
            </button>
          )
        })}
      </div>

      {/* 3. Global Comparison Table + Drill-down */}
      <div className="bg-white border-2 border-slate-900 rounded-[2rem] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] relative" id="daily-global-report">
        
        {/* Loading Overlay */}
        {(loading || isRefreshing) && data && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-50 flex items-center justify-center">
             <div className="bg-slate-900 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-3 scale-90">
                <RotateCw className="text-white animate-spin" size={24} strokeWidth={3} />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Sincronizando...</span>
             </div>
          </div>
        )}

        {/* Dynamic Header */}
        <div className="bg-slate-900 py-8 px-10 flex flex-col xl:flex-row items-center justify-between gap-10">
          <div className="flex items-center gap-6 w-full xl:w-auto">
             <div className="p-4 bg-blue-600 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                <LayoutDashboard size={28} className="text-white" strokeWidth={2.5} />
             </div>
             <div>
                <h3 className="text-[18px] font-black text-white uppercase tracking-tight">Reporte Global Unificado</h3>
                <div className="flex items-center gap-3 mt-1 underline decoration-blue-500/50 underline-offset-4">
                   <Globe size={12} className="text-blue-400" />
                   <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Visualización 360 - {activeDay}</p>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-8 w-full xl:w-auto">
             <div className="flex flex-col gap-2 min-w-[180px]">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Semana de Filtro</span>
                <div className="relative group">
                   <select 
                     value={weekFilter}
                     onChange={(e) => setWeekFilter(e.target.value)}
                     className="w-full bg-slate-800 border-2 border-slate-700 text-white text-[13px] font-black rounded-xl px-4 py-3 pr-10 outline-none hover:border-blue-500 focus:border-blue-500 transition-all cursor-pointer shadow-xl appearance-none"
                   >
                     <option value="">Semana Actual</option>
                     {data?.availableWeeks.map(w => (
                       <option key={w} value={w}>Semana {w}</option>
                     ))}
                   </select>
                   <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-blue-400 transition-colors pointer-events-none" />
                </div>
             </div>

             <button 
                onClick={() => copyElementToClipboard('daily-global-report')}
                className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all active:scale-95 border border-white/20 shadow-lg mt-5"
                title="Capturar Reporte"
              >
                <Camera size={18} />
              </button>

              <button 
                onClick={() => fetchGlobalStats(true)}
                disabled={isRefreshing}
                className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-xl active:scale-95 group disabled:opacity-50 mt-5 border border-blue-400/20"
              >
                <RotateCw size={18} strokeWidth={3} className={isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
              </button>
          </div>
        </div>

        {/* Data Grid */}
        <div className="overflow-x-auto p-1 bg-slate-900 no-scrollbar">
           <div className="bg-white rounded-t-[1.5rem] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-black uppercase tracking-widest font-black text-[11px] border-b border-slate-100">
                  <th className="px-10 py-6 w-[40%] border-r border-slate-100">Site / Supervisor</th>
                  <th className="px-6 py-6 text-center w-[20%] border-r border-slate-100">Total FVC</th>
                  <th className="px-6 py-6 text-center w-[20%] border-r border-slate-100 text-blue-600">Altas</th>
                  <th className="px-10 py-6 text-center w-[20%]">Conversión %</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-50">
                {!data || data.supervisors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-10 py-24 text-center">
                       <BarChart3 className="mx-auto text-slate-200 mb-4" size={48} />
                       <p className="text-[14px] font-black text-slate-400 uppercase tracking-widest italic">Iniciando consulta global...</p>
                    </td>
                  </tr>
                ) : (
                  data.supervisors.map((supervisor, idx) => {
                    const dayStat = supervisor.days[activeDay] || { ventas: 0, fvc: 0, van: 0, pct: '0%', pctRaw: 0 }
                    const isExpanded = expandedSupId === supervisor.id

                    return (
                      <React.Fragment key={supervisor.id || idx}>
                        <tr 
                          onClick={() => fetchSellerDetails(supervisor.id)}
                          className={`cursor-pointer transition-all group ${isExpanded ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'}`}
                        >
                          <td className="px-10 py-5 text-[14px] font-black text-slate-900 border-r-2 border-slate-50 uppercase tracking-tight flex items-center justify-between">
                             <div className="flex items-center gap-4">
                               <div className={`w-2.5 h-2.5 rounded-sm transition-colors ${isExpanded ? 'bg-blue-600' : 'bg-slate-900 group-hover:bg-blue-600'}`} />
                               {supervisor.name}
                             </div>
                             {isExpanded ? <ChevronUp size={16} className="text-blue-600" /> : <ChevronDown size={16} className="text-slate-300 group-hover:text-blue-600" />}
                          </td>
                          <td className="px-6 py-5 text-[16px] text-center font-black text-slate-600 border-r-2 border-slate-50 tabular-nums">
                            {dayStat.fvc}
                          </td>
                          <td className="px-6 py-5 text-[16px] text-center font-black text-slate-900 border-r-2 border-slate-50 tabular-nums">
                            {dayStat.van}
                          </td>
                          <td className="px-0 py-0 text-center">
                            <div className={`h-full w-full px-10 py-5 text-[15px] font-black tabular-nums transition-all ${
                              dayStat.pctRaw >= 80 ? 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100' :
                              dayStat.pctRaw >= 50 ? 'bg-amber-50 text-amber-700 group-hover:bg-amber-100' :
                              'bg-rose-50 text-rose-700 group-hover:bg-rose-100'
                            }`}>
                              {dayStat.pct}
                            </div>
                          </td>
                        </tr>

                        {/* Drill-down Seller Details */}
                        {isExpanded && (
                          <tr className="bg-slate-50/30">
                            <td colSpan={5} className="px-10 py-6 border-b-2 border-slate-900/10">
                              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="bg-slate-100/50 px-6 py-3 border-b border-slate-200 flex items-center gap-3">
                                   <Users size={14} className="text-slate-500" />
                                   <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Detalle por Vendedores (Altas)</span>
                                </div>
                                
                                {loadingSellers ? (
                                  <div className="p-10 flex flex-col items-center justify-center gap-3">
                                    <RotateCw className="text-blue-600 animate-spin" size={20} strokeWidth={3} />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultando Vendedores...</span>
                                  </div>
                                ) : expandedSellers.length === 0 ? (
                                  <div className="p-10 text-center text-slate-400 text-[12px] font-bold uppercase tracking-widest">
                                    No hay registros de vendedores para este Site
                                  </div>
                                ) : (
                                  <table className="w-full text-left">
                                    <thead>
                                      <tr className="bg-white text-black text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                        <th className="px-8 py-3">Vendedor</th>
                                        <th className="px-6 py-3 text-center">FVC</th>
                                        <th className="px-6 py-3 text-center">Altas</th>
                                        <th className="px-6 py-3 text-center">No Enrolado</th>
                                        <th className="px-6 py-3 text-center">AA</th>
                                        <th className="px-6 py-3 text-center">Sin Status</th>
                                        <th className="px-6 py-3 text-center">Promesa</th>
                                        <th className="px-8 py-3 text-center">% Conv.</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                      {expandedSellers.map((seller, sidx) => {
                                        const sStat = seller.days[activeDay] || { ventas: 0, fvc: 0, van: 0, no_enrolado: 0, aa: 0, promesa: 0, sin_status: 0, pct: '0%', pctRaw: 0 }
                                        return (
                                          <tr key={sidx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-8 py-3 text-[12px] font-bold text-slate-700 flex items-center gap-3">
                                               <div className="p-1 rounded bg-slate-100">
                                                  <UserCheck size={12} className="text-slate-400" />
                                               </div>
                                               {seller.name}
                                            </td>
                                            <td className="px-6 py-3 text-[12px] font-black text-slate-500 text-center tabular-nums">{sStat.fvc}</td>
                                            <td className="px-6 py-3 text-[12px] font-black text-slate-900 text-center tabular-nums">{sStat.van}</td>
                                            <td className="px-6 py-3 text-[12px] font-bold text-slate-700 text-center tabular-nums">{sStat.no_enrolado ?? 0}</td>
                                            <td className="px-6 py-3 text-[12px] font-bold text-rose-700 text-center tabular-nums">{sStat.aa ?? 0}</td>
                                            <td className="px-6 py-3 text-[12px] font-bold text-slate-800 text-center tabular-nums bg-slate-100">{sStat.sin_status ?? 0}</td>
                                            <td className="px-6 py-3 text-[12px] font-bold text-amber-700 text-center tabular-nums">{sStat.promesa ?? 0}</td>
                                            <td className="px-8 py-3 text-center">
                                              <span className={`text-[11px] font-black ${
                                                sStat.pctRaw >= 80 ? 'text-emerald-600' :
                                                sStat.pctRaw >= 50 ? 'text-amber-600' :
                                                'text-rose-600'
                                              }`}>
                                                {sStat.pct}
                                              </span>
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })
                )}
                
                {/* Visual Consolidated Totals */}
                <tr className="bg-slate-900 text-white font-black shadow-[0_-10px_30px_rgba(0,0,0,0.2)] relative z-20">
                  <td className="px-10 py-4 text-[12px] border-r border-white/5 uppercase tracking-[0.2em] relative">
                    <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.8)]" />
                    CONSOLIDADO {activeDay}
                  </td>
                  <td className="px-6 py-4 text-[18px] text-center border-r border-white/5 tabular-nums">
                    {selectedDayStats.fvc}
                  </td>
                  <td className="px-6 py-4 text-[18px] text-center border-r border-white/5 tabular-nums">
                    {selectedDayStats.van}
                  </td>
                  <td className="px-10 py-4 text-[22px] text-center bg-blue-600 shadow-inner tabular-nums font-[900]">
                    {selectedDayStats.pct}
                  </td>
                </tr>
              </tbody>
            </table>
           </div>
        </div>
      </div>

      {/* 3. Analysis Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="bg-white border-2 border-slate-900 p-8 rounded-3xl shadow-xl flex flex-col justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">KPI Crítico</p>
            <h4 className="text-[15px] font-black text-slate-900 uppercase tracking-tight">Conversión Global {activeDay}</h4>
            <div className="mt-6 flex items-baseline gap-3">
               <span className="text-[42px] font-[950] text-slate-900 tracking-tighter leading-none">{selectedDayStats.pct}</span>
               <TrendingUp size={24} className={selectedDayStats.pctRaw >= 70 ? 'text-emerald-500' : 'text-rose-500'} />
            </div>
         </div>

         <div className="bg-blue-600 p-8 rounded-3xl shadow-2xl text-white transform hover:-translate-y-1 transition-transform">
            <Globe className="text-white/20 mb-4" size={32} />
            <h4 className="text-[16px] font-black uppercase tracking-widest mb-2">Visión Unificada</h4>
            <p className="text-[12px] font-bold opacity-80 leading-relaxed">
               Este panel ahora integra el detalle de Altas por Site y por Vendedor. Haz clic en cualquier site para ver su desglose.
            </p>
         </div>

         <div className="bg-slate-900 p-8 rounded-3xl shadow-xl text-white">
            <RotateCw className="text-blue-500 mb-4" size={24} />
            <h4 className="text-[16px] font-black uppercase tracking-widest mb-2">Sincronización</h4>
            <p className="text-[12px] font-bold opacity-70 leading-relaxed">
               Consulta directa a Google Sheets. Los datos reflejan la actividad procesada y validada hasta el momento.
            </p>
         </div>

         <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-3xl flex flex-col justify-center items-center text-center">
            <LayoutDashboard size={24} className="text-slate-300 mb-2" />
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">v1.3.0 Unified Global Engine</span>
         </div>
      </div>
    </div>
  )
}
