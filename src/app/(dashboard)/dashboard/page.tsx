import { createClient } from '@/lib/supabase/server'
import { Users, FileSpreadsheet, Search as SearchIcon, Clock, ArrowUpRight, Check } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch metrics
  const [
    { count: sellersCount },
    { count: sheetsCount },
    { data: recentSearches },
    { count: todaySearchesCount }
  ] = await Promise.all([
    supabase.from('sellers').select('*', { count: 'exact', head: true }),
    supabase.from('seller_sheets').select('*', { count: 'exact', head: true }),
    supabase.from('dn_searches').select('*').order('searched_at', { ascending: false }).limit(10),
    supabase.from('dn_searches')
      .select('*', { count: 'exact', head: true })
      .gte('searched_at', new Date(new Date().setHours(0,0,0,0)).toISOString())
  ])

  const stats = [
    { label: 'Vendedores Totales', value: sellersCount || 0, icon: Users, color: 'blue' },
    { label: 'Sheets Registrados', value: sheetsCount || 0, icon: FileSpreadsheet, color: 'green' },
    { label: 'Búsquedas Hoy', value: todaySearchesCount || 0, icon: SearchIcon, color: 'violet' },
  ]

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#1a2744] mb-1">Dashboard Administrativo</h1>
          <p className="text-[13px] text-[#6b7280]">Gestión institucional de la red de portabilidad</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-white border border-[#e5e7eb] rounded-lg shadow-sm">
          <div className="h-2 w-2 rounded-full bg-[#166534] animate-pulse" />
          <span className="text-[12px] font-semibold text-[#374151] uppercase tracking-wider">Sistema Operativo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <div 
            key={i}
            className="bg-white border border-[#e5e7eb] p-5 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col gap-3 group hover:border-[#bfdbfe] transition-colors"
          >
            <div className="h-9 w-9 bg-[#eff6ff] rounded-md flex items-center justify-center text-[#1a56db]">
              <stat.icon size={18} />
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#6b7280]">{stat.label}</p>
              <h3 className="text-2xl font-bold text-[#1a2744] tracking-tight">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e5e7eb] flex items-center justify-between bg-white">
          <h3 className="text-[15px] font-bold text-[#1a2744] flex items-center gap-2">
            <Clock className="text-[#3b82f6]" size={16} />
            Búsquedas Recientes
          </h3>
          <Link href="/search" className="text-[13px] text-[#1a56db] font-bold hover:underline flex items-center gap-1 group">
            Ejecutar nueva consulta
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e5e7eb]">
                <th className="px-6 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-widest">Código DN</th>
                <th className="px-6 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-widest">Estado</th>
                <th className="px-6 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-widest">Fecha y Hora</th>
                <th className="px-6 py-3 text-[11px] font-bold text-[#6b7280] uppercase tracking-widest text-right">Origen IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb]">
              {recentSearches?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[#9ca3af] text-[13px]">
                    No se registran actividades de búsqueda recientes en el sistema.
                  </td>
                </tr>
              ) : (
                recentSearches?.map((s) => (
                  <tr key={s.id} className="hover:bg-[#f1f5f9] transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-[#1a2744] font-bold font-mono tracking-tight">{s.dn_code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        s.results?.length > 0 
                          ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]' 
                          : 'bg-[#f9fafb] text-[#374151] border-[#e5e7eb]'
                      }`}>
                        {s.results?.length > 0 ? (
                          <><Check size={10} /> {s.results.length} Hallazgos</>
                        ) : 'Sin registros'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-[#4b5563]">
                      {new Date(s.searched_at).toLocaleString('es-VE', { 
                        day: '2-digit', month: '2-digit', year: 'numeric', 
                        hour: '2-digit', minute: '2-digit' 
                      })}
                    </td>
                    <td className="px-6 py-4 text-[12px] text-[#6b7280] text-right font-mono">
                      {s.ip_address}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
