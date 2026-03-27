'use client'

import React, { useState, useEffect } from 'react'
import { 
  ChevronDown, 
  ChevronRight, 
  Users,
  RefreshCw,
  BarChart3
} from 'lucide-react'

interface SellerStats {
  id: string
  name: string
  stats: {
    activacion_no_alta: number
    alta: number
    alta_no_enrolada: number
    sin_status: number
    chargeback: number
    total: number
  }
  conv: string
}

interface SupervisorStats {
  id: string
  name: string
  sellers: SellerStats[]
  totals: {
    activacion_no_alta: number
    alta: number
    alta_no_enrolada: number
    sin_status: number
    chargeback: number
    total: number
  }
  conv: string
}

interface GrandTotal {
  activacion_no_alta: number
  alta: number
  alta_no_enrolada: number
  sin_status: number
  chargeback: number
  total: number
  conv: string
}

interface HierarchyData {
  supervisors: SupervisorStats[]
  grandTotal: GrandTotal
  selectedMonth: string
  selectedWeek: string
  filterOptions: {
    months: string[]
    weeks: string[]
  }
}

export default function CoordinatorStatsTable() {
  const [data, setData] = useState<HierarchyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedSupervisors, setExpandedSupervisors] = useState<Record<string, boolean>>({})
  const [monthFilter, setMonthFilter] = useState('')
  const [weekFilter, setWeekFilter] = useState('')

  const fetchData = async (isManual: boolean = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      let url = '/api/admin/stats/hierarchy?'
      if (monthFilter) url += `&month=${monthFilter}`
      if (weekFilter) url += `&week=${weekFilter}`

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
      console.error('Error fetching hierarchy stats:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [monthFilter, weekFilter])

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
          Asigne supervisores para visualizar el análisis de red.
        </p>
      </div>
    )
  }

  const columns = [
    { label: 'Site / Vendedor', key: 'name', weight: 'w-[25%]' },
    { label: 'ACT. NO ALTA', key: 'ana', weight: 'w-[10%]' },
    { label: 'ALTA', key: 'alta', weight: 'w-[10%]' },
    { label: 'NO ENROLADO', key: 'ne', weight: 'w-[10%]' },
    { label: 'SIN ESTATUS', key: 'pend', weight: 'w-[10%]' },
    { label: 'CHBACK', key: 'cb', weight: 'w-[10%]' },
    { label: 'TOTAL', key: 'total', weight: 'w-[10%]' },
    { label: 'CONVERSION', key: 'conv', weight: 'w-[15%]' },
  ]

  const getEfficacyStyle = (convStr: string) => {
    const val = parseInt(convStr.replace('%', ''))
    if (isNaN(val)) return 'bg-slate-100 text-slate-400'
    if (val <= 55) return 'bg-[#fee2e2] text-red-700'
    if (val <= 60) return 'bg-[#fef9c3] text-yellow-700'
    return 'bg-[#d1fae5] text-emerald-700'
  }

  const formatNum = (n: number, isContrast: boolean = false) => {
     if (n === 0) return <span className={isContrast ? "text-blue-900 font-black" : "text-black font-bold"}>0</span>
     return <span className={isContrast ? "text-blue-900 font-black" : "text-black font-bold"}>{n}</span>
  }

  return (
    <div className="space-y-6">
      {/* Informative Legend */}
      <div className="bg-amber-50/50 border border-amber-100 rounded-[2rem] p-8 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm mb-4">
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-amber-200">
           <BarChart3 className="text-amber-600" size={24} />
        </div>
        <div className="flex-1">
           <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-tight mb-1">Guía de Estadísticas Ejecutivas</h4>
           <p className="text-[12px] text-slate-600 leading-relaxed max-w-3xl">
              Análisis profundo de la **calidad de carga** y resultados mensuales/semanales. 
              Visualiza el desglose completo desde ventas ingresadas hasta **Altas** efectivas y **Chargebacks** (bajas). 
              <strong> Beneficio:</strong> Permite detectar desviaciones críticas en el proceso de enrolamiento y asegurar el cumplimiento de metas por Site.
           </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-slate-900 shadow-2xl overflow-hidden mb-16">
      {/* Amber Title Bar */}
      <div className="px-6 py-5 bg-[#d97706] border-b-2 border-slate-900 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="w-1.5 h-6 bg-white rounded-full shadow-lg" />
            <h3 className="text-[15px] font-black text-white uppercase tracking-[0.1em]">Dashboard Gerencial Site Analytics</h3>
         </div>
          <div className="flex items-center gap-4">
            {/* Month Filter */}
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-black text-amber-100 uppercase tracking-widest opacity-80">Mes</span>
              <select 
                value={monthFilter || data?.selectedMonth || ''}
                onChange={(e) => {
                  setMonthFilter(e.target.value)
                  setWeekFilter('')
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
              <span className="text-[8px] font-black text-amber-100 uppercase tracking-widest opacity-80">Semana</span>
              <select 
                value={weekFilter || data?.selectedWeek || ''}
                onChange={(e) => setWeekFilter(e.target.value)}
                className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-[11px] font-bold px-3 py-1.5 outline-none transition-all cursor-pointer"
              >
                <option value="" className="text-black">Todas</option>
                {data?.filterOptions.weeks.map(w => (
                  <option key={w} value={w} className="text-black">Semana {w}</option>
                ))}
              </select>
            </div>

            <div className="w-[1px] h-8 bg-white/20 mx-2" />

            <button 
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex items-center gap-2.5 px-5 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 rounded-full transition-all active:scale-95 group/btn"
            >
              <RefreshCw size={14} className={`text-white ${refreshing ? 'animate-spin' : 'group-hover/btn:rotate-180 transition-transform duration-500'}`} />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">
                {refreshing ? 'Actualizando...' : 'Actualizar'}
              </span>
            </button>
          </div>
      </div>

      <div className="w-full">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-slate-50 text-black">
              {columns.map((col, i) => (
                <th 
                  key={i} 
                  className={`border-r-2 border-slate-900 border-b-2 border-slate-900 px-4 py-4 text-[11px] font-black uppercase tracking-widest text-black ${col.weight} ${i > 0 ? 'text-center' : 'pl-8'}`}
                >
                  {col.label}
                </th>
              ))}
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
                    <div className="text-blue-900">
                      {expandedSupervisors[supervisor.id] ? <ChevronDown size={14} strokeWidth={4} /> : <ChevronRight size={14} strokeWidth={4} />}
                    </div>
                    <span className="text-[14px] font-black text-blue-900 uppercase tracking-tight">
                      SITE: {supervisor.name}
                    </span>
                  </td>
                  <td className="border-r-2 border-slate-900 px-2 py-4 text-center font-black text-blue-900">{formatNum(supervisor.totals.activacion_no_alta, true)}</td>
                  <td className="border-r-2 border-slate-900 px-2 py-4 text-center font-black text-blue-900">{formatNum(supervisor.totals.alta, true)}</td>
                  <td className="border-r-2 border-slate-900 px-2 py-4 text-center font-black text-blue-900">{formatNum(supervisor.totals.alta_no_enrolada, true)}</td>
                  <td className="border-r-2 border-slate-900 px-2 py-4 text-center font-black text-blue-900">{formatNum(supervisor.totals.sin_status, true)}</td>
                  <td className="border-r-2 border-slate-900 px-2 py-4 text-center font-black text-red-700">{formatNum(supervisor.totals.chargeback, true)}</td>
                  <td className="border-r-2 border-slate-900 px-2 py-4 text-center font-black bg-sky-300/50 tabular-nums">
                     {formatNum(supervisor.totals.total, true)}
                  </td>
                  <td className="px-4 py-4 text-center bg-sky-100/30">
                     <span className={`text-[12px] font-black shadow-sm px-3 py-1.5 rounded-lg border border-black/5 ${getEfficacyStyle(supervisor.conv)}`}>
                       {supervisor.conv}
                     </span>
                  </td>
                </tr>

                {/* Seller Detail Rows (White with Black Text) */}
                {expandedSupervisors[supervisor.id] && (
                  supervisor.sellers.length > 0 ? (
                    supervisor.sellers.map((seller, idx) => (
                      <tr 
                        key={seller.id} 
                        className={`hover:bg-slate-100 transition-colors border-b-2 border-slate-900 bg-white`}
                      >
                        <td className="border-r-2 border-slate-900 pl-16 pr-4 py-3 text-[12px] text-black uppercase tracking-tight bg-black/5">
                          {seller.name}
                        </td>
                        <td className="border-r-2 border-slate-900 px-2 py-3 text-center text-black font-bold">{formatNum(seller.stats.activacion_no_alta)}</td>
                        <td className="border-r-2 border-slate-900 px-2 py-3 text-center text-black font-bold">{formatNum(seller.stats.alta)}</td>
                        <td className="border-r-2 border-slate-900 px-2 py-3 text-center text-black font-bold">{formatNum(seller.stats.alta_no_enrolada)}</td>
                        <td className="border-r-2 border-slate-900 px-2 py-3 text-center text-black font-bold">{formatNum(seller.stats.sin_status)}</td>
                        <td className="border-r-2 border-slate-900 px-2 py-3 text-center text-red-600 font-black">{formatNum(seller.stats.chargeback)}</td>
                        <td className="border-r-2 border-slate-900 px-2 py-3 text-center text-black font-black bg-black/5">{formatNum(seller.stats.total)}</td>
                        <td className="px-4 py-3 text-center bg-slate-50/30">
                          <span className={`text-[11px] font-black px-2 py-0.5 rounded border border-black/5 ${getEfficacyStyle(seller.conv)}`}>
                            {seller.conv}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-b-2 border-slate-900">
                      <td colSpan={8} className="px-16 py-4 text-[11px] text-slate-400 font-bold italic">
                        Sin actividad registrada en este SITE
                      </td>
                    </tr>
                  )
                )}
              </React.Fragment>
            ))}

            {/* GRAND TOTAL - HIGH IMPACT NAVY */}
            <tr className="bg-[#0f172a] text-white border-t-4 border-slate-900">
              <td className="border-r-2 border-slate-800 px-8 py-3 text-[12px] font-black uppercase tracking-[0.2em] relative">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500" />
                CONSOLIDADO GLOBAL
              </td>
              <td className="border-r-2 border-slate-800 px-2 py-3 text-center text-[16px] font-black tabular-nums">{data.grandTotal.activacion_no_alta ?? 0}</td>
              <td className="border-r-2 border-slate-800 px-2 py-3 text-center text-[16px] font-black tabular-nums">{data.grandTotal.alta ?? 0}</td>
              <td className="border-r-2 border-slate-800 px-2 py-3 text-center text-[16px] font-black tabular-nums">{data.grandTotal.alta_no_enrolada ?? 0}</td>
              <td className="border-r-2 border-slate-800 px-2 py-3 text-center text-[16px] font-black tabular-nums">{data.grandTotal.sin_status ?? 0}</td>
              <td className="border-r-2 border-slate-800 px-2 py-3 text-center text-[16px] font-black tabular-nums text-red-400">{data.grandTotal.chargeback ?? 0}</td>
              <td className="border-r-2 border-slate-800 px-2 py-3 text-center text-[22px] font-black tabular-nums bg-white/10 text-white">
                {data.grandTotal.total ?? 0}
              </td>
              <td className="px-6 py-3 text-center bg-white/5 border-l border-slate-800">
                 <div className="flex flex-col items-center">
                    <span className={`text-[18px] font-black px-3 py-0.5 rounded-lg shadow-inner ${getEfficacyStyle(data.grandTotal.conv)}`}>
                      {data.grandTotal.conv}
                    </span>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Conversion</span>
                 </div>
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
           <span className="text-slate-500">v2.5.0 Production Ready</span>
        </div>
      </div>
    </div>
    </div>
  )
}
