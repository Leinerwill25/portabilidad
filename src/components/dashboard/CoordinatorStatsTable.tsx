'use client'

import { useState, useEffect } from 'react'
import { 
  Building2, 
  ChevronDown, 
  ChevronRight, 
  PieChart, 
  AlertCircle,
  Users,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  XCircle
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
        // Expandir todos por defecto
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
      <div className="bg-white p-8 rounded-xl border border-slate-300 shadow-xl animate-pulse">
        <div className="h-8 bg-slate-100 rounded w-1/3 mb-8" />
        <div className="space-y-1">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-10 bg-slate-50 border border-slate-200" />
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.supervisors.length === 0) {
    return (
      <div className="bg-white p-20 rounded-xl border border-slate-300 shadow-2xl text-center">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-200">
          <Users className="text-slate-200" size={40} />
        </div>
        <h3 className="text-[20px] font-black text-slate-900 mb-3 tracking-tight">PLATAFORMA DE COORDINACIÓN DN</h3>
        <p className="text-[15px] text-slate-500 max-w-md mx-auto leading-relaxed">
          No se detectaron asignaciones activas. Por favor, gestione los supervisores bajo su cargo en el panel superior para generar el reporte ejecutivo.
        </p>
      </div>
    )
  }

  const columns = [
    { label: 'SITE / VENDEDOR', key: 'name', width: 'min-w-[320px]' },
    { label: 'ACT. NO ALTA', key: 'activacion_no_alta' },
    { label: 'ALTA', key: 'alta' },
    { label: 'ALTA NO ENROL.', key: 'alta_no_enrolada' },
    { label: 'SIN STATUS', key: 'sin_status' },
    { label: 'CHARGEBACK', key: 'chargeback' },
    { label: 'TOTAL GENERAL', key: 'total' },
    { label: 'RENDIMIENTO %', key: 'conv' },
  ]

  return (
    <div className="bg-[#f8fafc] p-6 lg:p-8 rounded-3xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)] mb-12">
      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-2">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-gradient-to-br from-[#1e293b] to-[#334155] rounded-2xl flex items-center justify-center text-white shadow-[0_10px_20px_rgba(30,41,59,0.3)]">
            <BarChart3 size={28} />
          </div>
          <div>
            <h2 className="text-[22px] font-black text-[#1e293b] tracking-tighter leading-none mb-2">
              REPORTE EJECUTIVO DE PERFORMANCE
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Consolidado Corporativo</span>
              <div className="w-1 h-1 bg-slate-300 rounded-full" />
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Actualizado hace instantes</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm flex flex-col justify-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Portabilidades Totales</span>
            <span className="text-[18px] font-black text-[#1e293b] tabular-nums">{data.grandTotal.total}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm flex flex-col justify-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Eficiencia Global</span>
            <span className="text-[18px] font-black text-blue-600 tabular-nums">{data.grandTotal.conv}</span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border-2 border-[#1e293b] shadow-2xl bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[1250px]">
            <thead>
              <tr className="bg-[#1e293b] text-white">
                {columns.map((col, i) => (
                  <th 
                    key={i} 
                    className={`border-r border-slate-700 px-5 py-5 text-[11px] font-black uppercase tracking-widest leading-none ${i === 0 ? 'pl-8 ' + col.width : 'text-center w-[130px]'}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[14px] font-medium text-[#334155]">
              {data.supervisors.map((supervisor) => (
                <>
                  {/* SITE / Supervisor Header Row */}
                  <tr 
                    key={supervisor.id} 
                    className="bg-[#f1f5f9] group cursor-pointer hover:bg-[#e2e8f0] transition-colors border-b-2 border-slate-300"
                    onClick={() => toggleExpand(supervisor.id)}
                  >
                    <td className="border-r border-slate-300 px-6 py-5 flex items-center gap-4 relative">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-700" />
                      <div className="text-slate-400 group-hover:text-blue-600 transition-colors">
                        {expandedSupervisors[supervisor.id] ? <ChevronDown size={16} strokeWidth={3} /> : <ChevronRight size={16} strokeWidth={3} />}
                      </div>
                      <span className="text-[15px] font-black text-[#1e293b] tracking-tighter uppercase whitespace-nowrap">
                        SITE: {supervisor.name}
                      </span>
                    </td>
                    <td className="border-r border-slate-300 px-4 py-5 text-center font-black tabular-nums">{supervisor.totals.activacion_no_alta || '-'}</td>
                    <td className="border-r border-slate-300 px-4 py-5 text-center font-black tabular-nums text-blue-700 bg-blue-50/30">{supervisor.totals.alta || '-'}</td>
                    <td className="border-r border-slate-300 px-4 py-5 text-center font-black tabular-nums">{supervisor.totals.alta_no_enrolada || '-'}</td>
                    <td className="border-r border-slate-300 px-4 py-5 text-center font-black tabular-nums">{supervisor.totals.sin_status || '-'}</td>
                    <td className="border-r border-slate-300 px-4 py-5 text-center font-black tabular-nums text-red-600 bg-red-50/30">{supervisor.totals.chargeback || '-'}</td>
                    <td className="border-r border-slate-300 px-4 py-5 text-center font-black tabular-nums text-[#1e293b] bg-slate-200/50">{supervisor.totals.total || '-'}</td>
                    <td className="px-4 py-5 text-center">
                      <div className="inline-flex items-center gap-2 bg-[#1e293b] text-white px-3 py-1.5 rounded-lg text-[13px] font-black tabular-nums shadow-sm">
                        {supervisor.conv}
                      </div>
                    </td>
                  </tr>

                  {/* Seller Detail Rows */}
                  {expandedSupervisors[supervisor.id] && (
                    supervisor.sellers.length > 0 ? (
                      supervisor.sellers.map((seller, idx) => (
                        <tr 
                          key={seller.id} 
                          className={`hover:bg-slate-50 transition-colors border-b border-slate-200 group ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                        >
                          <td className="border-r border-slate-200 pl-16 pr-6 py-4 relative">
                             <div className="absolute left-10 top-0 bottom-0 w-px bg-slate-200" />
                             <div className="absolute left-10 top-1/2 w-4 h-px bg-slate-200" />
                             <span className="text-[13px] font-bold text-slate-500 uppercase tracking-tight group-hover:text-[#1e293b] transition-colors italic">
                               {seller.name}
                             </span>
                          </td>
                          <td className="border-r border-slate-200 px-4 py-4 text-center tabular-nums text-slate-400 font-bold">{seller.stats.activacion_no_alta || ''}</td>
                          <td className="border-r border-slate-200 px-4 py-4 text-center tabular-nums text-blue-600 font-extrabold">{seller.stats.alta || ''}</td>
                          <td className="border-r border-slate-200 px-4 py-4 text-center tabular-nums text-slate-400">{seller.stats.alta_no_enrolada || ''}</td>
                          <td className="border-r border-slate-200 px-4 py-4 text-center tabular-nums text-slate-400">{seller.stats.sin_status || ''}</td>
                          <td className="border-r border-slate-200 px-4 py-4 text-center tabular-nums text-red-500 font-bold">{seller.stats.chargeback || ''}</td>
                          <td className="border-r border-slate-200 px-4 py-4 text-center tabular-nums font-black text-[#334155]">{seller.stats.total || ''}</td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="text-[12px] font-black text-slate-700 tabular-nums leading-none">{seller.conv}</span>
                              <div className="w-20 h-2 bg-slate-100 rounded-full border border-slate-200 overflow-hidden shadow-inner">
                                <div 
                                  className={`h-full transition-all duration-1000 ease-out ${
                                    parseInt(seller.conv) >= 60 ? 'bg-[#059669]' : parseInt(seller.conv) >= 40 ? 'bg-[#d97706]' : 'bg-[#dc2626]'
                                  }`}
                                  style={{ width: seller.conv }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-b border-slate-200">
                        <td colSpan={8} className="px-12 py-5 text-[13px] text-slate-400 font-bold italic text-center bg-slate-50/20">
                          Sin vendedores activos vinculados a este Site Corporativo
                        </td>
                      </tr>
                    )
                  )}
                </>
              ))}

              {/* GRAND TOTAL - EXECUTIVE SUMMARY ROW */}
              <tr className="bg-[#0f172a] text-white border-t-4 border-[#1e293b]">
                <td className="border-r border-slate-700 px-8 py-7 text-[15px] font-black uppercase tracking-[0.1em] relative">
                   <div className="absolute left-0 top-0 bottom-0 w-2 bg-blue-500 shadow-[2px_0_10px_rgba(59,130,246,0.5)]" />
                   Consolidado Final
                </td>
                <td className="border-r border-slate-700 px-4 py-7 text-center text-[18px] font-black tabular-nums">{data.grandTotal.activacion_no_alta}</td>
                <td className="border-r border-slate-700 px-4 py-7 text-center text-[18px] font-black tabular-nums text-blue-400">{data.grandTotal.alta}</td>
                <td className="border-r border-slate-700 px-4 py-7 text-center text-[18px] font-black tabular-nums font-medium text-slate-400">{data.grandTotal.alta_no_enrolada}</td>
                <td className="border-r border-slate-700 px-4 py-7 text-center text-[18px] font-black tabular-nums font-medium text-slate-400">{data.grandTotal.sin_status}</td>
                <td className="border-r border-slate-700 px-4 py-7 text-center text-[18px] font-black tabular-nums text-red-400">{data.grandTotal.chargeback}</td>
                <td className="border-r border-slate-700 px-4 py-7 text-center text-[22px] font-black tabular-nums bg-white/10 ring-1 ring-inset ring-white/20">
                  {data.grandTotal.total}
                </td>
                <td className="px-4 py-7 text-center bg-white/5">
                  <div className="flex flex-col items-center">
                    <span className="text-[20px] font-black text-blue-300 tabular-nums leading-none tracking-tighter">{data.grandTotal.conv}</span>
                    <span className="text-[8px] font-black text-blue-400/50 uppercase tracking-[0.2em] mt-2">Efficiency Rating</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Corporate Metadata Footer */}
      <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
           <div className="flex items-center gap-3">
             <div className="w-3 h-3 rounded bg-blue-500" />
             <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Altas Confirmadas</span>
           </div>
           <div className="flex items-center gap-3">
             <div className="w-3 h-3 rounded bg-red-500" />
             <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Penalizaciones</span>
           </div>
           <div className="flex items-center gap-3">
             <div className="w-3 h-3 rounded bg-slate-300" />
             <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">En Proceso</span>
           </div>
           <div className="flex items-center gap-3 underline decoration-blue-500/30 underline-offset-4">
             <CheckCircle2 size={14} className="text-emerald-500" />
             <span className="text-[11px] font-black text-[#1e293b] uppercase tracking-widest">Información Auditada</span>
           </div>
        </div>
        <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
          DN Portabilidad - Sistema de Alta Gerencia
        </div>
      </div>
    </div>
  )
}
