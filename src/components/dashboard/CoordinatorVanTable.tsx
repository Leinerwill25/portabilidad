'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  RotateCw, 
  TrendingUp, 
  ChevronRight, 
  BarChart3, 
  Users,
  Search,
  ChevronDown
} from 'lucide-react'

const DAYS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO']

interface DayStat {
  fvc: number
  van: number
  pct: string
  pctRaw: number
}

interface SellerDaily {
  name: string
  days: Record<string, DayStat>
}

interface DailyStatsResponse {
  selectedWeek: string
  availableWeeks: string[]
  sellers: SellerDaily[]
  dailyTotals: Record<string, DayStat>
}

interface Supervisor {
  id: string
  name: string
}

export default function CoordinatorVanTable() {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('')
  const [data, setData] = useState<DailyStatsResponse | null>(null)
  const [loadingSupervisors, setLoadingSupervisors] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeDay, setActiveDay] = useState<string>('')
  const [weekFilter, setWeekFilter] = useState<string>('')

  // 1. Fetch assigned supervisors
  const fetchSupervisors = async () => {
    try {
      const res = await fetch('/api/admin/coordinator/supervisors')
      const json = await res.json()
      setSupervisors(json)
      if (json.length > 0) {
        setSelectedSupervisorId(json[0].id)
      }
    } catch (err) {
      console.error('Error fetching supervisors:', err)
    } finally {
      setLoadingSupervisors(false)
    }
  }

  useEffect(() => {
    fetchSupervisors()
  }, [])

  // 2. Fetch daily stats for selected supervisor
  const fetchDailyStats = useCallback(async (isManual = false) => {
    if (!selectedSupervisorId) return

    if (isManual) setIsRefreshing(true)
    else setLoadingData(true)

    try {
      const ts = Date.now()
      let url = `/api/dashboard/daily-stats?t=${ts}&supervisorId=${selectedSupervisorId}`
      if (weekFilter) url += `&week=${weekFilter}`

      const res = await fetch(url)
      const result = await res.json()
      setData(result)

      // Set default active day if not set or invalid
      if (!activeDay || !DAYS.includes(activeDay)) {
        const todayIdx = new Date().getDay() // 0=Sun, 1=Mon...
        const mappedIdx = todayIdx === 0 ? 5 : todayIdx - 1
        const initialDay = DAYS[Math.min(mappedIdx, 5)]
        setActiveDay(initialDay)
      }
    } catch (error) {
      console.error('[CoordinatorVanTable] Error:', error)
    } finally {
      setLoadingData(false)
      setIsRefreshing(false)
    }
  }, [weekFilter, activeDay, selectedSupervisorId])

  useEffect(() => {
    if (selectedSupervisorId) {
      fetchDailyStats()
    }
  }, [fetchDailyStats, selectedSupervisorId])

  if (loadingSupervisors) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center gap-4 animate-pulse mb-12 shadow-sm">
        <RotateCw className="text-slate-300 animate-spin" size={32} />
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Cargando Supervisores Asignados...</p>
      </div>
    )
  }

  if (supervisors.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-16 flex flex-col items-center justify-center gap-4 mb-12 text-center">
        <Search className="text-slate-200" size={48} />
        <h3 className="text-[16px] font-black text-slate-800 uppercase tracking-tight">Sin Supervisores Asignados</h3>
        <p className="text-[13px] text-slate-500 max-w-sm">No tienes supervisores vinculados a tu cuenta. Contacta al administrador para habilitar esta vista.</p>
      </div>
    )
  }

  const selectedDayStats = data?.dailyTotals[activeDay] || { fvc: 0, van: 0, pct: '0%', pctRaw: 0 }

  return (
    <div className="flex flex-col gap-8 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. Daily Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {DAYS.map((day) => {
          const dayTotal = data?.dailyTotals[day]
          const isSelected = activeDay === day
          const hasData = dayTotal && (dayTotal.fvc > 0 || dayTotal.van > 0)

          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`flex flex-col p-5 rounded-xl border-2 transition-all text-left relative overflow-hidden group ${
                isSelected 
                  ? 'bg-slate-900 border-slate-900 shadow-xl ring-4 ring-blue-500/10 scale-[1.02]' 
                  : 'bg-white border-slate-200 hover:border-slate-900 shadow-sm hover:shadow-md'
              }`}
            >
              <span className={`text-[10px] font-black uppercase tracking-widest mb-2 ${
                isSelected ? 'text-blue-400' : 'text-slate-500'
              }`}>
                {day}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-[22px] font-black tabular-nums tracking-tighter ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {dayTotal?.van || 0}
                </span>
                <span className={`text-[12px] font-bold ${isSelected ? 'text-white/40' : 'text-slate-400'}`}>
                  / {dayTotal?.fvc || 0}
                </span>
              </div>
              <div className={`mt-3 inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-black shadow-inner ${
                isSelected 
                  ? 'bg-white/10 text-white' 
                  : (dayTotal?.pctRaw || 0) >= 80 ? 'bg-emerald-50 text-emerald-600' :
                    (dayTotal?.pctRaw || 0) >= 50 ? 'bg-amber-50 text-amber-600' :
                    'bg-rose-50 text-rose-600'
              }`}>
                {dayTotal?.pct || '0%'}
              </div>
              
              {isSelected && (
                <div className="absolute right-3 top-3 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* 2. Main Detail Table */}
      <div className="bg-white border-2 border-slate-900 rounded-2xl overflow-hidden shadow-2xl relative">
        
        {/* Loading Overlay */}
        {(loadingData || isRefreshing) && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <RotateCw className="text-slate-900 animate-spin" size={32} />
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] animate-pulse">Sincronizando...</span>
            </div>
          </div>
        )}

        {/* Premium Table Header */}
        <div className="bg-slate-50 border-b-2 border-slate-900 py-6 px-8 flex flex-col xl:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-5 w-full xl:w-auto">
             <div className="p-3 bg-slate-900 rounded-xl shadow-lg ring-4 ring-slate-900/5">
                <Users size={24} className="text-white" strokeWidth={2.5} />
             </div>
             <div>
                <h3 className="text-[16px] font-black text-slate-900 uppercase tracking-tight">Resumen Diario</h3>
                <div className="flex items-center gap-2 mt-0.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                   <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest italic">Análisis Diario de Desembolsos</p>
                </div>
             </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 w-full xl:w-auto mt-4 xl:mt-0 pt-6 xl:pt-0 border-t xl:border-t-0 border-slate-200">
             
             {/* Supervisor Filter */}
             <div className="flex flex-col gap-1.5 group min-w-[200px]">
                <div className="flex items-center gap-2 ml-1">
                  <Users size={10} className="text-slate-400" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Site / Supervisor</span>
                </div>
                <div className="relative group">
                  <select 
                    value={selectedSupervisorId}
                    onChange={(e) => setSelectedSupervisorId(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 text-slate-900 text-[12px] font-black rounded-xl px-4 py-2.5 pr-10 outline-none hover:border-slate-900 focus:border-slate-900 transition-all cursor-pointer shadow-sm appearance-none tabular-nums"
                  >
                    {supervisors.map(s => (
                      <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-slate-900 transition-colors" />
                </div>
             </div>

             {/* Week Filter */}
             <div className="flex flex-col gap-1.5 group min-w-[160px]">
                <div className="flex items-center gap-2 ml-1">
                  <BarChart3 size={10} className="text-slate-400" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Semana de Consulta</span>
                </div>
                <div className="relative group">
                  <select 
                    value={weekFilter}
                    onChange={(e) => setWeekFilter(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 text-slate-900 text-[12px] font-black rounded-xl px-4 py-2.5 pr-10 outline-none hover:border-slate-900 focus:border-slate-900 transition-all cursor-pointer shadow-sm appearance-none"
                  >
                    <option value="">Semana Actual</option>
                    {data?.availableWeeks.map(w => (
                      <option key={w} value={w}>Semana {w}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-slate-900 transition-colors" />
                </div>
             </div>

             <button 
                onClick={() => fetchDailyStats(true)}
                disabled={isRefreshing}
                className="mt-5 p-3 bg-slate-900 text-white rounded-xl hover:bg-black transition-all shadow-xl active:scale-95 group border-2 border-slate-900 disabled:opacity-50"
                title="Sincronizar Datos"
              >
                <RotateCw size={16} strokeWidth={3} className={isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
              </button>
          </div>
        </div>

        {/* Dynamic Table Body */}
        <div className="overflow-x-auto">
          {!data || data.sellers.length === 0 ? (
            <div className="p-20 text-center bg-slate-50/50">
               <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white shadow-inner">
                  <BarChart3 className="text-slate-300" size={32} />
               </div>
               <p className="text-[14px] font-black text-slate-500 uppercase tracking-widest">No hay registros de VAN para este periodo</p>
               <p className="text-[11px] text-slate-400 mt-2 font-bold italic">Seleccione otro supervisor o semana</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-900 text-white uppercase tracking-[0.2em] font-black text-[10px]">
                  <th className="px-10 py-5 w-[40%] border-r border-white/5">Ejecutivo</th>
                  <th className="px-6 py-5 text-center w-[20%] border-r border-white/5">FVC</th>
                  <th className="px-6 py-5 text-center w-[20%] border-r border-white/5">Altas</th>
                  <th className="px-10 py-5 text-center w-[20%]">
                     <div className="flex items-center justify-center gap-2">
                        <TrendingUp size={14} className="text-blue-400" />
                        Conversión
                     </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-100">
                {data.sellers.map((seller, idx) => {
                  const dayStat = seller.days[activeDay] || { fvc: 0, van: 0, pct: '0%', pctRaw: 0 }
                  return (
                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-10 py-4 text-[13px] font-black text-slate-900 bg-slate-50/10 border-r-2 border-slate-100 uppercase tracking-tight">
                        {seller.name}
                      </td>
                      <td className="px-6 py-4 text-[15px] text-center font-black text-slate-700 border-r-2 border-slate-100 tabular-nums">
                        {dayStat.fvc}
                      </td>
                      <td className="px-6 py-4 text-[15px] text-center font-black text-slate-900 border-r-2 border-slate-100 tabular-nums">
                        {dayStat.van}
                      </td>
                      <td className="px-0 py-0 text-center">
                        <div className={`h-full w-full px-10 py-4 text-[14px] font-black tabular-nums shadow-inner transition-colors ${
                          dayStat.pctRaw >= 80 ? 'bg-emerald-50 text-emerald-700' :
                          dayStat.pctRaw >= 50 ? 'bg-amber-50 text-amber-700' :
                          'bg-rose-50 text-rose-700'
                        }`}>
                          {dayStat.pct}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {/* Visual Anchor Total Row */}
                <tr className="bg-slate-900 text-white font-black border-t-2 border-slate-900 shadow-[0_-8px_16px_rgba(0,0,0,0.1)]">
                  <td className="px-10 py-6 text-[13px] border-r border-white/10 uppercase tracking-[0.2em] relative">
                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-blue-500" />
                    TOTAL {activeDay}
                  </td>
                  <td className="px-6 py-6 text-[18px] text-center border-r border-white/10 tabular-nums">
                    {selectedDayStats.fvc}
                  </td>
                  <td className="px-6 py-6 text-[18px] text-center border-r border-white/10 tabular-nums">
                    {selectedDayStats.van}
                  </td>
                  <td className="px-10 py-6 text-[22px] text-center bg-blue-600 shadow-inner tabular-nums font-[900]">
                    {selectedDayStats.pct}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {/* 3. Detailed Footer Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
               <TrendingUp size={100} strokeWidth={3} />
            </div>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Métrica Destacada</p>
            <h4 className="text-[18px] font-black uppercase tracking-tight">Conversión Global</h4>
            <div className="flex items-baseline gap-2 mt-4">
               <span className="text-[36px] font-black leading-none">{selectedDayStats.pct}</span>
               <span className="text-[12px] font-bold text-blue-400 uppercase tracking-widest">Performance</span>
            </div>
         </div>

         <div className="bg-slate-50 border-2 border-slate-900 p-6 rounded-2xl flex flex-col justify-between">
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Actividad Reciente</p>
                  <h4 className="text-[16px] font-black text-slate-900 uppercase">Sincronización Excel</h4>
               </div>
               <div className="w-10 h-10 bg-white border-2 border-slate-900 rounded-lg flex items-center justify-center">
                  <RotateCw size={18} className="text-slate-900" />
               </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[12px] font-bold text-slate-800 uppercase tracking-tight">Datos actualizados en tiempo real</span>
            </div>
         </div>

         <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-xl flex flex-col justify-between group">
            <h4 className="text-[15px] font-black uppercase tracking-widest flex items-center gap-2">
               Información
               <ChevronRight size={16} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
            </h4>
            <div className="mt-8">
               <p className="text-[13px] font-bold leading-snug opacity-90">
                   Este panel muestra el desglose exacto de las &quot;Altas&quot; procesadas durante la semana seleccionada por site.
               </p>
            </div>
         </div>
      </div>
    </div>
  )
}
