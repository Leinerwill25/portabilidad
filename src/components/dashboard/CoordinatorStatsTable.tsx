'use client'

import { useState, useEffect } from 'react'
import { 
  Building2, 
  ChevronDown, 
  ChevronRight, 
  PieChart, 
  AlertCircle 
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
      <div className="bg-white p-8 rounded-2xl border border-[#e2e8f0] shadow-sm animate-pulse">
        <div className="h-6 bg-slate-100 rounded w-1/4 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-slate-50 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.supervisors.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-[#e2e8f0] shadow-sm text-center">
        <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
        <h3 className="text-[16px] font-bold text-slate-900 mb-1">Sin asignaciones de supervisión</h3>
        <p className="text-[13px] text-slate-500 max-w-xs mx-auto">
          Asigna supervisores a tu cargo en el panel superior para visualizar el desglose detallado de ventas.
        </p>
      </div>
    )
  }

  const columns = [
    { label: 'SITE / VENDEDOR', key: 'name' },
    { label: 'ACTIVACION NO ALTA', key: 'activacion_no_alta' },
    { label: 'ALTA', key: 'alta' },
    { label: 'ALTA NO ENROLADA', key: 'alta_no_enrolada' },
    { label: 'SIN STATUS', key: 'sin_status' },
    { label: 'CHARGEBACK', key: 'chargeback' },
    { label: 'TOTAL GENER', key: 'total' },
    { label: 'CONV %', key: 'conv' },
  ]

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-xl overflow-hidden transition-all duration-500">
      <div className="px-6 py-5 border-b border-[#e2e8f0] flex items-center justify-between bg-gradient-to-r from-white to-[#f8fafc]">
        <h3 className="text-[16px] font-black text-[#1e293b] flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <PieChart size={18} />
          </div>
          Desglose de Gestión Jerárquica
        </h3>
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
          Actualización en tiempo real
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-[#1e293b] text-white">
              {columns.map((col, i) => (
                <th 
                  key={i} 
                  className={`px-4 py-3.5 text-[10px] sm:text-[11px] font-black uppercase tracking-widest ${i === 0 ? 'pl-6' : 'text-center'}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {data.supervisors.map((supervisor) => (
              <>
                {/* Supervisor Header Row */}
                <tr 
                  key={supervisor.id} 
                  className="bg-[#334155] text-white group cursor-pointer hover:bg-[#1e293b] transition-colors"
                  onClick={() => toggleExpand(supervisor.id)}
                >
                  <td className="px-6 py-3.5 flex items-center gap-3">
                    {expandedSupervisors[supervisor.id] ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                    <div className="p-1.5 bg-white/10 rounded-md group-hover:scale-110 transition-transform">
                      <Building2 size={14} className="text-blue-300" />
                    </div>
                    <span className="text-[13px] font-black tracking-tight uppercase">{supervisor.name}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center text-[12px] font-bold">{supervisor.totals.activacion_no_alta || '-'}</td>
                  <td className="px-4 py-3.5 text-center text-[12px] font-bold">{supervisor.totals.alta || '-'}</td>
                  <td className="px-4 py-3.5 text-center text-[12px] font-bold">{supervisor.totals.alta_no_enrolada || '-'}</td>
                  <td className="px-4 py-3.5 text-center text-[12px] font-bold">{supervisor.totals.sin_status || '-'}</td>
                  <td className="px-4 py-3.5 text-center text-[12px] font-bold text-red-300">{supervisor.totals.chargeback || '-'}</td>
                  <td className="px-4 py-3.5 text-center text-[12px] font-black">{supervisor.totals.total || '-'}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-black border ${
                      parseInt(supervisor.conv) >= 50 ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                    }`}>
                      {supervisor.conv}
                    </span>
                  </td>
                </tr>

                {/* Seller Rows */}
                {expandedSupervisors[supervisor.id] && supervisor.sellers.map((seller) => (
                  <tr key={seller.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="px-12 py-3 text-[12px] font-bold text-[#334155] border-r border-slate-50 italic">
                      {seller.name}
                    </td>
                    <td className="px-4 py-3 text-center text-[12px] text-slate-500">{seller.stats.activacion_no_alta || ''}</td>
                    <td className="px-4 py-3 text-center text-[12px] text-[#1e293b] font-medium">{seller.stats.alta || ''}</td>
                    <td className="px-4 py-3 text-center text-[12px] text-slate-400">{seller.stats.alta_no_enrolada || ''}</td>
                    <td className="px-4 py-3 text-center text-[12px] text-slate-400">{seller.stats.sin_status || ''}</td>
                    <td className="px-4 py-3 text-center text-[12px] text-red-500">{seller.stats.chargeback || ''}</td>
                    <td className="px-4 py-3 text-center text-[12px] font-bold text-[#1e293b]">{seller.stats.total || ''}</td>
                    <td className="px-4 py-3 text-center">
                      <div className={`w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1 max-w-[60px] mx-auto`}>
                        <div 
                          className={`h-full transition-all duration-1000 ${
                            parseInt(seller.conv) >= 60 ? 'bg-emerald-500' : parseInt(seller.conv) >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: seller.conv }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{seller.conv}</span>
                    </td>
                  </tr>
                ))}
              </>
            ))}

            {/* Grand Total Row */}
            <tr className="bg-[#f1f5f9] border-t-2 border-[#cbd5e1]">
              <td className="px-6 py-4 text-[11px] font-black text-[#1e293b] uppercase tracking-widest">Total General</td>
              <td className="px-4 py-4 text-center text-[13px] font-black text-[#1e293b]">{data.grandTotal.activacion_no_alta}</td>
              <td className="px-4 py-4 text-center text-[13px] font-black text-blue-700">{data.grandTotal.alta}</td>
              <td className="px-4 py-4 text-center text-[13px] font-black text-[#1e293b]">{data.grandTotal.alta_no_enrolada}</td>
              <td className="px-4 py-4 text-center text-[13px] font-black text-[#1e293b]">{data.grandTotal.sin_status}</td>
              <td className="px-4 py-4 text-center text-[13px] font-black text-red-600">{data.grandTotal.chargeback}</td>
              <td className="px-4 py-4 text-center text-[14px] font-black text-[#1e293b] bg-white border border-[#e2e8f0] rounded-lg shadow-sm">
                {data.grandTotal.total}
              </td>
              <td className="px-4 py-4 text-center">
                <span className="text-[13px] font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  {data.grandTotal.conv}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
