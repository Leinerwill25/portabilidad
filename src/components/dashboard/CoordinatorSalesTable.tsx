'use client'

import React, { useState, useEffect } from 'react'
import { 
  ChevronDown, 
  ChevronRight, 
  Users,
  RefreshCw,
  TrendingUp,
  Camera
} from 'lucide-react'
import { copyElementToClipboard } from '@/lib/utils/screenshot'

interface SellerStats {
  id: string
  name: string
  totalVentas: number
}

interface SupervisorStats {
  id: string
  name: string
  sellers: SellerStats[]
  totalVentas: number
}

interface SalesHierarchyData {
  supervisors: SupervisorStats[]
  grandTotal: number
  selectedMonth: string
  selectedWeek: string
  selectedDay: string
  filterOptions: {
    months: string[]
    weeks: string[]
    days: string[]
  }
}

export default function CoordinatorSalesTable({ supervisorId }: { supervisorId?: string }) {
  const [data, setData] = useState<SalesHierarchyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedSupervisors, setExpandedSupervisors] = useState<Record<string, boolean>>({})
  const [monthFilter, setMonthFilter] = useState('')
  const [weekFilter, setWeekFilter] = useState('')
  const [dayFilter, setDayFilter] = useState('')

  const fetchData = async (isManual: boolean = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      let url = '/api/admin/stats/sales-hierarchy?'
      if (monthFilter) url += `&month=${monthFilter}`
      if (weekFilter) url += `&week=${weekFilter}`
      if (dayFilter) url += `&day=${dayFilter}`
      if (supervisorId) url += `&supervisorId=${supervisorId}`
      if (isManual) url += `&force=true`

      const res = await fetch(url)
      const json = await res.json()
      setData(json)
      
      // Auto-expand on first load
      if (!isManual) {
        const expanded: Record<string, boolean> = {}
        json.supervisors?.forEach((s: SupervisorStats) => {
          expanded[s.id] = true
        })
        setExpandedSupervisors(expanded)
      }
    } catch (err) {
      console.error('Error fetching sales hierarchy stats:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [monthFilter, weekFilter, dayFilter])

  const toggleExpand = (id: string) => {
    setExpandedSupervisors(prev => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 animate-pulse">
        <div className="h-10 bg-slate-50 rounded w-full mb-4" />
        <div className="space-y-px">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 bg-slate-50" />
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.supervisors.length === 0) {
    return (
      <div className="bg-white p-16 rounded-xl border border-slate-200 text-center shadow-sm">
        <Users className="text-slate-200 mx-auto mb-4" size={40} />
        <h3 className="text-[16px] font-bold text-slate-800">Pendiente de Asignación</h3>
        <p className="text-[13px] text-slate-500 max-w-xs mx-auto mt-2">
          Asigne supervisores para visualizar el análisis de ventas.
        </p>
      </div>
    )
  }

  const formatNum = (n: number, isContrast: boolean = false) => {
     if (n === 0) return <span className={isContrast ? "text-blue-900 font-black" : "text-black font-bold"}>0</span>
     return <span className={isContrast ? "text-blue-900 font-black text-[18px]" : "text-black font-black text-[15px]"}>{n}</span>
  }

  return (
    <div className="space-y-6">
      {/* Informative Legend */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-[2rem] p-8 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm mb-4">
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-blue-200">
           <TrendingUp className="text-blue-600" size={24} />
        </div>
        <div className="flex-1">
           <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-tight mb-1">Total de Ventas Consolidadas</h4>
           <p className="text-[12px] text-slate-600 leading-relaxed max-w-3xl">
              Vista simplificada enfocada exclusivamente en el <strong>volumen de ventas ingresadas (Total de DN)</strong> por vendedor y supervisor. 
              <strong> Beneficio:</strong> Facilita visualizar rendimientos comerciales de forma rápida, filtrando por Día, Semana o Mes.
           </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-slate-900 shadow-2xl overflow-hidden mb-16" id="sales-table">
      {/* Navy Title Bar */}
      <div className="px-6 py-5 bg-[#0f172a] border-b-2 border-slate-900 flex items-center justify-between">
         <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="hidden sm:block w-1.5 h-6 bg-white rounded-full shadow-lg" />
            <h3 className="text-[15px] font-black text-white uppercase tracking-[0.1em]">Total de Ventas x Site</h3>
         </div>
          <div className="flex items-center gap-4 flex-wrap justify-end">
            
            {/* Month Filter */}
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-black text-blue-200 uppercase tracking-widest opacity-80">Mes</span>
              <select 
                value={monthFilter || data?.selectedMonth || ''}
                onChange={(e) => {
                  setMonthFilter(e.target.value)
                  setWeekFilter('')
                  setDayFilter('')
                }}
                className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-[11px] font-bold px-3 py-1.5 outline-none transition-all cursor-pointer"
              >
                <option value="" className="text-black">Mes Actual</option>
                {data?.filterOptions.months.map(m => (
                  <option key={m} value={m} className="text-black">{m}</option>
                ))}
              </select>
            </div>

            {/* Week Filter */}
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-black text-blue-200 uppercase tracking-widest opacity-80">Semana</span>
              <select 
                value={weekFilter || data?.selectedWeek || ''}
                onChange={(e) => {
                  setWeekFilter(e.target.value)
                  setDayFilter('')
                }}
                className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-[11px] font-bold px-3 py-1.5 outline-none transition-all cursor-pointer"
              >
                <option value="" className="text-black">Todas</option>
                {data?.filterOptions.weeks.map(w => (
                  <option key={w} value={w} className="text-black">Semana {w}</option>
                ))}
              </select>
            </div>

            {/* Day Filter */}
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-black text-blue-200 uppercase tracking-widest opacity-80">Día</span>
              <select 
                value={dayFilter || data?.selectedDay || ''}
                onChange={(e) => setDayFilter(e.target.value)}
                className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-[11px] font-bold px-3 py-1.5 outline-none transition-all cursor-pointer"
              >
                <option value="" className="text-black">Todos</option>
                {data?.filterOptions.days.map(d => (
                  <option key={d} value={d} className="text-black">{d}</option>
                ))}
              </select>
            </div>

            <div className="hidden sm:block w-[1px] h-8 bg-white/20 mx-2" />

            <div className="flex items-center gap-3 mt-4 sm:mt-0">
              <button 
                onClick={() => copyElementToClipboard('sales-table')}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all active:scale-90 border border-white/20 shadow-lg"
                title="Capturar Reporte"
              >
                <Camera size={18} />
              </button>

              <button 
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="flex items-center gap-2.5 px-5 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 rounded-full transition-all active:scale-95 group/btn"
              >
                <RefreshCw size={14} className={`text-white ${refreshing ? 'animate-spin' : 'group-hover/btn:rotate-180 transition-transform duration-500'}`} />
                <span className="text-[10px] font-black text-white uppercase tracking-widest hidden sm:inline">
                  {refreshing ? 'Actualizando...' : 'Actualizar'}
                </span>
              </button>
            </div>
          </div>
      </div>

      <div className="w-full">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-slate-50 text-black">
              <th className="border-r-2 border-slate-900 border-b-2 border-slate-900 px-4 py-4 text-[11px] font-black uppercase tracking-widest text-black pl-8 w-3/4">
                Site / Vendedor
              </th>
              <th className="border-b-2 border-slate-900 px-4 py-4 text-[11px] font-black uppercase tracking-widest text-black text-center w-1/4">
                Total Ventas
              </th>
            </tr>
          </thead>
          <tbody className="text-[13px]">
            {data.supervisors.map((supervisor) => (
              <React.Fragment key={supervisor.id}>
                {/* SKY BLUE SITE HEADER */}
                <tr 
                  className="group cursor-pointer hover:bg-sky-300 transition-all border-b-2 border-slate-900 bg-[#e0f2fe]"
                  onClick={() => toggleExpand(supervisor.id)}
                >
                  <td className="border-r-2 border-slate-900 px-8 py-4 flex items-center gap-4 relative bg-sky-200/50">
                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-blue-600" />
                    <div className="text-blue-900 shrink-0">
                      {expandedSupervisors[supervisor.id] ? <ChevronDown size={14} strokeWidth={4} /> : <ChevronRight size={14} strokeWidth={4} />}
                    </div>
                    <span className="text-[14px] font-black text-blue-900 uppercase tracking-tight">
                      SITE: {supervisor.name}
                    </span>
                  </td>
                  <td className="px-2 py-4 text-center font-black bg-sky-300/50 tabular-nums">
                     {formatNum(supervisor.totalVentas, true)}
                  </td>
                </tr>

                {/* Seller Detail Rows (White with Black Text) */}
                {expandedSupervisors[supervisor.id] && (
                  supervisor.sellers.length > 0 ? (
                    supervisor.sellers.map((seller) => (
                      <tr 
                        key={seller.id} 
                        className={`hover:bg-slate-100 transition-colors border-b-2 border-slate-900 bg-white`}
                      >
                        <td className="border-r-2 border-slate-900 pl-16 pr-4 py-3 text-[12px] text-black uppercase tracking-tight bg-black/5">
                          {seller.name}
                        </td>
                        <td className="px-2 py-3 text-center text-black font-black bg-black/5">
                          {formatNum(seller.totalVentas)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-b-2 border-slate-900">
                      <td colSpan={2} className="px-16 py-4 text-[11px] text-slate-400 font-bold italic">
                        Sin actividad registrada en este SITE
                      </td>
                    </tr>
                  )
                )}
              </React.Fragment>
            ))}

            {/* GRAND TOTAL - HIGH IMPACT NAVY */}
            <tr className="bg-[#0f172a] text-white border-t-4 border-slate-900">
              <td className="border-r-2 border-slate-800 px-8 py-4 text-[12px] font-black uppercase tracking-[0.2em] relative">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500" />
                TOTAL Ventas GLOBAL
              </td>
              <td className="px-2 py-4 text-center text-[26px] font-black tabular-nums bg-white/10 text-white border-l border-slate-800">
                {data.grandTotal ?? 0}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Premium Footer */}
      <div className="px-8 py-3.5 bg-[#0f172a] border-t-2 border-slate-900 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
        <div className="flex gap-8">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> 
            High Fidelity Analytics
          </span>
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> 
            Node Status: Operational
          </span>
        </div>
        <div className="flex items-center gap-3">
           <div className="h-1 w-1 bg-slate-700 rounded-full" />
           <span className="text-slate-500">v1.0.0 Global Sales</span>
        </div>
      </div>
    </div>
    </div>
  )
}
