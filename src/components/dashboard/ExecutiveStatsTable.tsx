'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Calendar, RotateCw } from 'lucide-react'

interface SellerStat {
  name: string
  ventas: number
  fvc: number
  altas: number
  porcentajeAltas: string
  porcentajeRaw: number
}

interface DashboardStats {
  selectedMonth: string
  selectedWeek: string
  filterOptions: {
    months: string[]
    weeks: string[]
  }
  sellers: SellerStat[]
  global: {
    ventas: number
    fvc: number
    altas: number
    porcentajeAltas: string
  }
}

export default function ExecutiveStatsTable({ supervisorId }: { supervisorId?: string }) {
  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [monthFilter, setMonthFilter] = useState<string>('')
  const [weekFilter, setWeekFilter] = useState<string>('')

  const fetchStats = useCallback(async (isManual = false) => {
    if (isManual) {
      console.log('[ExecutiveStatsTable] Manual refresh triggered')
      setIsRefreshing(true)
    } else {
      setLoading(true)
    }
    
    try {
      const ts = Date.now()
      let url = `/api/dashboard/stats?t=${ts}`
      if (monthFilter) url += `&month=${monthFilter}`
      if (weekFilter) url += `&week=${weekFilter}`
      if (supervisorId) url += `&supervisorId=${supervisorId}`

      console.log(`[ExecutiveStatsTable] Fetching stats from ${url}`)
      const res = await fetch(url)
      const stats = await res.json()
      setData(stats)
    } catch (error) {
      console.error('[ExecutiveStatsTable] Error fetching stats:', error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [monthFilter, weekFilter])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
// ... loading state ...
    return (
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 flex flex-col items-center justify-center gap-3 shadow-sm">
        <Loader2 className="animate-spin text-[#1a56db]" size={32} />
        <p className="text-[13px] font-bold text-[#64748b] uppercase tracking-widest">Sincronizando métricas ejecutivas...</p>
      </div>
    )
  }

  if (!data || data.sellers.length === 0) {
    return (
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 flex flex-col items-center justify-center gap-3 shadow-sm mb-8 border-dashed">
        <Calendar className="text-[#94a3b8]" size={32} />
        <p className="text-[13px] font-medium text-[#64748b]">
          No se detectaron registros para <span className="font-bold text-[#1a2744]">{data?.selectedMonth || 'el periodo seleccionado'}</span>.
        </p>
        <p className="text-[11px] text-[#94a3b8] max-w-xs text-center">
          Verifica que tus hojas de Google Sheets tengan la columna <span className="font-mono bg-slate-100 px-1 rounded">MES</span> con el valor correcto en mayúsculas.
        </p>
      </div>
    )
  }

  // Calcular la semana del año
  const getWeekNumber = (d: Date) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    return weekNo
  }
  const currentWeek = getWeekNumber(new Date())

  return (
    <div className="bg-white border border-[#334155] rounded-xl overflow-hidden shadow-2xl mb-12 border-t-4 border-t-[#1e293b]">
      {/* Premium Corporate Header */}
      <div className="bg-[#f8fafc] border-b border-[#e2e8f0] py-4 px-6 flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-6 w-full lg:w-auto">
          {/* Filtro Mes */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black text-[#64748b] uppercase tracking-tighter">Periodo Mensual</span>
            <select 
              value={monthFilter || data.selectedMonth}
              onChange={(e) => {
                setMonthFilter(e.target.value)
                setWeekFilter('')
              }}
              className="bg-white border border-[#cbd5e1] text-[#1e293b] text-[13px] font-bold rounded-lg px-4 py-2 outline-none hover:border-[#3b82f6] transition-all cursor-pointer shadow-sm appearance-none min-w-[140px]"
            >
              <option value="" className="text-black">Mes Actual</option>
              {data.filterOptions.months.map(m => (
                <option key={m} value={m} className="text-black">{m}</option>
              ))}
            </select>
          </div>

          <div className="h-10 w-[1px] bg-[#e2e8f0] hidden lg:block" />

          {/* Filtro Semana */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black text-[#64748b] uppercase tracking-tighter">Corte Semanal</span>
            <select 
              value={weekFilter}
              onChange={(e) => setWeekFilter(e.target.value)}
              className="bg-white border border-[#cbd5e1] text-[#1e293b] text-[13px] font-bold rounded-lg px-4 py-2 outline-none hover:border-[#3b82f6] transition-all cursor-pointer shadow-sm appearance-none min-w-[140px]"
            >
              <option value="" className="text-black">Consolidado</option>
              {data.filterOptions.weeks.map(w => (
                <option key={w} value={w} className="text-black">Semana {w}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-6 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-[#e2e8f0]">
          <div className="text-right">
            <p className="text-[11px] font-bold text-[#64748b] uppercase tracking-[0.05em] mb-0.5">Vista Activa</p>
            <h2 className="text-[16px] font-black text-[#0f172a] uppercase leading-tight">
              {weekFilter ? `Semana ${weekFilter}` : data.selectedMonth}
            </h2>
          </div>
          <button 
            onClick={() => fetchStats(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2.5 bg-[#1e293b] hover:bg-[#0f172a] active:scale-95 text-white px-5 py-2.5 rounded-lg transition-all disabled:opacity-50 shadow-md group border border-[#1e293b]"
          >
            <RotateCw size={16} className={`${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
            <span className="text-[12px] font-black uppercase tracking-wider">Sincronizar</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1e293b] text-white">
              <th className="px-8 py-5 text-[12px] font-black uppercase tracking-[0.1em] border-r border-white/5">Ejecutivo de Cuenta</th>
              <th className="px-6 py-5 text-[12px] font-black uppercase tracking-[0.1em] text-center border-r border-white/5">Meta Ventas</th>
              <th className="px-6 py-5 text-[12px] font-black uppercase tracking-[0.1em] text-center border-r border-white/5">Fvc Bruto</th>
              <th className="px-6 py-5 text-[12px] font-black uppercase tracking-[0.1em] text-center border-r border-white/5">Altas Netas</th>
              <th className="px-8 py-5 text-[12px] font-black uppercase tracking-[0.1em] text-center">Cumplimiento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {data.sellers.map((seller: SellerStat, idx: number) => (
              <tr key={idx} className="hover:bg-[#f8fafc] transition-colors group">
                <td className="px-8 py-4.5 text-[14px] font-bold text-[#1e293b] border-r border-[#f1f5f9]">
                  {seller.name}
                </td>
                <td className="px-6 py-4.5 text-[14px] text-center font-medium text-[#475569] border-r border-[#f1f5f9]">
                  {seller.ventas}
                </td>
                <td className="px-6 py-4.5 text-[14px] text-center font-medium text-[#475569] border-r border-[#f1f5f9]">
                  {seller.fvc}
                </td>
                <td className="px-6 py-4.5 text-[14px] text-center font-medium text-[#475569] border-r border-[#f1f5f9]">
                  {seller.altas}
                </td>
                <td className="px-0 py-0 text-center border-l border-[#f1f5f9]">
                  <div className={`h-full w-full px-8 py-4.5 text-[14px] font-black ${
                    seller.porcentajeRaw >= 100 ? 'bg-emerald-50 text-emerald-700' :
                    seller.porcentajeRaw >= 50 ? 'bg-amber-50 text-amber-700' :
                    'bg-rose-50 text-rose-700'
                  }`}>
                    {seller.porcentajeAltas}
                  </div>
                </td>
              </tr>
            ))}
            {/* Elegant Master Total Row */}
            <tr className="bg-[#f8fafc] font-black border-t-2 border-[#1e293b]">
              <td className="px-8 py-6 text-[14px] text-[#0f172a] border-r border-[#e2e8f0] uppercase tracking-wider">
                Consolidado Carpe Diem
              </td>
              <td className="px-6 py-6 text-[15px] text-center text-[#0f172a] border-r border-[#e2e8f0]">
                {data.global.ventas}
              </td>
              <td className="px-6 py-6 text-[15px] text-center text-[#0f172a] border-r border-[#e2e8f0]">
                {data.global.fvc}
              </td>
              <td className="px-6 py-6 text-[15px] text-center text-[#0f172a] border-r border-[#e2e8f0]">
                {data.global.altas}
              </td>
              <td className="px-8 py-6 text-[16px] text-center text-white bg-[#1e293b] shadow-inner">
                {data.global.porcentajeAltas}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
