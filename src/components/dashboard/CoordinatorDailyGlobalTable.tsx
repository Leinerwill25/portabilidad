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
  Activity,
  ArrowRightCircle,
  Clock
} from 'lucide-react'

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
      <div className="bg-white border border-slate-200 rounded-[2rem] p-24 flex flex-col items-center justify-center gap-6 mb-12 shadow-xl animate-pulse">
        <div className="relative">
          <RotateCw className="text-blue-600 animate-spin" size={48} strokeWidth={2.5} />
          <div className="absolute inset-0 bg-blue-600/20 blur-xl animate-pulse rounded-full" />
        </div>
        <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em] animate-bounce">
           Consolidando Reporte Global...
        </p>
      </div>
    )
  }

  const selectedDayStats = data?.dailyTotals[activeDay] || { fvc: 0, van: 0, pct: '0%', pctRaw: 0 }

  return (
    <div className="flex flex-col gap-8 mb-20 animate-in fade-in slide-in-from-top-4 duration-700">
      
      {/* 1. Header Legend */}
      <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-8 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm">
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200">
           <LayoutDashboard className="text-slate-600" size={24} />
        </div>
        <div className="flex-1">
           <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-tight mb-1">Centro de Control Operativo Diario</h4>
           <p className="text-[12px] text-slate-500 leading-relaxed max-w-4xl">
              Monitoreo unificado de **Ventas (FVC)** vs **Altas Efectivas**. Selecciona un día para visualizar el desempeño Site por Site.
              <strong> Objetivo:</strong> Detectar y corregir mermas operativas en tiempo real.
           </p>
        </div>
        <div className="hidden xl:flex items-center gap-3 px-6 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <Clock size={16} className="text-blue-500" />
            <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest leading-none">Actualizado: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* 2. Global Cards Container */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
        {DAYS.map((day) => {
          const dayTotal = data?.dailyTotals[day]
          const isSelected = activeDay === day
          
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`flex flex-col p-6 rounded-3xl border transition-all text-left relative overflow-hidden group/card ${
                isSelected 
                  ? 'bg-slate-900 border-slate-900 shadow-2xl scale-[1.02] z-10' 
                  : 'bg-white border-slate-100 hover:border-blue-500 shadow-lg group-hover:shadow-xl'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                 <span className={`text-[10px] font-black uppercase tracking-widest ${
                   isSelected ? 'text-blue-400' : 'text-slate-400'
                 }`}>
                   {day}
                 </span>
              </div>
              
              <div className="flex items-baseline gap-2 mb-4">
                <span className={`text-[28px] font-black tabular-nums tracking-tighter ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                   {dayTotal?.fvc || 0}
                </span>
                <span className={`text-[12px] font-bold ${isSelected ? 'text-slate-500' : 'text-slate-300'}`}>
                   / {dayTotal?.van || 0}
                </span>
              </div>

              <div className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                isSelected 
                  ? 'bg-white/10 text-white' 
                  : (dayTotal?.pctRaw || 0) >= 80 ? 'bg-emerald-50 text-emerald-600' :
                    (dayTotal?.pctRaw || 0) >= 50 ? 'bg-amber-50 text-amber-600' :
                    'bg-rose-50 text-rose-600'
              }`}>
                {dayTotal?.pct || '0%'}
              </div>
            </button>
          )
        })}
      </div>

      {/* 3. Main Data Table */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-[0_25px_70px_-15px_rgba(0,0,0,0.1)] relative">
        
        {/* Dynamic Toolbar */}
        <div className="bg-white py-10 px-12 flex flex-col xl:flex-row items-center justify-between gap-10 border-b border-slate-100">
          <div className="flex items-center gap-6 w-full xl:w-auto">
             <div className="p-4 bg-slate-900 rounded-2xl shadow-xl">
                <Globe size={28} className="text-white" strokeWidth={2.5} />
             </div>
             <div>
                <h3 className="text-[20px] font-black text-slate-900 uppercase tracking-tight">Reporte Global de Gestión</h3>
                <div className="flex items-center gap-3 mt-1.5">
                   <Activity size={12} className="text-blue-500 animate-pulse" />
                   <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                     Operativa Consolidada &bull; <span className="text-blue-600">{activeDay}</span>
                   </p>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-8 w-full xl:w-auto">
             <div className="flex flex-col gap-2 min-w-[200px]">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Semana de Filtro</span>
                <div className="relative group">
                   <select 
                     value={weekFilter}
                     onChange={(e) => setWeekFilter(e.target.value)}
                     className="w-full bg-slate-50 border-2 border-slate-100 text-slate-900 text-[13px] font-black rounded-2xl px-5 py-3.5 pr-10 appearance-none outline-none focus:border-blue-500 hover:bg-white transition-all cursor-pointer shadow-sm"
                   >
                     <option value="">Semana Actual</option>
                     {data?.availableWeeks.map(w => (
                       <option key={w} value={w}>Semana {w}</option>
                     ))}
                   </select>
                   <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                </div>
             </div>

             <button 
                onClick={() => fetchGlobalStats(true)}
                disabled={isRefreshing}
                className="mt-5 p-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-xl active:scale-95 group disabled:opacity-50"
              >
                <RotateCw size={20} className={isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
              </button>
          </div>
        </div>

        {/* The Grid */}
        <div className="overflow-x-auto p-4 md:p-8 no-scrollbar">
          <table className="w-full text-left border-separate border-spacing-0 min-w-[1200px] table-fixed">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase tracking-widest font-black text-[11px]">
                <th className="px-10 py-6 rounded-l-2xl w-[300px]">Site / Supervisor</th>
                <th className="px-6 py-6 text-center w-[120px]">FVC</th>
                <th className="px-6 py-6 text-center w-[140px]">Altas (VAN)</th>
                <th className="px-6 py-6 text-center w-[140px]">No Enrolado</th>
                <th className="px-6 py-6 text-center w-[80px]">AA</th>
                <th className="px-6 py-6 text-center w-[120px] text-blue-600">Sin Status</th>
                <th className="px-6 py-6 text-center w-[120px]">Promesa</th>
                <th className="px-10 py-6 text-center rounded-r-2xl w-[140px]">Conversión</th>
              </tr>
            </thead>
            <tbody className="before:block before:h-4">
              {data && data.supervisors.map((supervisor, idx) => {
                const dayStat = supervisor.days[activeDay] || { fvc: 0, van: 0, no_enrolado: 0, aa: 0, promesa: 0, sin_status: 0, pct: '0%', pctRaw: 0 }
                const isExpanded = expandedSupId === supervisor.id

                return (
                  <React.Fragment key={supervisor.id || idx}>
                    <tr 
                      onClick={() => fetchSellerDetails(supervisor.id)}
                      className={`cursor-pointer transition-all border-b border-slate-50 group ${isExpanded ? 'bg-blue-50/20' : 'hover:bg-slate-50/50'}`}
                    >
                      <td className="px-10 py-7 border-b border-slate-50 flex items-center justify-between">
                         <div className="flex items-center gap-5">
                            <div className={`w-3 h-3 rounded-full shadow-sm transition-all ${isExpanded ? 'bg-blue-600 scale-125' : 'bg-slate-200 group-hover:bg-slate-400'}`} />
                            <span className="text-[15px] font-black text-slate-900 tracking-tight">{supervisor.name}</span>
                         </div>
                         {isExpanded ? <ChevronUp size={18} className="text-blue-600" /> : <ChevronDown size={18} className="text-slate-300 group-hover:text-blue-600" />}
                      </td>
                      <td className="px-6 py-7 text-center border-b border-slate-50 tabular-nums">
                        <span className="text-[16px] font-black text-slate-900">{dayStat.fvc}</span>
                      </td>
                      <td className="px-6 py-7 text-center border-b border-slate-50 tabular-nums">
                        <span className="text-[16px] font-black text-slate-400">{dayStat.van}</span>
                      </td>
                      <td className="px-6 py-7 text-center border-b border-slate-50 tabular-nums">
                        <span className="text-[16px] font-black text-slate-700">{dayStat.no_enrolado ?? 0}</span>
                      </td>
                      <td className="px-6 py-7 text-center border-b border-slate-50 tabular-nums">
                        <span className="text-[16px] font-black text-rose-600">{dayStat.aa ?? 0}</span>
                      </td>
                      <td className="px-6 py-7 text-center border-b border-slate-50 tabular-nums bg-blue-50/10">
                        <span className="text-[16px] font-bold text-slate-900">{dayStat.sin_status ?? 0}</span>
                      </td>
                      <td className="px-6 py-7 text-center border-b border-slate-50 tabular-nums">
                        <span className="text-[16px] font-black text-amber-600">{dayStat.promesa ?? 0}</span>
                      </td>
                      <td className="px-10 py-7 text-center border-b border-slate-50">
                        <div className={`inline-block px-5 py-2 rounded-2xl text-[14px] font-black shadow-sm transition-all ${
                          dayStat.pctRaw >= 80 ? 'bg-emerald-50 text-emerald-700' :
                          dayStat.pctRaw >= 50 ? 'bg-amber-50 text-amber-700' :
                          'bg-rose-50 text-rose-700'
                        }`}>
                          {dayStat.pct}
                        </div>
                      </td>
                    </tr>

                    {/* Drill-down with improved layout */}
                    {isExpanded && (
                      <tr className="bg-slate-50/10">
                        <td colSpan={8} className="px-12 py-10">
                          <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="bg-slate-50/50 px-10 py-5 border-b border-slate-50 flex items-center justify-between">
                               <div className="flex items-center gap-4">
                                  <Users size={16} className="text-blue-500" strokeWidth={3} />
                                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest italic">Análisis de Desempeño por Vendedor</span>
                               </div>
                               <div className="px-3 py-1 bg-white rounded-lg border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                  {expandedSellers.length} Colaboradores
                               </div>
                            </div>
                            
                            {loadingSellers ? (
                              <div className="p-20 flex flex-col items-center justify-center gap-4">
                                <RotateCw className="text-blue-600 animate-spin" size={28} strokeWidth={3} />
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sincronizando Detalles...</span>
                              </div>
                            ) : (
                              <table className="w-full text-left table-fixed">
                                <thead>
                                  <tr className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-50">
                                    <th className="px-12 py-5 w-[300px]">Colaborador</th>
                                    <th className="px-6 py-5 text-center w-[120px]">FVC</th>
                                    <th className="px-6 py-5 text-center w-[140px]">Altas</th>
                                    <th className="px-6 py-5 text-center w-[140px]">No Enrolado</th>
                                    <th className="px-6 py-5 text-center w-[80px]">AA</th>
                                    <th className="px-6 py-5 text-center w-[120px]">Status</th>
                                    <th className="px-6 py-5 text-center w-[120px]">Promesa</th>
                                    <th className="px-12 py-5 text-center w-[140px]">Conv.</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {expandedSellers.map((seller, sidx) => {
                                    const sStat = seller.days[activeDay] || { ventas: 0, fvc: 0, van: 0, no_enrolado: 0, aa: 0, promesa: 0, sin_status: 0, pct: '0%', pctRaw: 0 }
                                    return (
                                      <tr key={sidx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-12 py-4 text-[13px] font-bold text-slate-700 flex items-center gap-4">
                                           <div className="p-1.5 rounded-xl bg-slate-100/50">
                                              <UserCheck size={14} className="text-slate-400" />
                                           </div>
                                           {seller.name}
                                        </td>
                                        <td className="px-6 py-4 text-[14px] font-black text-slate-400 text-center tabular-nums">{sStat.fvc}</td>
                                        <td className="px-6 py-4 text-[14px] font-black text-slate-900 text-center tabular-nums">{sStat.van}</td>
                                        <td className="px-6 py-4 text-[13px] font-bold text-slate-600 text-center tabular-nums">{sStat.no_enrolado ?? 0}</td>
                                        <td className="px-6 py-4 text-[13px] font-bold text-rose-500 text-center tabular-nums">{sStat.aa ?? 0}</td>
                                        <td className="px-6 py-4 text-[13px] font-bold text-slate-700 text-center tabular-nums">{sStat.sin_status ?? 0}</td>
                                        <td className="px-6 py-4 text-[13px] font-bold text-amber-600 text-center tabular-nums">{sStat.promesa ?? 0}</td>
                                        <td className="px-12 py-4 text-center">
                                          <div className={`text-[12px] font-black inline-flex items-center gap-2 ${
                                            sStat.pctRaw >= 80 ? 'text-emerald-600' :
                                            sStat.pctRaw >= 50 ? 'text-amber-600' :
                                            'text-rose-600'
                                          }`}>
                                            {sStat.pct}
                                            <ArrowRightCircle size={10} className="opacity-40" />
                                          </div>
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
              })}
              
              {/* Final Footer Row */}
              <tr className="bg-slate-900 text-white font-black shadow-[0_-20px_50px_rgba(0,0,0,0.3)] relative z-10 overflow-hidden rounded-b-3xl">
                <td className="px-10 py-8 text-[14px] uppercase tracking-[0.3em] relative rounded-bl-3xl">
                   <div className="absolute left-0 top-0 bottom-0 w-3 bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.8)]" />
                   CONSOLIDADO {activeDay}
                </td>
                <td className="px-6 py-8 text-[22px] text-center tabular-nums">
                  {selectedDayStats.fvc}
                </td>
                <td className="px-6 py-8 text-[22px] text-center tabular-nums text-slate-400">
                  {selectedDayStats.van}
                </td>
                <td colSpan={4} className="px-6 py-8 text-right pr-20 text-[10px] text-slate-500 uppercase tracking-[0.3em]">
                   Rendimiento Promedio de Red
                </td>
                <td className="px-10 py-8 text-[32px] text-center bg-blue-600 shadow-inner tabular-nums font-[950] rounded-br-3xl">
                  {selectedDayStats.pct}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Bottom Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl text-white group overflow-hidden relative">
             <TrendingUp className="text-blue-500 mb-6 group-hover:scale-125 transition-transform duration-500" size={40} />
             <div className="relative z-10">
                <h4 className="text-[18px] font-black uppercase tracking-tight mb-3">Eficiencia Operativa</h4>
                <p className="text-[13px] font-medium text-slate-400 leading-relaxed italic">
                  La métrica de **Conversión** ({selectedDayStats.pct}) refleja la capacidad de cierre efectiva de toda tu red en el día {activeDay}.
                </p>
             </div>
             <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-600/10 blur-[60px] rounded-full" />
          </div>

          <div className="bg-white border-2 border-slate-100 p-10 rounded-[2.5rem] shadow-xl flex flex-col justify-between hover:border-blue-500 transition-all">
             <div className="flex flex-col gap-2">
                <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Ratio de Mermas</span>
                <h4 className="text-[16px] font-black text-slate-900 uppercase tracking-tight leading-tight">Registros Sin Estatus</h4>
             </div>
             <div className="mt-8 flex items-baseline gap-4">
                <span className="text-[54px] font-[1000] text-slate-900 tracking-tighter leading-none">
                {data && Object.values(data.supervisors).reduce((acc, s) => acc + (s.days[activeDay]?.sin_status || 0), 0)}
                </span>
                <div className="px-3 py-1 bg-blue-50 rounded-lg text-blue-600 text-[10px] font-black uppercase tracking-widest">DNs Pendientes</div>
             </div>
          </div>

          <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-10 rounded-[2.5rem] flex flex-col justify-center items-center text-center">
             <Activity size={32} className="text-slate-200 mb-4" />
             <p className="text-[11px] font-black text-slate-400 h-10 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                SISTEMA OPERATIVO &bull; v2.5.0
             </p>
          </div>
      </div>
    </div>
  )
}
