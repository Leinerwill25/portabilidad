'use client'

import React, { useState, useEffect } from 'react'
import { 
  TrendingDown, 
  RefreshCw, 
  AlertCircle, 
  Search,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Camera
} from 'lucide-react'
import { copyElementToClipboard } from '@/lib/utils/screenshot'

interface SellerStats {
  id: string
  name: string
  stats: {
    ingresada: number
    rechazo: number
    total: number
  }
  pct: string
}

interface SupervisorStats {
  id: string
  name: string
  sellers: SellerStats[]
  totals: {
    ingresada: number
    rechazo: number
    total: number
  }
  pct: string
}

interface GrandTotal {
  ingresada: number
  rechazo: number
  total: number
  pct: string
}

interface RejectionData {
  supervisors: SupervisorStats[]
  grandTotal: GrandTotal
  selectedMonth: string
  selectedWeek: string
  filterOptions: {
    months: string[]
    weeks: string[]
  }
}

export default function RejectionStatsTable() {
  const [data, setData] = useState<RejectionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedSupervisors, setExpandedSupervisors] = useState<Record<string, boolean>>({})
  const [monthFilter, setMonthFilter] = useState('')
  const [weekFilter, setWeekFilter] = useState('')

  const fetchData = async (isManual: boolean = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      let url = '/api/admin/stats/rejections?'
      if (monthFilter) url += `&month=${monthFilter}`
      if (weekFilter) url += `&week=${weekFilter}`

      const res = await fetch(url)
      const json = await res.json()
      setData(json)
      
      if (!isManual) {
        const expanded: Record<string, boolean> = {}
        json.supervisors?.forEach((s: SupervisorStats) => {
          expanded[s.id] = true
        })
        setExpandedSupervisors(expanded)
      }
    } catch (err) {
      console.error('Error fetching rejection stats:', err)
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

  const formatNum = (n: number, isContrast: boolean = false) => {
    if (n === 0) return <span className={isContrast ? "text-blue-900 font-black" : "text-black font-bold"}>0</span>
    return <span className={isContrast ? "text-blue-900 font-black" : "text-black font-bold"}>{n}</span>
  }

  const getRejectionBar = (pctStr: string) => {
    const val = parseInt(pctStr.replace('%', ''))
    if (isNaN(val)) return null
    return (
      <div className="flex items-center gap-3 justify-end pr-4">
        <span className="text-[11px] font-black tabular-nums w-8 text-right">{pctStr}</span>
        <div className="w-24 h-5 bg-slate-100 rounded-sm overflow-hidden border border-slate-200">
          <div 
            className="h-full bg-red-500/80 transition-all duration-1000"
            style={{ width: `${Math.min(val, 100)}%` }}
          />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 animate-pulse mb-8">
        <div className="h-10 bg-slate-50 rounded w-full mb-4" />
        <div className="space-y-px">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 bg-slate-50" />
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.supervisors.length === 0) {
    return (
      <div className="bg-white p-16 rounded-xl border border-slate-200 text-center shadow-sm">
        <AlertCircle className="text-slate-200 mx-auto mb-4" size={40} />
        <h3 className="text-[16px] font-bold text-slate-800">Sin Datos Disponibles</h3>
        <p className="text-[13px] text-slate-500 max-w-xs mx-auto mt-2">
          No hay registros de rechazos para los filtros seleccionados.
        </p>
      </div>
    )
  }

  const columns = [
    { label: 'Site / Vendedor', weight: 'w-[25%]' },
    { label: 'INGRESADA', weight: 'w-[15%]' },
    { label: 'RECHAZO', weight: 'w-[15%]' },
    { label: 'TOTAL GENERAL', weight: 'w-[15%]' },
    { label: '% RECHAZOS', weight: 'w-[30%]' },
  ]

  return (
    <div className="space-y-6">
      {/* Informative Legend */}
      <div className="bg-rose-50/50 border border-rose-100 rounded-[2rem] p-8 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm mb-4">
        <div className="p-4 bg-white rounded-2xl shadow-sm border border-rose-200">
           <AlertCircle className="text-rose-600" size={24} />
        </div>
        <div className="flex-1">
           <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-tight mb-1">Guía de Análisis de Rechazos</h4>
           <p className="text-[12px] text-slate-600 leading-relaxed max-w-3xl">
              Este panel identifica las fallas críticas en las solicitudes de portabilidad. 
              Muestra la relación entre ventas totales y aquellas devueltas como **Rechazo**. 
              <strong> Beneficio:</strong> Permite detectar patrones de error recurrentes y focalizar la capacitación en los vendedores o sites con mayor índice de devoluciones, mejorando la eficiencia operativa.
           </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-slate-900 shadow-2xl overflow-hidden mb-16">
      {/* Navy Title Bar */}
      <div className="px-6 py-5 bg-[#0f172a] border-b-2 border-slate-900 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
              <AlertCircle className="text-white" size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[15px] font-black text-white uppercase tracking-[0.1em]">Dashboard de Rechazos y Recuperación</h3>
              <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest opacity-80 mt-0.5">Control de Calidad & Merma</p>
            </div>
         </div>
         <div className="flex items-center gap-4">
            {/* Month Filter */}
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-black text-blue-200 uppercase tracking-widest opacity-80 text-right">Mes</span>
              <select 
                value={monthFilter || data?.selectedMonth || ''}
                onChange={(e) => {
                  setMonthFilter(e.target.value)
                  setWeekFilter('')
                }}
                className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-[11px] font-bold px-3 py-1.5 outline-none transition-all cursor-pointer shadow-inner"
              >
                <option value="" className="text-black">Mes Actual</option>
                {data?.filterOptions.months.map(m => (
                  <option key={m} value={m} className="text-black">{m}</option>
                ))}
              </select>
            </div>

            {/* Week Filter */}
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-black text-blue-200 uppercase tracking-widest opacity-80 text-right">Semana</span>
              <select 
                value={weekFilter || data?.selectedWeek || ''}
                onChange={(e) => setWeekFilter(e.target.value)}
                className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-[11px] font-bold px-3 py-1.5 outline-none transition-all cursor-pointer shadow-inner"
              >
                <option value="" className="text-black">Todas</option>
                {data?.filterOptions.weeks.map(w => (
                  <option key={w} value={w} className="text-black">Semana {w}</option>
                ))}
              </select>
            </div>

            <div className="w-[1px] h-8 bg-white/20 mx-2 hidden sm:block" />

            {/* Screenshot Button */}
            <button 
              onClick={() => copyElementToClipboard('rejections-table')}
              className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-full transition-all active:scale-95 shadow-lg shadow-sky-500/20 group/btn border-b-4 border-sky-700"
              title="Capturar Tabla"
            >
              <Camera size={14} className="group-hover/btn:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Capturar</span>
            </button>

            <button 
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex items-center gap-2.5 px-5 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 rounded-full transition-all active:scale-95 group/btn shadow-inner"
            >
              <RefreshCw size={14} className={`text-white ${refreshing ? 'animate-spin' : 'group-hover/btn:rotate-180 transition-transform duration-500'}`} />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">
                {refreshing ? 'Actualizando...' : 'Actualizar'}
              </span>
            </button>
         </div>
      </div>

      <div className="w-full" id="rejections-table">
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
                  <td className="border-r-2 border-slate-900 px-2 py-4 text-center font-black text-blue-900">{formatNum(supervisor.totals.ingresada, true)}</td>
                  <td className="border-r-2 border-slate-900 px-2 py-4 text-center font-black text-red-700">{formatNum(supervisor.totals.rechazo, true)}</td>
                  <td className="border-r-2 border-slate-900 px-2 py-4 text-center font-black bg-sky-300/50 tabular-nums text-blue-900">
                     {formatNum(supervisor.totals.total, true)}
                  </td>
                  <td className="px-4 py-4 text-center bg-sky-100/30">
                     {getRejectionBar(supervisor.pct)}
                  </td>
                </tr>

                {/* Seller Detail Rows */}
                {expandedSupervisors[supervisor.id] && (
                  supervisor.sellers.length > 0 ? (
                    supervisor.sellers.map((seller) => (
                      <tr 
                        key={seller.id} 
                        className="hover:bg-slate-50 transition-colors border-b-2 border-slate-900 bg-white"
                      >
                        <td className="border-r-2 border-slate-900 pl-16 pr-4 py-3 text-[12px] text-black uppercase tracking-tight bg-black/5">
                          {seller.name}
                        </td>
                        <td className="border-r-2 border-slate-900 px-2 py-3 text-center text-black font-bold">{formatNum(seller.stats.ingresada)}</td>
                        <td className="border-r-2 border-slate-900 px-2 py-3 text-center text-red-600 font-black">{formatNum(seller.stats.rechazo)}</td>
                        <td className="border-r-2 border-slate-900 px-2 py-3 text-center text-black font-black bg-black/5">{formatNum(seller.stats.total)}</td>
                        <td className="px-4 py-3 text-center bg-slate-50/30">
                          {getRejectionBar(seller.pct)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-b-2 border-slate-900 font-bold">
                       <td colSpan={5} className="px-16 py-4 text-[11px] text-slate-400 italic">Sin rechazos registrados</td>
                    </tr>
                  )
                )}
              </React.Fragment>
            ))}

            {/* GRAND TOTAL */}
            <tr className="bg-[#0f172a] text-white border-t-4 border-slate-900">
              <td className="border-r-2 border-slate-800 px-8 py-3 text-[12px] font-black uppercase tracking-[0.2em] relative">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500" />
                CONSOLIDADO GLOBAL
              </td>
              <td className="border-r-2 border-slate-800 px-2 py-3 text-center text-[16px] font-black tabular-nums">{data.grandTotal.ingresada}</td>
              <td className="border-r-2 border-slate-800 px-2 py-3 text-center text-[16px] font-black tabular-nums text-red-400">{data.grandTotal.rechazo}</td>
              <td className="border-r-2 border-slate-800 px-2 py-3 text-center text-[22px] font-black tabular-nums bg-white/10 text-white">
                {data.grandTotal.total}
              </td>
              <td className="px-6 py-3 text-center bg-white/5 border-l border-slate-800">
                 {getRejectionBar(data.grandTotal.pct)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Premium Footer */}
      <div className="px-8 py-3.5 bg-[#0f172a] border-t-2 border-slate-900 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
        <div className="flex gap-8">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" /> 
            Rejection Protocol Active
          </span>
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" /> 
            Recovery Sync: Enabled
          </span>
        </div>
        <div className="flex items-center gap-3">
           <div className="h-1 w-1 bg-slate-700 rounded-full" />
           <span className="text-slate-500">v1.1.0 Rejections Analytics</span>
        </div>
      </div>
    </div>
    </div>
  )
}
