'use client'

import { useState, useEffect, useCallback } from 'react'
import { RotateCw, TrendingUp, ChevronRight, BarChart3, Users } from 'lucide-react'

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

export default function DailyFvcTable({ supervisorId }: { supervisorId?: string }) {
  const [data, setData] = useState<DailyStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeDay, setActiveDay] = useState<string>('')
  const [weekFilter, setWeekFilter] = useState<string>('')

  const fetchDailyStats = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true)
    else setLoading(true)

    try {
      const ts = Date.now()
      let url = `/api/dashboard/daily-stats?t=${ts}`
      if (weekFilter) url += `&week=${weekFilter}`
      if (supervisorId) url += `&supervisorId=${supervisorId}`

      const res = await fetch(url)
      const result = await res.json()
      setData(result)

      // Set default active day if not set
      if (!activeDay || !DAYS.includes(activeDay)) {
        const todayIdx = new Date().getDay() // 0=Sun, 1=Mon...
        const mappedIdx = todayIdx === 0 ? 5 : todayIdx - 1 // 0=Mon, 5=Sat, Sunday defaults to Saturday or Monday
        const initialDay = DAYS[Math.min(mappedIdx, 5)]
        setActiveDay(initialDay)
      }
    } catch (error) {
      console.error('[DailyFvcTable] Error:', error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [weekFilter, activeDay, supervisorId])

  useEffect(() => {
    fetchDailyStats()
  }, [fetchDailyStats])

  if (loading && !data) {
    return (
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-12 flex flex-col items-center justify-center gap-4 shadow-sm min-h-[400px]">
        <RotateCw className="text-[#3b82f6] animate-spin" size={32} />
        <p className="text-[13px] font-bold text-[#64748b] uppercase tracking-widest">Sincronizando Datos Diarios...</p>
      </div>
    )
  }

  if (!data || data.sellers.length === 0) {
    return (
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-12 flex flex-col items-center justify-center gap-4 shadow-sm min-h-[400px] border-dashed">
        <BarChart3 className="text-[#94a3b8]" size={40} />
        <p className="text-[14px] font-bold text-[#1e293b]">No hay registros de VAN para la semana seleccionada.</p>
        <div className="flex items-center gap-3 mt-2">
          <select 
            value={weekFilter} 
            onChange={(e) => setWeekFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-bold rounded px-3 py-1.5 outline-none"
          >
            <option value="">Semana Actual</option>
            {data?.availableWeeks.map(w => <option key={w} value={w}>Semana {w}</option>)}
          </select>
          <button onClick={() => fetchDailyStats(true)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 transition-colors">
             <RotateCw size={16} />
          </button>
        </div>
      </div>
    )
  }

  const selectedDayStats = data.dailyTotals[activeDay] || { fvc: 0, van: 0, pct: '0%', pctRaw: 0 }

  return (
    <div className="flex flex-col gap-6 mb-12">
      {/* 1. SECCIÓN DE RESUMEN COMPARATIVO (Métricas de alto nivel para toda la semana) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {DAYS.map((day) => {
          const dayTotal = data.dailyTotals[day]
          const isSelected = activeDay === day
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`flex flex-col p-4 rounded-xl border transition-all text-left relative overflow-hidden group ${
                isSelected 
                  ? 'bg-[#1e293b] border-[#1e293b] shadow-lg ring-2 ring-[#3b82f6]/20' 
                  : 'bg-white border-[#e2e8f0] hover:border-[#1e293b] shadow-sm'
              }`}
            >
              <span className={`text-[10px] font-black uppercase tracking-tighter mb-1.5 ${
                isSelected ? 'text-white/60' : 'text-[#64748b]'
              }`}>
                {day}
              </span>
              <div className="flex items-baseline gap-1">
                <span className={`text-[18px] font-black ${isSelected ? 'text-white' : 'text-[#1e293b]'}`}>
                  {dayTotal?.van || 0}
                </span>
                <span className={`text-[11px] font-bold ${isSelected ? 'text-white/40' : 'text-[#94a3b8]'}`}>
                  / {dayTotal?.fvc || 0}
                </span>
              </div>
              <div className={`mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black ${
                dayTotal?.pctRaw >= 80 ? 'bg-emerald-500/10 text-emerald-500' :
                dayTotal?.pctRaw >= 50 ? 'bg-amber-500/10 text-amber-500' :
                'bg-rose-500/10 text-rose-500'
              }`}>
                {dayTotal?.pct || '0%'}
              </div>
              
              {isSelected && (
                <div className="absolute right-2 top-2">
                  <ChevronRight size={14} className="text-white/20" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* 2. TABLA DE DETALLE DIARIO */}
      <div className="bg-white border border-[#334155] rounded-xl overflow-hidden shadow-2xl border-t-4 border-t-[#3b82f6]">
        {/* Header con Filtro Semanal */}
        <div className="bg-[#f8fafc] border-b border-[#e2e8f0] py-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <div className="p-2 bg-[#3b82f6]/10 rounded-lg">
                <Users size={20} className="text-[#3b82f6]" />
             </div>
             <div>
                <h3 className="text-[14px] font-black text-[#1e293b] uppercase tracking-tight">Resumen Diario</h3>
                <p className="text-[11px] font-bold text-[#64748b] uppercase">Desglose por Ejecutivo - {activeDay}</p>
             </div>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
             <div className="flex flex-col gap-1 w-full sm:w-auto">
                <span className="text-[9px] font-black text-[#64748b] uppercase tracking-tighter ml-1">Semana de Consulta</span>
                <select 
                  value={weekFilter}
                  onChange={(e) => setWeekFilter(e.target.value)}
                  className="bg-white border border-[#cbd5e1] text-[#1e293b] text-[12px] font-bold rounded-lg px-3 py-2 outline-none hover:border-[#3b82f6] shadow-sm appearance-none min-w-[150px]"
                >
                  <option value="">Semana Actual</option>
                  {data.availableWeeks.map(w => (
                    <option key={w} value={w}>Semana {w}</option>
                  ))}
                </select>
             </div>
             <button 
                onClick={() => fetchDailyStats(true)}
                disabled={isRefreshing}
                className="mt-4 p-2.5 bg-[#1e293b] text-white rounded-lg hover:bg-[#0f172a] transition-all shadow-md group border border-[#1e293b]"
                title="Sincronizar Datos"
              >
                <RotateCw size={14} className={isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
              </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1e293b] text-white border-b border-white/5">
                <th className="px-8 py-4 text-[11px] font-black uppercase tracking-wider border-r border-white/5">Ejecutivo</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-center border-r border-white/5">FVC</th>
                <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-center border-r border-white/5">Altas</th>
                <th className="px-8 py-4 text-[11px] font-black uppercase tracking-wider text-center flex items-center justify-center gap-2">
                   <TrendingUp size={12} className="text-[#3b82f6]" />
                   Conversión
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {data.sellers.map((seller, idx) => {
                const dayStat = seller.days[activeDay] || { fvc: 0, van: 0, pct: '0%', pctRaw: 0 }
                return (
                  <tr key={idx} className="hover:bg-[#f8fafc] transition-colors group border-b border-[#f1f5f9]">
                    <td className="px-8 py-4 text-[14px] font-bold text-[#1e293b] border-r border-[#f1f5f9]">
                      {seller.name}
                    </td>
                    <td className="px-6 py-4 text-[14px] text-center font-medium text-[#475569] border-r border-[#f1f5f9]">
                      {dayStat.fvc}
                    </td>
                    <td className="px-6 py-4 text-[14px] text-center font-bold text-[#1e293b] border-r border-[#f1f5f9]">
                      {dayStat.van}
                    </td>
                    <td className="px-0 py-0 text-center border-l border-[#f1f5f9]">
                      <div className={`h-full w-full px-8 py-4 text-[13px] font-black ${
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
              {/* Total Row for the Active Day */}
              <tr className="bg-[#f8fafc] font-black border-t-2 border-[#3b82f6]">
                <td className="px-8 py-5 text-[13px] text-[#0f172a] border-r border-[#e2e8f0] uppercase tracking-wider">
                  Total {activeDay}
                </td>
                <td className="px-6 py-5 text-[15px] text-center text-[#0f172a] border-r border-[#e2e8f0]">
                  {selectedDayStats.fvc}
                </td>
                <td className="px-6 py-5 text-[15px] text-center text-[#0f172a] border-r border-[#e2e8f0]">
                  {selectedDayStats.van}
                </td>
                <td className="px-8 py-5 text-[16px] text-center text-white bg-[#3b82f6] shadow-inner">
                  {selectedDayStats.pct}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
