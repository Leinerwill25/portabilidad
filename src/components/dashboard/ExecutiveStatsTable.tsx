'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, TrendingUp, Users, Calendar, RotateCw } from 'lucide-react'

interface SellerStat {
  name: string
  ventas: number
  fvc: number
  altas: number
  porcentajeAltas: string
  porcentajeRaw: number
}

interface DashboardStats {
  month: string
  sellers: SellerStat[]
  global: {
    ventas: number
    fvc: number
    altas: number
    porcentajeAltas: string
  }
}

export default function ExecutiveStatsTable() {
  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchStats = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true)
    else setLoading(true)
    
    try {
      // Usar timestamp para evitar cache del navegador
      const res = await fetch(`/api/dashboard/stats?t=${Date.now()}`)
      const stats = await res.json()
      setData(stats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

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
          No se detectaron registros para <span className="font-bold text-[#1a2744]">{data?.month}</span>.
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
    <div className="bg-white border border-[#1a2744] rounded-lg overflow-hidden shadow-lg mb-8">
      {/* Header matching image style */}
      <div className="bg-[#f97316] text-white py-2.5 px-4 flex items-center justify-between border-b border-[#1a2744]">
        <div className="w-10 sm:hidden" /> {/* Spacer for centering on mobile */}
        <span className="font-bold text-[14px] uppercase tracking-[0.2em] text-center flex-1">
          SEMANA {currentWeek} - {data.month}
        </span>
        <button 
          onClick={() => fetchStats(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white px-3 py-1 rounded-md transition-all disabled:opacity-50"
          title="Actualizar datos desde Google Sheets"
        >
          <RotateCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          <span className="text-[11px] font-bold uppercase hidden sm:inline">Actualizar</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1a2744] text-white">
              <th className="px-6 py-3 text-[12px] font-bold uppercase tracking-wider border-r border-white/10">Ejecutivo</th>
              <th className="px-6 py-3 text-[12px] font-bold uppercase tracking-wider text-center border-r border-white/10">Ventas</th>
              <th className="px-6 py-3 text-[12px] font-bold uppercase tracking-wider text-center border-r border-white/10">Fvc</th>
              <th className="px-6 py-3 text-[12px] font-bold uppercase tracking-wider text-center border-r border-white/10">Altas</th>
              <th className="px-6 py-3 text-[12px] font-bold uppercase tracking-wider text-center">% Altas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a2744]/10">
            {data.sellers.map((seller: SellerStat, idx: number) => (
              <tr key={idx} className="hover:bg-[#f8fafc] transition-colors">
                <td className="px-6 py-3 text-[13px] font-bold text-[#1a2744] border-r border-[#1a2744]/10">
                  {seller.name}
                </td>
                <td className="px-6 py-3 text-[13px] text-center font-semibold text-[#374151] border-r border-[#1a2744]/10">
                  {seller.ventas}
                </td>
                <td className="px-6 py-3 text-[13px] text-center font-semibold text-[#374151] border-r border-[#1a2744]/10">
                  {seller.fvc}
                </td>
                <td className="px-6 py-3 text-[13px] text-center font-semibold text-[#374151] border-r border-[#1a2744]/10">
                  {seller.altas}
                </td>
                <td className={`px-6 py-3 text-[13px] text-center font-black border-l border-[#1a2744]/10 ${
                  seller.porcentajeRaw >= 100 ? 'bg-[#bbf7d0] text-[#166534]' :
                  seller.porcentajeRaw >= 50 ? 'bg-[#fef08a] text-[#854d0e]' :
                  'bg-[#fecaca] text-[#991b1b]'
                }`}>
                  {seller.porcentajeAltas}
                </td>
              </tr>
            ))}
            {/* Footer Row (Carpe Diem) */}
            <tr className="bg-[#f97316]/10 font-bold border-t-2 border-[#1a2744]">
              <td className="px-6 py-3 text-[13px] text-[#1a2744] border-r border-[#1a2744]/10 uppercase tracking-tighter">
                Carpe Diem (TOTAL)
              </td>
              <td className="px-6 py-3 text-[13px] text-center text-[#1a2744] border-r border-[#1a2744]/10">
                {data.global.ventas}
              </td>
              <td className="px-6 py-3 text-[13px] text-center text-[#1a2744] border-r border-[#1a2744]/10">
                {data.global.fvc}
              </td>
              <td className="px-6 py-3 text-[13px] text-center text-[#1a2744] border-r border-[#1a2744]/10">
                {data.global.altas}
              </td>
              <td className="px-6 py-3 text-[13px] text-center text-[#1a2744] bg-[#f97316] text-white">
                {data.global.porcentajeAltas}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
