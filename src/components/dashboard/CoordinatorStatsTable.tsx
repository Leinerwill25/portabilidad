'use client'

import { useState, useEffect } from 'react'
import { 
  ChevronDown, 
  ChevronRight, 
  Users
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

export default function CoordinatorStatsTable() {
  const [data, setData] = useState<{ supervisors: SupervisorStats[], grandTotal: any } | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSupervisors, setExpandedSupervisors] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/admin/stats/hierarchy')
        const json = await res.json()
        setData(json)
        const expanded: Record<string, boolean> = {}
        json.supervisors?.forEach((s: SupervisorStats) => {
          expanded[s.id] = true
        })
        setExpandedSupervisors(expanded)
      } catch (err) {
        console.error('Error fetching hierarchy stats:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

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
    { label: 'NO ENROL', key: 'ne', weight: 'w-[10%]' },
    { label: 'PENDIENTE', key: 'pend', weight: 'w-[10%]' },
    { label: 'CHBACK', key: 'cb', weight: 'w-[10%]' },
    { label: 'TOTAL', key: 'total', weight: 'w-[10%]' },
    { label: 'EFICACIA', key: 'conv', weight: 'w-[15%]' },
  ]

  const formatNum = (n: number, isContrast: boolean = false) => {
     if (n === 0) return <span className="text-slate-300 font-medium">0</span>
     return <span className={isContrast ? "text-blue-900 font-black" : "text-slate-900 font-bold"}>{n}</span>
  }

  return (
    <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden mb-16">
      {/* Mini Title */}
      <div className="px-6 py-4 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-1 h-4 bg-blue-500 rounded-full" />
            <h3 className="text-[14px] font-black text-white uppercase tracking-wider">Dashboard Gerencial Site Analytics</h3>
         </div>
         <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded border border-white/10">
            Real-Time Feed
         </span>
      </div>

      <div className="w-full">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-slate-50">
              {columns.map((col, i) => (
                <th 
                  key={i} 
                  className={`border-r border-slate-200 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 ${col.weight} ${i > 0 ? 'text-center' : 'pl-6'}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-[12px]">
            {data.supervisors.map((supervisor) => (
              <>
                {/* COMPACT SITE HEADER (MUTED LIGHT BLUE HARMONY) */}
                <tr 
                  key={supervisor.id} 
                  className="group cursor-pointer hover:bg-blue-100 transition-colors border-b border-slate-200 bg-[#f0f7ff]"
                  onClick={() => toggleExpand(supervisor.id)}
                >
                  <td className="border-r border-slate-200 px-6 py-3 flex items-center gap-3 relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                    <div className="text-blue-400 group-hover:text-blue-600">
                      {expandedSupervisors[supervisor.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </div>
                    <span className="text-[13px] font-black text-blue-900 uppercase tracking-tight">
                      SITE: {supervisor.name}
                    </span>
                  </td>
                  <td className="border-r border-slate-200 px-2 py-3 text-center">{formatNum(supervisor.totals.activacion_no_alta, true)}</td>
                  <td className="border-r border-slate-200 px-2 py-3 text-center bg-blue-200/20">{formatNum(supervisor.totals.alta, true)}</td>
                  <td className="border-r border-slate-200 px-2 py-3 text-center">{formatNum(supervisor.totals.alta_no_enrolada, true)}</td>
                  <td className="border-r border-slate-200 px-2 py-3 text-center">{formatNum(supervisor.totals.sin_status, true)}</td>
                  <td className="border-r border-slate-200 px-2 py-3 text-center bg-red-100/30">{formatNum(supervisor.totals.chargeback, true)}</td>
                  <td className="border-r border-slate-200 px-2 py-3 text-center font-black bg-blue-100/40 text-blue-950">{formatNum(supervisor.totals.total, true)}</td>
                  <td className="px-4 py-3 text-center">
                     <span className="text-[11px] font-black text-white bg-blue-700 px-2 py-0.5 rounded shadow-sm">
                       {supervisor.conv}
                     </span>
                  </td>
                </tr>

                {/* Seller Detail Rows (Compact) */}
                {expandedSupervisors[supervisor.id] && (
                  supervisor.sellers.length > 0 ? (
                    supervisor.sellers.map((seller, idx) => (
                      <tr 
                        key={seller.id} 
                        className={`hover:bg-slate-50 transition-colors border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}
                      >
                        <td className="border-r border-slate-200 pl-12 pr-4 py-2 text-[11px] text-slate-500 font-bold uppercase tracking-tight">
                          {seller.name}
                        </td>
                        <td className="border-r border-slate-100 px-2 py-2 text-center text-slate-400">{formatNum(seller.stats.activacion_no_alta)}</td>
                        <td className="border-r border-slate-100 px-2 py-2 text-center font-black text-blue-600/60">{formatNum(seller.stats.alta)}</td>
                        <td className="border-r border-slate-100 px-2 py-2 text-center text-slate-400">{formatNum(seller.stats.alta_no_enrolada)}</td>
                        <td className="border-r border-slate-100 px-2 py-2 text-center text-slate-400">{formatNum(seller.stats.sin_status)}</td>
                        <td className="border-r border-slate-100 px-2 py-2 text-center font-black text-red-500/60">{formatNum(seller.stats.chargeback)}</td>
                        <td className="border-r border-slate-200 px-2 py-2 text-center text-slate-700 bg-slate-50/10">{formatNum(seller.stats.total)}</td>
                        <td className="px-4 py-2 text-center">
                          <span className="text-[10px] font-black text-slate-300">{seller.conv}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-b border-slate-100">
                      <td colSpan={8} className="px-12 py-3 text-[11px] text-slate-300 italic">
                        Sin actividad en este SITE
                      </td>
                    </tr>
                  )
                )}
              </>
            ))}

            {/* GRAND CONSOLIDATED TOTAL */}
            <tr className="bg-[#0f172a] text-white shadow-2xl">
              <td className="border-r border-slate-800 px-6 py-4 text-[12px] font-black uppercase tracking-widest">
                Consolidado Global
              </td>
              <td className="border-r border-slate-800 px-2 py-4 text-center text-[14px] font-black tabular-nums">{data.grandTotal.activacion_no_alta ?? 0}</td>
              <td className="border-r border-slate-800 px-2 py-4 text-center text-[14px] font-black tabular-nums text-blue-400">{data.grandTotal.alta ?? 0}</td>
              <td className="border-r border-slate-800 px-2 py-4 text-center text-[14px] font-black tabular-nums">{data.grandTotal.alta_no_enrolada ?? 0}</td>
              <td className="border-r border-slate-800 px-2 py-4 text-center text-[14px] font-black tabular-nums">{data.grandTotal.sin_status ?? 0}</td>
              <td className="border-r border-slate-800 px-2 py-4 text-center text-[14px] font-black tabular-nums text-red-400">{data.grandTotal.chargeback ?? 0}</td>
              <td className="border-r border-slate-800 px-2 py-4 text-center text-[16px] font-black tabular-nums bg-white/10 ring-1 ring-inset ring-white/10">
                {data.grandTotal.total ?? 0}
              </td>
              <td className="px-4 py-4 text-center">
                 <div className="flex flex-col items-center">
                    <span className="text-[16px] font-black text-emerald-400 leading-none">{data.grandTotal.conv}</span>
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mt-1">Efficiency Index</span>
                 </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Disclaimer / Meta */}
      <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Éxito</span>
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Riesgo</span>
        </div>
        <div>Control DN Analytics v2.1.0</div>
      </div>
    </div>
  )
}
